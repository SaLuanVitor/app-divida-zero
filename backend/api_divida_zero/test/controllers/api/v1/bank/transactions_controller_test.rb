require "test_helper"

class Api::V1::Bank::TransactionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Review Test",
      email: "review_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  def create_txn(attrs = {})
    @user.imported_transactions.create!(
      {
        import_batch_id: SecureRandom.uuid,
        description: "Supermercado",
        amount: 100.0,
        date: Date.new(2026, 7, 10),
        source: "csv_upload",
        status: "pending"
      }.merge(attrs)
    )
  end

  test "pending returns groups by date" do
    create_txn(date: Date.new(2026, 7, 10), description: "A")
    create_txn(date: Date.new(2026, 7, 10), description: "B", status: "duplicate", duplicate_reason: "exact_match")
    create_txn(date: Date.new(2026, 7, 12), description: "C")

    get "/api/v1/bank/transactions/pending", headers: auth_header
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 3, body["total"]
    assert_equal 2, body["groups"].size
    dates = body["groups"].map { |g| g["date"] }
    assert_equal "2026-07-12", dates[0]
    assert_equal "2026-07-10", dates[1]
  end

  test "pending ignores accepted and rejected" do
    create_txn(description: "Pendente")
    create_txn(description: "Aceita", status: "accepted")
    create_txn(description: "Rejeitada", status: "rejected")

    get "/api/v1/bank/transactions/pending", headers: auth_header
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 1, body["total"]
  end

  test "accept creates financial records and marks accepted" do
    txn = create_txn

    assert_difference "FinancialRecord.count", 1 do
      post "/api/v1/bank/transactions/accept",
           params: { transaction_ids: [ txn.id ] },
           headers: auth_header
    end

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 1, body["accepted"]
    assert_equal "accepted", txn.reload.status
    assert txn.reload.financial_record_id.present?
  end

  test "accept requires transaction_ids" do
    post "/api/v1/bank/transactions/accept", params: {}, headers: auth_header
    assert_response :unprocessable_entity
  end

  test "accept ignores invalid ids" do
    create_txn(status: "accepted")

    post "/api/v1/bank/transactions/accept",
         params: { transaction_ids: [ 999_999 ] },
         headers: auth_header

    assert_response :not_found
  end

  test "accept awards gamification points" do
    txn = create_txn

    assert_difference "GamificationEvent.count", 1 do
      post "/api/v1/bank/transactions/accept",
           params: { transaction_ids: [ txn.id ] },
           headers: auth_header
    end

    assert_response :ok
  end

  test "reject marks transactions rejected" do
    txn = create_txn

    post "/api/v1/bank/transactions/reject",
         params: { transaction_ids: [ txn.id ] },
         headers: auth_header

    assert_response :ok
    assert_equal "rejected", txn.reload.status
    assert_equal 1, JSON.parse(response.body)["rejected"]
  end

  test "merge links duplicate to existing financial record" do
    txn = create_txn(status: "duplicate", duplicate_reason: "exact_match")
    record = @user.financial_records.create!(
      title: "Existente", record_type: "launch", flow_type: "expense",
      amount: 100.0, status: "pending", due_date: Date.new(2026, 7, 10),
      recurring: false, recurrence_type: "none", recurrence_count: 1,
      installments_total: 1, installment_number: 1, priority: "normal"
    )

    post "/api/v1/bank/transactions/#{txn.id}/merge",
         params: { financial_record_id: record.id },
         headers: auth_header

    assert_response :ok
    assert_equal "accepted", txn.reload.status
    assert_equal record.id, txn.reload.duplicate_of_id
    assert_equal record.id, txn.reload.financial_record_id
  end

  test "endpoints require access token" do
    get "/api/v1/bank/transactions/pending"
    assert_response :unauthorized

    post "/api/v1/bank/transactions/accept", params: { transaction_ids: [ 1 ] }
    assert_response :unauthorized

    post "/api/v1/bank/transactions/reject", params: { transaction_ids: [ 1 ] }
    assert_response :unauthorized

    post "/api/v1/bank/transactions/1/merge", params: { financial_record_id: 1 }
    assert_response :unauthorized
  end

  private

  def auth_header
    { "Authorization" => "Bearer #{@tokens[:access_token]}" }
  end
end
