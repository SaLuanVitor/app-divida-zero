module Ai
  class UsageGuard
    class << self
      def check(user:, now: Time.zone.now)
        today = now.to_date
        month_start = today.beginning_of_month
        daily_limit = ENV.fetch("AI_DAILY_REQUEST_LIMIT", "20").to_i
        monthly_limit = ENV.fetch("AI_MONTHLY_REQUEST_LIMIT", "200").to_i

        daily_counter = lock_counter(user: user, period_type: "daily", period_start: today)
        monthly_counter = lock_counter(user: user, period_type: "monthly", period_start: month_start)
        allowed = daily_counter.requests_count < daily_limit && monthly_counter.requests_count < monthly_limit

        {
          allowed: allowed,
          daily_remaining: [daily_limit - daily_counter.requests_count, 0].max,
          monthly_remaining: [monthly_limit - monthly_counter.requests_count, 0].max
        }
      end

      def consume!(user:, tokens:, now: Time.zone.now)
        today = now.to_date
        month_start = today.beginning_of_month
        daily_limit = ENV.fetch("AI_DAILY_REQUEST_LIMIT", "20").to_i
        monthly_limit = ENV.fetch("AI_MONTHLY_REQUEST_LIMIT", "200").to_i

        daily_counter = lock_counter(user: user, period_type: "daily", period_start: today)
        monthly_counter = lock_counter(user: user, period_type: "monthly", period_start: month_start)

        return denied(daily_counter, monthly_counter, daily_limit, monthly_limit) if daily_counter.requests_count >= daily_limit
        return denied(daily_counter, monthly_counter, daily_limit, monthly_limit) if monthly_counter.requests_count >= monthly_limit

        daily_counter.requests_count += 1
        daily_counter.tokens_count += tokens.to_i
        monthly_counter.requests_count += 1
        monthly_counter.tokens_count += tokens.to_i
        daily_counter.save!
        monthly_counter.save!

        {
          allowed: true,
          daily_remaining: [daily_limit - daily_counter.requests_count, 0].max,
          monthly_remaining: [monthly_limit - monthly_counter.requests_count, 0].max
        }
      end

      private

      def lock_counter(user:, period_type:, period_start:)
        AiUsageCounter.lock.find_or_initialize_by(user: user, period_type: period_type, period_start: period_start).tap do |counter|
          counter.requests_count ||= 0
          counter.tokens_count ||= 0
        end
      end

      def denied(daily_counter, monthly_counter, daily_limit, monthly_limit)
        {
          allowed: false,
          daily_remaining: [daily_limit - daily_counter.requests_count, 0].max,
          monthly_remaining: [monthly_limit - monthly_counter.requests_count, 0].max
        }
      end
    end
  end
end
