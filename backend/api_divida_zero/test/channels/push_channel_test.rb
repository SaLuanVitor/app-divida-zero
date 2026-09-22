require "test_helper"

class PushChannelTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Push Channel Test",
      email: "push_channel_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234",
      push_preferences: {
        "notifications_enabled" => true,
        "notify_due_today" => true
      }
    )
    @alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Test", message: "Test",
      due_count: 1, window_key: "push-channel-#{SecureRandom.hex(4)}", metadata: {}
    )
  end

  test "channel_name is push" do
    assert_equal "push", PushChannel.channel_name
  end

  test "valid_recipient? follows push preference" do
    assert PushChannel.valid_recipient?(@user)

    @user.update!(push_preferences: { "notifications_enabled" => false, "notify_due_today" => true })
    refute PushChannel.valid_recipient?(@user)
  end

  test "deliver succeeds without tokens and does not call Expo" do
    called = false
    ExpoPushService.stub(:deliver, ->(*) { called = true; { delivered: 1, removed_tokens: [] } }) do
      result = PushChannel.deliver(user: @user, alert: @alert)
      assert result.success?
      refute called
    end
  end

  test "deliver reports success when Expo delivers at least one" do
    @user.device_tokens.create!(
      expo_push_token: "ExponentPushToken[test]",
      platform: "android",
      last_seen_at: Time.current
    )

    ExpoPushService.stub(:deliver, { delivered: 1, removed_tokens: [] }) do
      result = PushChannel.deliver(user: @user, alert: @alert)
      assert result.success?
      assert_equal "push-#{@alert.id}", result.message_id
    end
  end
end
