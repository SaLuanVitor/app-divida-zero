require "test_helper"

module Ai
  class UsageGuardTest < ActiveSupport::TestCase
    setup do
      @user = User.create!(
        name: "Usuario Uso",
        email: "usuario_uso_#{Time.now.to_i}_#{rand(9999)}@example.com",
        password: "senha1234",
        password_confirmation: "senha1234"
      )
      @now = Time.zone.local(2026, 7, 10, 12, 0, 0)
      @original_env = ENV.to_hash
    end

    teardown do
      ENV.replace(@original_env)
    end

    test "check allows request when under daily and monthly limits" do
      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"
      ENV["AI_MONTHLY_REQUEST_LIMIT"] = "200"

      result = Ai::UsageGuard.check(user: @user, now: @now)

      assert result[:allowed]
      assert_equal 20, result[:daily_remaining]
      assert_equal 200, result[:monthly_remaining]
    end

    test "check denies when daily limit is reached" do
      create_daily_counter(@user, @now.to_date, requests: 20)

      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"
      ENV["AI_MONTHLY_REQUEST_LIMIT"] = "200"

      result = Ai::UsageGuard.check(user: @user, now: @now)

      assert_not result[:allowed]
      assert_equal 0, result[:daily_remaining]
    end

    test "check denies when monthly limit is reached" do
      create_monthly_counter(@user, @now.to_date.beginning_of_month, requests: 200)

      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"
      ENV["AI_MONTHLY_REQUEST_LIMIT"] = "200"

      result = Ai::UsageGuard.check(user: @user, now: @now)

      assert_not result[:allowed]
      assert_equal 0, result[:monthly_remaining]
    end

    test "consume! increments counters when allowed" do
      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"
      ENV["AI_MONTHLY_REQUEST_LIMIT"] = "200"

      result = Ai::UsageGuard.consume!(user: @user, tokens: 150, now: @now)

      assert result[:allowed]
      assert_equal 19, result[:daily_remaining]
      assert_equal 199, result[:monthly_remaining]

      daily = AiUsageCounter.find_by!(user: @user, period_type: "daily", period_start: @now.to_date)
      monthly = AiUsageCounter.find_by!(user: @user, period_type: "monthly", period_start: @now.to_date.beginning_of_month)

      assert_equal 1, daily.requests_count
      assert_equal 150, daily.tokens_count
      assert_equal 1, monthly.requests_count
      assert_equal 150, monthly.tokens_count
    end

    test "consume! denies when daily limit reached" do
      create_daily_counter(@user, @now.to_date, requests: 20)

      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"
      ENV["AI_MONTHLY_REQUEST_LIMIT"] = "200"

      result = Ai::UsageGuard.consume!(user: @user, tokens: 50, now: @now)

      assert_not result[:allowed]
      assert_equal 0, result[:daily_remaining]
    end

    test "consume! denies when monthly limit reached" do
      create_monthly_counter(@user, @now.to_date.beginning_of_month, requests: 200)

      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"
      ENV["AI_MONTHLY_REQUEST_LIMIT"] = "200"

      result = Ai::UsageGuard.consume!(user: @user, tokens: 50, now: @now)

      assert_not result[:allowed]
      assert_equal 0, result[:monthly_remaining]
    end

    test "uses default limits when env vars are not set" do
      ENV.delete("AI_DAILY_REQUEST_LIMIT")
      ENV.delete("AI_MONTHLY_REQUEST_LIMIT")

      result = Ai::UsageGuard.check(user: @user, now: @now)

      assert result[:allowed]
      assert_equal 20, result[:daily_remaining]
      assert_equal 200, result[:monthly_remaining]
    end

    test "counters are per-user" do
      other_user = User.create!(
        name: "Outro Usuario",
        email: "outro_#{Time.now.to_i}_#{rand(9999)}@example.com",
        password: "senha1234",
        password_confirmation: "senha1234"
      )

      create_daily_counter(@user, @now.to_date, requests: 20)

      ENV["AI_DAILY_REQUEST_LIMIT"] = "20"

      user_result = Ai::UsageGuard.check(user: @user, now: @now)
      other_result = Ai::UsageGuard.check(user: other_user, now: @now)

      assert_not user_result[:allowed]
      assert other_result[:allowed]
    end

    private

    def create_daily_counter(user, date, requests:)
      AiUsageCounter.create!(
        user: user,
        period_type: "daily",
        period_start: date,
        requests_count: requests,
        tokens_count: requests * 100
      )
    end

    def create_monthly_counter(user, date, requests:)
      AiUsageCounter.create!(
        user: user,
        period_type: "monthly",
        period_start: date,
        requests_count: requests,
        tokens_count: requests * 100
      )
    end
  end
end
