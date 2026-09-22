require "test_helper"

class WhatsappChannelTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "WA Channel Test",
      email: "wa_channel_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234",
      phone: "+5511999990001",
      phone_verified: true,
      wa_notification_preferences: {
        "wa_notifications_enabled" => true,
        "wa_due_reminders" => true,
        "wa_weekly_summary" => false
      }
    )
    @alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Test", message: "Test",
      due_count: 1, window_key: "wa-channel-#{SecureRandom.hex(4)}", metadata: {}
    )
  end

  test "channel_name is whatsapp" do
    assert_equal "whatsapp", WhatsappChannel.channel_name
  end

  test "valid_recipient? requires verified phone and opt-in" do
    assert WhatsappChannel.valid_recipient?(@user)

    @user.update!(phone_verified: false)
    refute WhatsappChannel.valid_recipient?(@user)
  end

  test "valid_recipient? is false when wa notifications disabled" do
    @user.update_wa_preferences!("wa_notifications_enabled" => false)
    refute WhatsappChannel.valid_recipient?(@user)
  end

  test "deliver skips when provider is not configured" do
    WhatsappProvider.stub(:configured?, false) do
      result = WhatsappChannel.deliver(user: @user, alert: @alert)
      assert result.success?
      assert_nil result.message_id
    end
  end

  test "template_for maps alert types" do
    assert_equal "due_reminder", WhatsappChannel.template_for("due_today")
    assert_equal "due_reminder", WhatsappChannel.template_for("near_due")
    assert_equal "overdue_alert", WhatsappChannel.template_for("overdue")
    assert_equal "weekly_summary", WhatsappChannel.template_for("weekly_summary")
    assert_nil WhatsappChannel.template_for("unknown")
  end
end
