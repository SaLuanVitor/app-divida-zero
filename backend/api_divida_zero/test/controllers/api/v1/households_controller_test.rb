require "test_helper"

class Api::V1::HouseholdsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @owner = User.create!(
      name: "Dono da Familia",
      email: "dono_familia_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @member = User.create!(
      name: "Membro da Familia",
      email: "membro_familia_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @outsider = User.create!(
      name: "Fora da Familia",
      email: "fora_familia_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @owner_tokens = JsonWebToken.issue_pair(user_id: @owner.id)
    @member_tokens = JsonWebToken.issue_pair(user_id: @member.id)
    @outsider_tokens = JsonWebToken.issue_pair(user_id: @outsider.id)
  end

  # ── Household CRUD ───────────────────────────────────────

  test "create household and become owner" do
    assert_difference ["Household.count", "HouseholdMembership.count"], 1 do
      post "/api/v1/household",
           params: { household: { name: "Minha Familia" } },
           headers: auth_header(@owner_tokens[:access_token])
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Minha Familia", body["name"]
    assert body["invite_code"].present?
    assert_equal 1, body["members"].size
    assert_equal "owner", body["members"][0]["role"]
    assert_equal @owner.id, body["owner_id"]
  end

  test "create household fails when user already has one" do
    household = Household.create!(name: "Existente")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)

    post "/api/v1/household",
         params: { household: { name: "Outra" } },
         headers: auth_header(@owner_tokens[:access_token])

    assert_response :conflict
    assert_match(/já pertence/, JSON.parse(response.body)["error"])
  end

  test "create household requires name" do
    post "/api/v1/household",
         params: { household: { name: "" } },
         headers: auth_header(@owner_tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "show household returns household with members" do
    household = create_household_with_members

    get "/api/v1/household", headers: auth_header(@owner_tokens[:access_token])
    assert_response :ok

    body = JSON.parse(response.body)
    assert_equal household.name, body["name"]
    assert_equal 2, body["members"].size
  end

  test "show household returns nil when user has no household" do
    get "/api/v1/household", headers: auth_header(@outsider_tokens[:access_token])
    assert_response :ok

    body = JSON.parse(response.body)
    assert_nil body["household"]
  end

  test "update household name only by owner" do
    household = create_household_with_members

    patch "/api/v1/household",
          params: { household: { name: "Familia Atualizada" } },
          headers: auth_header(@owner_tokens[:access_token])

    assert_response :ok
    assert_equal "Familia Atualizada", JSON.parse(response.body)["name"]
  end

  test "update household name forbidden for member" do
    household = create_household_with_members

    patch "/api/v1/household",
          params: { household: { name: "Hackeado" } },
          headers: auth_header(@member_tokens[:access_token])

    assert_response :forbidden
  end

  test "destroy household when owner and no other members" do
    household = Household.create!(name: "So eu")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)

    assert_difference "Household.count", -1 do
      delete "/api/v1/household", headers: auth_header(@owner_tokens[:access_token])
    end

    assert_response :ok
  end

  test "destroy household blocked when owner has other members" do
    household = create_household_with_members

    assert_no_difference "Household.count" do
      delete "/api/v1/household", headers: auth_header(@owner_tokens[:access_token])
    end

    assert_response :conflict
  end

  test "member leaves household without destroying it" do
    household = create_household_with_members

    assert_difference "HouseholdMembership.count", -1 do
      delete "/api/v1/household", headers: auth_header(@member_tokens[:access_token])
    end

    assert_response :ok
    assert Household.exists?(household.id)
  end

  # ── Invitations ──────────────────────────────────────────

  test "owner invites member by email" do
    household = Household.create!(name: "Convida")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)

    assert_difference "HouseholdInvitation.count", 1 do
      post "/api/v1/household/invitations",
           params: { email: "convidado@test.com" },
           headers: auth_header(@owner_tokens[:access_token])
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "convidado@test.com", body["invitation"]["email"]
    assert_equal "pending", body["invitation"]["status"]
  end

  test "invitation requires valid email" do
    household = Household.create!(name: "Convida")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)

    post "/api/v1/household/invitations",
         params: { email: "invalido" },
         headers: auth_header(@owner_tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "invitation forbidden for member" do
    household = create_household_with_members

    post "/api/v1/household/invitations",
         params: { email: "alguem@test.com" },
         headers: auth_header(@member_tokens[:access_token])

    assert_response :forbidden
  end

  test "list pending invitations for household" do
    household = Household.create!(name: "Lista Convites")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    household.household_invitations.create!(email: "a@test.com", invited_by: @owner)
    household.household_invitations.create!(email: "b@test.com", invited_by: @owner)

    get "/api/v1/household/invitations", headers: auth_header(@owner_tokens[:access_token])
    assert_response :ok

    body = JSON.parse(response.body)
    assert_equal 2, body["invitations"].size
  end

  test "owner cancels pending invitation" do
    household = Household.create!(name: "Cancela")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    invitation = household.household_invitations.create!(email: "alvo@test.com", invited_by: @owner)

    delete "/api/v1/household/invitations/#{invitation.id}",
           headers: auth_header(@owner_tokens[:access_token])

    assert_response :ok
    assert_equal "expired", invitation.reload.status
  end

  test "cancel invitation forbidden for member" do
    household = create_household_with_members
    invitation = household.household_invitations.create!(email: "alvo@test.com", invited_by: @owner)

    delete "/api/v1/household/invitations/#{invitation.id}",
           headers: auth_header(@member_tokens[:access_token])

    assert_response :forbidden
  end

  test "non-member cannot access household invitations" do
    get "/api/v1/household/invitations", headers: auth_header(@outsider_tokens[:access_token])
    assert_response :not_found
  end

  # ── Pending Invitations (as recipient) ────────────────────

  test "pending invitations lists invites for current user email" do
    household = Household.create!(name: "Convida Voce")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    household.household_invitations.create!(email: @outsider.email, invited_by: @owner)

    get "/api/v1/invitations/pending", headers: auth_header(@outsider_tokens[:access_token])
    assert_response :ok

    body = JSON.parse(response.body)
    assert_equal 1, body["invitations"].size
    assert_equal "Convida Voce", body["invitations"][0]["household_name"]
  end

  test "accept invitation creates membership" do
    household = Household.create!(name: "Entre Aqui")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    invitation = household.household_invitations.create!(email: @outsider.email, invited_by: @owner)

    assert_difference "HouseholdMembership.count", 1 do
      post "/api/v1/invitations/#{invitation.token}/accept",
           headers: auth_header(@outsider_tokens[:access_token])
    end

    assert_response :ok
    assert_equal "accepted", invitation.reload.status
    assert @outsider.households.exists?(household.id)
  end

  test "accept invitation fails for wrong email" do
    household = Household.create!(name: "Nao Entre")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    invitation = household.household_invitations.create!(email: "outro@test.com", invited_by: @owner)

    post "/api/v1/invitations/#{invitation.token}/accept",
         headers: auth_header(@outsider_tokens[:access_token])

    assert_response :forbidden
  end

  test "accept invitation fails if already member" do
    household = Household.create!(name: "Ja Sou Membro")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    household.household_memberships.create!(user: @member, role: "member", joined_at: Time.current)
    invitation = household.household_invitations.create!(email: @member.email, invited_by: @owner)

    post "/api/v1/invitations/#{invitation.token}/accept",
         headers: auth_header(@member_tokens[:access_token])

    assert_response :conflict
  end

  test "decline invitation updates status" do
    household = Household.create!(name: "Recusei")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    invitation = household.household_invitations.create!(email: @outsider.email, invited_by: @owner)

    post "/api/v1/invitations/#{invitation.token}/decline",
         headers: auth_header(@outsider_tokens[:access_token])

    assert_response :ok
    assert_equal "declined", invitation.reload.status
  end

  test "decline invitation fails for wrong email" do
    household = Household.create!(name: "Nao Recuse")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    invitation = household.household_invitations.create!(email: "outro@test.com", invited_by: @owner)

    post "/api/v1/invitations/#{invitation.token}/decline",
         headers: auth_header(@outsider_tokens[:access_token])

    assert_response :forbidden
  end

  # ── Authorization: Owner vs Member ───────────────────────

  test "owner sees all records from household via scoped_records" do
    household = create_household_with_members
    @owner.financial_records.create!(
      title: "Record do Dono", record_type: "launch", flow_type: "expense",
      amount: 100, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal",
      household: household
    )
    @member.financial_records.create!(
      title: "Record do Membro", record_type: "launch", flow_type: "expense",
      amount: 200, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal",
      household: household
    )

    get "/api/v1/financial_records",
        params: { year: Date.current.year, month: Date.current.month },
        headers: auth_header(@owner_tokens[:access_token])

    assert_response :ok
    records = JSON.parse(response.body)["records"]
    titles = records.map { |r| r["title"] }
    assert_includes titles, "Record do Dono"
    assert_includes titles, "Record do Membro"
  end

  test "member sees all records from household via scoped_records" do
    household = create_household_with_members
    @owner.financial_records.create!(
      title: "Record do Dono", record_type: "launch", flow_type: "expense",
      amount: 100, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal",
      household: household
    )
    @member.financial_records.create!(
      title: "Record do Membro", record_type: "launch", flow_type: "expense",
      amount: 200, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal",
      household: household
    )

    get "/api/v1/financial_records",
        params: { year: Date.current.year, month: Date.current.month },
        headers: auth_header(@member_tokens[:access_token])

    assert_response :ok
    records = JSON.parse(response.body)["records"]
    titles = records.map { |r| r["title"] }
    assert_includes titles, "Record do Dono"
    assert_includes titles, "Record do Membro"
  end

  test "outsider without household sees only own records" do
    household = create_household_with_members
    @outsider.financial_records.create!(
      title: "So Meu", record_type: "launch", flow_type: "expense",
      amount: 100, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal"
    )
    @owner.financial_records.create!(
      title: "Do Dono", record_type: "launch", flow_type: "expense",
      amount: 200, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal",
      household: household
    )

    get "/api/v1/financial_records",
        params: { year: Date.current.year, month: Date.current.month },
        headers: auth_header(@outsider_tokens[:access_token])

    assert_response :ok
    records = JSON.parse(response.body)["records"]
    titles = records.map { |r| r["title"] }
    assert_includes titles, "So Meu"
    refute_includes titles, "Do Dono"
  end

  test "user_name is included in serialized records" do
    @owner.financial_records.create!(
      title: "Com nome", record_type: "launch", flow_type: "expense",
      amount: 100, status: "pending", due_date: Date.current,
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal"
    )

    get "/api/v1/financial_records",
        params: { year: Date.current.year, month: Date.current.month },
        headers: auth_header(@owner_tokens[:access_token])

    assert_response :ok
    record = JSON.parse(response.body)["records"].find { |r| r["title"] == "Com nome" }
    assert_equal @owner.name, record["user_name"]
  end

  # ── Auth Guard ────────────────────────────────────────────

  test "household endpoints require access token" do
    get "/api/v1/household"
    assert_response :unauthorized

    post "/api/v1/household", params: { household: { name: "X" } }
    assert_response :unauthorized

    patch "/api/v1/household", params: { household: { name: "X" } }
    assert_response :unauthorized

    delete "/api/v1/household"
    assert_response :unauthorized
  end

  test "invitation endpoints require access token" do
    get "/api/v1/household/invitations"
    assert_response :unauthorized

    post "/api/v1/household/invitations", params: { email: "x@y.com" }
    assert_response :unauthorized

    get "/api/v1/invitations/pending"
    assert_response :unauthorized

    post "/api/v1/invitations/token/accept"
    assert_response :unauthorized

    post "/api/v1/invitations/token/decline"
    assert_response :unauthorized
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end

  def create_household_with_members
    household = Household.create!(name: "Familia Teste")
    household.household_memberships.create!(user: @owner, role: "owner", joined_at: Time.current)
    household.household_memberships.create!(user: @member, role: "member", joined_at: Time.current)
    household
  end
end
