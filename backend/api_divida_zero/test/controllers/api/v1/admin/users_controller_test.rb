require "test_helper"

class Api::V1::Admin::UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      name: "Admin Principal",
      email: "admin_users_test",
      password: "senha1234",
      password_confirmation: "senha1234",
      role: "admin"
    )
    @other_admin = User.create!(
      name: "Outro Admin",
      email: "admin_users_test_2",
      password: "senha1234",
      password_confirmation: "senha1234",
      role: "admin"
    )
    @user = User.create!(
      name: "Usuario Comum",
      email: "usuario_users_test",
      password: "senha1234",
      password_confirmation: "senha1234"
    )

    @admin_token = JsonWebToken.issue_pair(user_id: @admin.id)[:access_token]
    @user_token = JsonWebToken.issue_pair(user_id: @user.id)[:access_token]
  end

  test "index lists users for admin" do
    get "/api/v1/admin/users", headers: auth_header(@admin_token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["users"].is_a?(Array)
    assert body["pagination"].is_a?(Hash)
  end

  test "index blocks non admin" do
    get "/api/v1/admin/users", headers: auth_header(@user_token)

    assert_response :forbidden
  end

  test "update_status can inactivate and reactivate user" do
    patch "/api/v1/admin/users/#{@user.id}/status", params: { active: false }, headers: auth_header(@admin_token)
    assert_response :ok
    assert_equal false, @user.reload.active

    patch "/api/v1/admin/users/#{@user.id}/status", params: { active: true }, headers: auth_header(@admin_token)
    assert_response :ok
    assert_equal true, @user.reload.active
  end

  test "update_status prevents inactivating own admin account" do
    patch "/api/v1/admin/users/#{@admin.id}/status", params: { active: false }, headers: auth_header(@admin_token)

    assert_response :unprocessable_entity
  end

  test "update_status prevents inactivating last active admin" do
    @other_admin.update!(active: false)

    patch "/api/v1/admin/users/#{@admin.id}/status", params: { active: false }, headers: auth_header(@admin_token)

    assert_response :unprocessable_entity
  end

  test "reset_password sets temporary password and force flag" do
    patch "/api/v1/admin/users/#{@user.id}/reset_password",
          params: { temporary_password: "senha_temp_123" },
          headers: auth_header(@admin_token)

    assert_response :ok
    @user.reload
    assert @user.authenticate("senha_temp_123")
    assert_equal true, @user.force_password_change
    assert_equal true, @user.active
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
