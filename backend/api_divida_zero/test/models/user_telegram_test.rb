require "test_helper"

class UserTelegramTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Telegram User Test",
      email: "telegram_user_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "telegram preferences default to disabled" do
    prefs = @user.telegram_preferences_with_defaults
    assert_equal false, prefs["telegram_notifications_enabled"]
    assert_equal true, prefs["telegram_due_reminders"]
    assert_equal true, prefs["telegram_weekly_summary"]
  end

  test "update_telegram_preferences! merges allowed keys only" do
    @user.update_telegram_preferences!(
      "telegram_notifications_enabled" => true,
      "telegram_weekly_summary" => false,
      "ignored_key" => true
    )

    @user.reload
    prefs = @user.telegram_preferences_with_defaults
    assert_equal true, prefs["telegram_notifications_enabled"]
    assert_equal false, prefs["telegram_weekly_summary"]
    refute prefs.key?("ignored_key")
  end

  test "telegram_enabled_for_alert? respects due vs weekly flags" do
    @user.update_telegram_preferences!(
      "telegram_notifications_enabled" => true,
      "telegram_due_reminders" => true,
      "telegram_weekly_summary" => false
    )

    assert @user.telegram_enabled_for_alert?("due_today")
    refute @user.telegram_enabled_for_alert?("weekly_summary")
  end

  test "telegram_enabled_for_alert? is false when notifications disabled" do
    refute @user.telegram_enabled_for_alert?("due_today")

    @user.update_telegram_preferences!("telegram_notifications_enabled" => false)
    refute @user.telegram_enabled_for_alert?("due_today")
  end
end
