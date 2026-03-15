require "test_helper"
require "digest"

class Api::V1::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @password = "senha1234"
    @user = User.create!(
      name: "Usuario Teste",
      email: "usuario_teste",
      password: @password,
      password_confirmation: @password
    )
  end

  test "register creates user and returns token pair" do
    assert_difference("User.count", 1) do
      post "/api/v1/auth/register", params: {
        name: "Novo Usuario",
        email: "novo_usuario",
        password: "nova_senha_123"
      }
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert body["access_token"].present?
    assert body["refresh_token"].present?
    assert_equal "novo_usuario", body.dig("user", "email")
  end

  test "register returns unprocessable entity for duplicated usuario" do
    post "/api/v1/auth/register", params: {
      name: "Outro Nome",
      email: @user.email,
      password: "outra_senha_123"
    }

    assert_response :unprocessable_entity
  end

  test "login returns user and token pair" do
    post "/api/v1/auth/login", params: { email: @user.email, password: @password }

    assert_response :ok
    body = JSON.parse(response.body)

    assert_equal @user.id, body.dig("user", "id")
    assert body["access_token"].present?
    assert body["refresh_token"].present?

    access_payload = JsonWebToken.decode(body["access_token"], expected_type: "access")
    refresh_payload = JsonWebToken.decode(body["refresh_token"], expected_type: "refresh")

    assert_equal @user.id, access_payload["sub"]
    assert_equal @user.id, refresh_payload["sub"]
  end

  test "login returns unauthorized for invalid credentials" do
    post "/api/v1/auth/login", params: { email: @user.email, password: "senha_errada" }

    assert_response :unauthorized
  end

  test "refresh returns new token pair with valid refresh token" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    post "/api/v1/auth/refresh", params: { refresh_token: tokens[:refresh_token] }

    assert_response :ok
    body = JSON.parse(response.body)

    assert body["access_token"].present?
    assert body["refresh_token"].present?
    assert_equal @user.id, JsonWebToken.decode(body["access_token"], expected_type: "access")["sub"]
  end

  test "refresh accepts bearer token when refresh_token param is absent" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    post "/api/v1/auth/refresh", headers: auth_header(tokens[:refresh_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["access_token"].present?
    assert body["refresh_token"].present?
  end

  test "refresh returns unauthorized with invalid refresh token" do
    post "/api/v1/auth/refresh", params: { refresh_token: "invalid-token" }

    assert_response :unauthorized
  end

  test "forgot_password always returns ok and includes dev token for existing user in test env" do
    post "/api/v1/auth/forgot_password", params: { email: @user.email }

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["message"].present?
    assert body["dev_reset_token"].present?

    @user.reload
    assert @user.reset_password_token_digest.present?
    assert @user.reset_password_sent_at.present?
  end

  test "forgot_password for unknown user still returns ok without revealing account" do
    post "/api/v1/auth/forgot_password", params: { email: "inexistente" }

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["message"].present?
  end

  test "reset_password updates password with valid token" do
    raw_token = "token_reset_123"
    @user.update!(
      reset_password_token_digest: Digest::SHA256.hexdigest(raw_token),
      reset_password_sent_at: Time.current
    )

    post "/api/v1/auth/reset_password", params: {
      email: @user.email,
      token: raw_token,
      password: "senha_nova_123"
    }

    assert_response :ok
    @user.reload
    assert @user.authenticate("senha_nova_123")
    assert_nil @user.reset_password_token_digest
    assert_nil @user.reset_password_sent_at
  end

  test "reset_password returns unprocessable entity for expired token" do
    raw_token = "token_expirado"
    @user.update!(
      reset_password_token_digest: Digest::SHA256.hexdigest(raw_token),
      reset_password_sent_at: 31.minutes.ago
    )

    post "/api/v1/auth/reset_password", params: {
      email: @user.email,
      token: raw_token,
      password: "senha_nova_123"
    }

    assert_response :unprocessable_entity
  end

  test "me returns unauthorized without bearer token" do
    get "/api/v1/auth/me"

    assert_response :unauthorized
  end

  test "me returns authenticated user with valid access token" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    get "/api/v1/auth/me", headers: auth_header(tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal @user.id, body.dig("user", "id")
  end

  test "me returns unauthorized when using refresh token instead of access token" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    get "/api/v1/auth/me", headers: auth_header(tokens[:refresh_token])

    assert_response :unauthorized
  end

  test "update_profile updates authenticated user" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    patch "/api/v1/auth/profile", params: { name: "Nome Atualizado", email: "usuario_atualizado" }, headers: auth_header(tokens[:access_token])

    assert_response :ok
    @user.reload
    assert_equal "Nome Atualizado", @user.name
    assert_equal "usuario_atualizado", @user.email
  end

  test "update_profile returns unauthorized without token" do
    patch "/api/v1/auth/profile", params: { name: "Sem Token" }

    assert_response :unauthorized
  end

  test "change_password updates password with valid current password" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    patch "/api/v1/auth/change_password", params: {
      current_password: @password,
      new_password: "senha_nova_123"
    }, headers: auth_header(tokens[:access_token])

    assert_response :ok
    @user.reload
    assert @user.authenticate("senha_nova_123")
  end

  test "change_password returns unprocessable entity when current password is invalid" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    patch "/api/v1/auth/change_password", params: {
      current_password: "senha_errada",
      new_password: "senha_nova_123"
    }, headers: auth_header(tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "change_password returns unprocessable entity when new password equals current" do
    tokens = JsonWebToken.issue_pair(user_id: @user.id)

    patch "/api/v1/auth/change_password", params: {
      current_password: @password,
      new_password: @password
    }, headers: auth_header(tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "change_password returns unauthorized without token" do
    patch "/api/v1/auth/change_password", params: {
      current_password: @password,
      new_password: "senha_nova_123"
    }

    assert_response :unauthorized
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end

