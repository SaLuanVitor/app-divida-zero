require "test_helper"

class DailyAchievementsServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Diario",
      email: "usuario_diario_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @today = Date.new(2026, 3, 30)
  end

  teardown do
    Current.user_local_date = nil
  end

  test "sync_for_user awards each daily task only once per date_key" do
    Current.user_local_date = @today
    date_key = @today.iso8601

    GamificationService.award!(
      user: @user,
      event_type: "record_created",
      points: 50,
      metadata: { local_date: date_key }
    )

    DailyAchievementsService.sync_for_user!(@user, date_key: date_key)

    first_daily_events = @user.gamification_events.where(event_type: "daily_achievement_completed")
    assert_equal 1, first_daily_events.count
    assert_equal "daily_record_created", first_daily_events.first.metadata["daily_key"]
    assert_equal 12, first_daily_events.first.points

    assert_no_difference("@user.gamification_events.where(event_type: 'daily_achievement_completed').count") do
      DailyAchievementsService.sync_for_user!(@user, date_key: date_key)
    end

    GamificationService.award!(
      user: @user,
      event_type: "expense_paid",
      points: 20,
      metadata: { local_date: date_key }
    )
    GamificationService.award!(
      user: @user,
      event_type: "goal_created",
      points: 50,
      metadata: { local_date: date_key }
    )

    DailyAchievementsService.sync_for_user!(@user, date_key: date_key)

    all_daily_events = @user.gamification_events.where(event_type: "daily_achievement_completed").order(:id)
    assert_equal 3, all_daily_events.count
    assert_equal %w[daily_record_created daily_settlement daily_goal_action].sort, all_daily_events.map { |event| event.metadata["daily_key"] }.sort
    assert_equal 42, all_daily_events.sum(:points)
  end

  test "summary_for_user reflects progress for the chosen local date and resets next day" do
    date_key = @today.iso8601
    tomorrow = (@today + 1.day).iso8601

    GamificationService.award!(
      user: @user,
      event_type: "record_created",
      points: 50,
      metadata: { local_date: date_key }
    )

    DailyAchievementsService.sync_for_user!(@user, date_key: date_key)
    today_summary = DailyAchievementsService.summary_for_user(@user, date_key: date_key)
    today_record_task = today_summary.find { |task| task[:key] == "daily_record_created" }

    assert_not_nil today_record_task
    assert_equal 1, today_record_task[:progress]
    assert_equal true, today_record_task[:completed]
    assert_equal date_key, today_record_task[:date_key]

    tomorrow_summary = DailyAchievementsService.summary_for_user(@user, date_key: tomorrow)
    assert_equal 3, tomorrow_summary.size
    assert_equal true, tomorrow_summary.all? { |task| task[:progress] == 0 }
    assert_equal true, tomorrow_summary.all? { |task| task[:completed] == false }
  end
end
