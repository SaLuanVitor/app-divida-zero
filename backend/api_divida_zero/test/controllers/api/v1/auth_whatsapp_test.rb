require "test_helper"

class Api::V1::AuthWhatsappTest < ActionDispatch::IntegrationTest
  setup do
    @password = "senha1234"
    @user = User.create!(
      name: "WA Auth Test",
      email: "wa_auth_#{Time.now.to_i}_#{rand(1000)}",
      password: @password,
      password_confirmation: @password
    )
    Rack::Attack.enabled = false
    @token = JsonWebToken.issue_pair(user_id: @user.id)[:access_token]
  end

  teardown do
    Rack::Attack.enabled = true
  end

  test "whatsapp preferences require authentication" do
    patch "/api/v1/auth/whatsapp_notifications", params: {
      wa_notification_preferences: { wa_notifications_enabled: true }
    }
    assert_response :unauthorized
  end

  test "authenticated user can update whatsapp opt-in" do
    patch "/api/v1/auth/whatsapp_notifications",
          params: { wa_notification_preferences: { wa_notifications_enabled: true } },
          headers: auth_header(@token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal true, ActiveModel::Type::Boolean.new.cast(body.dig("wa_preferences", "wa_notifications_enabled"))
  end

  test "phone code requires authentication" do
    patch "/api/v1/auth/phone", params: { phone: "+5511999990000" }
    assert_response :unauthorized
  end

  test "verify phone requires authentication" do
    post "/api/v1/auth/phone/verify", params: { phone: "+5511999990000", code: "123456" }
    assert_response :unauthorized
  end

  test "phone code rejects blank phone" do
    patch "/api/v1/auth/phone",
          params: { phone: "" },
          headers: auth_header(@token)
    assert_response :unprocessable_entity
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
