class GenerateDailyAiMessageJob < ApplicationJob
  queue_as :default

  def perform(date_iso8601 = nil)
    date =
      if date_iso8601.present?
        Date.parse(date_iso8601.to_s)
      else
        Date.current
      end

    Ai::DailyMessageGenerator.generate_for(date: date)
  rescue StandardError
    Ai::DailyMessageGenerator.generate_for(date: Date.current)
  end
end
