require "test_helper"

class Api::V1::DevicesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Devices",
      email: "usuario_devices_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
    @token_value = "ExponentPushToken[devices-test]"
  end

  test "create upserts device token and push preferences" do
    post "/api/v1/devices",
         params: {
           expo_push_token: @token_value,
           platform: "android",
           push_preferences: {
             notifications_enabled: true,
             device_push_enabled: true,
             notify_due_today: false
           }
         },
         headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal @token_value, body.dig("device", "expo_push_token")
    assert_equal "android", body.dig("device", "platform")
    assert_equal 1, @user.device_tokens.count
    assert_equal false, @user.reload.push_preferences_with_defaults["notify_due_today"]
  end

  test "create reassigns token when it belongs to another user" do
    other_user = User.create!(
      name: "Outro Usuario",
      email: "outro_devices_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    other_user.device_tokens.create!(
      expo_push_token: @token_value,
      platform: "android",
      last_seen_at: Time.current
    )

    post "/api/v1/devices",
         params: { expo_push_token: @token_value, platform: "android" },
         headers: auth_header(@tokens[:access_token])

    assert_response :ok
    assert_equal 1, @user.device_tokens.where(expo_push_token: @token_value).count
    assert_equal 0, other_user.device_tokens.where(expo_push_token: @token_value).count
  end

  test "destroy removes token for current user" do
    @user.device_tokens.create!(
      expo_push_token: @token_value,
      platform: "android",
      last_seen_at: Time.current
    )

    delete "/api/v1/devices",
           params: { expo_push_token: @token_value },
           headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 1, body["removed_count"]
    assert_equal 0, @user.device_tokens.count
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
