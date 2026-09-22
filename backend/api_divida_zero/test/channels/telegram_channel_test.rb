require "test_helper"

class TelegramChannelTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Telegram Channel Test",
      email: "telegram_channel_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234",
      telegram_chat_id: "123456789",
      telegram_opt_in_at: Time.current,
      telegram_notification_preferences: {
        "telegram_notifications_enabled" => true,
        "telegram_due_reminders" => true,
        "telegram_weekly_summary" => false
      }
    )
    @alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Test", message: "Test",
      due_count: 1, window_key: "telegram-channel-#{SecureRandom.hex(4)}", metadata: {}
    )
  end

  test "channel_name is telegram" do
    assert_equal "telegram", TelegramChannel.channel_name
  end

  test "valid_recipient? requires chat_id, opt-in and preference" do
    assert TelegramChannel.valid_recipient?(@user)

    @user.update!(telegram_chat_id: nil)
    refute TelegramChannel.valid_recipient?(@user)
  end

  test "valid_recipient? is false when telegram notifications disabled" do
    @user.update_telegram_preferences!("telegram_notifications_enabled" => false)
    refute TelegramChannel.valid_recipient?(@user)
  end

  test "deliver skips when provider is not configured" do
    TelegramProvider.stub(:configured?, false) do
      result = TelegramChannel.deliver(user: @user, alert: @alert)
      assert result.success?
      assert_nil result.message_id
    end
  end

  test "deliver returns error result when chat_id is missing" do
    @user.update!(telegram_chat_id: nil)
    TelegramProvider.stub(:configured?, true) do
      result = TelegramChannel.deliver(user: @user, alert: @alert)
      refute result.success?
      assert_equal "No chat_id", result.error
    end
  end

  test "deliver sends message via provider" do
    result = TelegramProvider::Result.new(success: true, provider_message_id: 999)
    TelegramProvider.stub(:configured?, true) do
      TelegramProvider.stub(:send_message, result) do
        out = TelegramChannel.deliver(user: @user, alert: @alert)
        assert out.success?
        assert_equal 999, out.provider_message_id
      end
    end
  end
end
