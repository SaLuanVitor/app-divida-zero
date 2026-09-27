require "test_helper"

class Api::V1::TelegramWebhooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Telegram Webhook Test",
      email: "telegram_webhook_#{Time.now.to_i}_#{rand(1000)}@test.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "links account on /iniciar command with token" do
    token = TelegramLinkToken.issue(user_id: @user.id)

    post "/api/v1/telegram/webhook",
         params: telegram_update(chat_id: "123456", username: "fulano", text: "/iniciar #{token}"),
         as: :json

    assert_response :ok
    @user.reload
    assert_equal "123456", @user.telegram_chat_id
    assert_equal "fulano", @user.telegram_username
  end

  test "links account on /start command with token" do
    token = TelegramLinkToken.issue(user_id: @user.id)

    post "/api/v1/telegram/webhook",
         params: telegram_update(chat_id: "123456", username: "fulano", text: "/start #{token}"),
         as: :json

    assert_response :ok
    @user.reload
    assert_equal "123456", @user.telegram_chat_id
  end

  test "does not link when token is missing" do
    post "/api/v1/telegram/webhook",
         params: telegram_update(chat_id: "123456", username: "fulano", text: "/iniciar"),
         as: :json

    assert_response :ok
    @user.reload
    assert_nil @user.telegram_chat_id
  end

  private

  def telegram_update(chat_id:, username:, text:)
    {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: chat_id.to_i, is_bot: false, username: username },
        chat: { id: chat_id.to_i, type: "private" },
        text: text
      }
    }
  end
end
