class WhatsappDailyCapResetJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "[WhatsappDailyCap] Daily cap reset (no-op — caps are date-based)"
  end
end
