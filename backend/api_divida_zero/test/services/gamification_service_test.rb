require "test_helper"

class GamificationServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario XP",
      email: "usuario_xp_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  teardown do
    Current.user_local_date = nil
  end

  test "sync_record_achievements unlocks once with new reward points and remains permanent" do
    create_records_for_achievements!

    GamificationService.sync_record_achievements!(@user)

    unlocked_events = @user.gamification_events.where(event_type: "achievement_unlocked").order(:id).to_a
    unlocked_keys = unlocked_events.map { |event| event.metadata["achievement_key"] }

    assert_equal %w[first_record first_settlement ten_records five_settled].sort, unlocked_keys.sort

    points_by_key = unlocked_events.each_with_object({}) do |event, acc|
      acc[event.metadata["achievement_key"]] = event.points
    end

    assert_equal 80, points_by_key["first_record"]
    assert_equal 90, points_by_key["first_settlement"]
    assert_equal 180, points_by_key["ten_records"]
    assert_equal 210, points_by_key["five_settled"]

    assert_no_difference("@user.gamification_events.where(event_type: 'achievement_unlocked').count") do
      GamificationService.sync_record_achievements!(@user)
    end

    @user.financial_records.delete_all

    assert_no_difference("@user.gamification_events.where(event_type: 'achievement_unlocked').count") do
      GamificationService.sync_record_achievements!(@user)
    end
  end

  test "award! stores local_date using device date from Current context" do
    Current.user_local_date = Date.new(2026, 3, 30)

    feedback = GamificationService.award!(
      user: @user,
      event_type: "record_created",
      points: 50,
      metadata: {
        record_title: "Conta de luz"
      }
    )

    assert_not_nil feedback
    event = @user.gamification_events.order(:id).last
    assert_equal "2026-03-30", event.metadata["local_date"]
    assert_equal "Conta de luz", event.metadata["record_title"]
  end

  private

  def create_records_for_achievements!
    10.times do |index|
      settled = index < 5
      @user.financial_records.create!(
        title: "Registro #{index + 1}",
        description: "Teste",
        record_type: "launch",
        flow_type: "income",
        amount: 100 + index,
        status: settled ? "received" : "pending",
        due_date: Date.current + index.days,
        recurring: false,
        recurrence_type: "none",
        recurrence_count: 1,
        installments_total: 1,
        installment_number: 1
      )
    end
  end
end
