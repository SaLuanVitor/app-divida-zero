require "test_helper"

class Api::V1::AuthTelegramTest < ActionDispatch::IntegrationTest
  setup do
    @password = "senha1234"
    @user = User.create!(
      name: "Telegram Auth Test",
      email: "telegram_auth_#{Time.now.to_i}_#{rand(1000)}",
      password: @password,
      password_confirmation: @password
    )
    Rack::Attack.enabled = false
    @token = JsonWebToken.issue_pair(user_id: @user.id)[:access_token]
  end

  teardown do
    Rack::Attack.enabled = true
  end

  test "telegram preferences require authentication" do
    patch "/api/v1/auth/telegram_notifications", params: {
      telegram_notification_preferences: { telegram_notifications_enabled: true }
    }
    assert_response :unauthorized
  end

  test "authenticated user can update telegram opt-in" do
    patch "/api/v1/auth/telegram_notifications",
          params: { telegram_notification_preferences: { telegram_notifications_enabled: true } },
          headers: auth_header(@token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal true, ActiveModel::Type::Boolean.new.cast(body.dig("telegram_preferences", "telegram_notifications_enabled"))
  end

  test "link_url requires configured bot" do
    TelegramProvider.stub(:bot_username, nil) do
      get "/api/v1/auth/telegram/link_url", headers: auth_header(@token)
      assert_response :unprocessable_entity
    end
  end

  test "link_url returns deep link with signed token" do
    TelegramProvider.stub(:bot_username, "divida_zero_bot") do
      get "/api/v1/auth/telegram/link_url", headers: auth_header(@token)
      assert_response :ok
      body = JSON.parse(response.body)
      assert_match %r{^https://t\.me/divida_zero_bot\?start=}, body["link"]
      assert_match %r{^tg://resolve\?domain=divida_zero_bot&start=}, body["tg_link"]
    end
  end

  test "link_telegram rejects invalid token" do
    post "/api/v1/auth/telegram/link",
         params: { chat_id: "123", auth_token: "bad-token" },
         headers: auth_header(@token)
    assert_response :unprocessable_entity
  end

  test "link_telegram binds chat_id with valid token" do
    link_token = TelegramLinkToken.issue(user_id: @user.id)

    post "/api/v1/auth/telegram/link",
         params: { chat_id: "987654321", username: "fulano", auth_token: link_token },
         headers: auth_header(@token)

    assert_response :ok
    @user.reload
    assert_equal "987654321", @user.telegram_chat_id
    assert_equal "fulano", @user.telegram_username
    assert @user.telegram_opt_in_at.present?
    assert @user.telegram_enabled_for_alert?("due_today")
  end

  test "link_telegram rejects chat_id already bound to another account" do
    other = User.create!(
      name: "Other", email: "telegram_other_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234", password_confirmation: "senha1234",
      telegram_chat_id: "111"
    )
    link_token = TelegramLinkToken.issue(user_id: @user.id)

    post "/api/v1/auth/telegram/link",
         params: { chat_id: other.telegram_chat_id, auth_token: link_token },
         headers: auth_header(@token)
    assert_response :conflict
  end

  test "unlink_telegram clears chat_id and disables notifications" do
    @user.update!(
      telegram_chat_id: "987654321",
      telegram_username: "fulano",
      telegram_opt_in_at: Time.current
    )
    @user.update_telegram_preferences!("telegram_notifications_enabled" => true)

    delete "/api/v1/auth/telegram/link", headers: auth_header(@token)

    assert_response :ok
    @user.reload
    assert_nil @user.telegram_chat_id
    assert_nil @user.telegram_username
    assert_nil @user.telegram_opt_in_at
    refute @user.telegram_enabled_for_alert?("due_today")
  end

  test "unlink_telegram requires authentication" do
    delete "/api/v1/auth/telegram/link"
    assert_response :unauthorized
  end

  test "me returns telegram identity and linked flag" do
    @user.update!(
      telegram_chat_id: "987654321",
      telegram_username: "fulano",
      telegram_opt_in_at: Time.current
    )

    get "/api/v1/auth/me", headers: auth_header(@token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal true, body["telegram_linked"]
    assert_equal "fulano", body["telegram_username"]
    assert_equal "987654321", body["telegram_chat_id"]
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
