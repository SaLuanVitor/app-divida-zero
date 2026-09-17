class WhatsappQualityMonitorJob < ApplicationJob
  queue_as :default

  QUALITY_THRESHOLD = 70

  def perform
    return unless WhatsappProvider.configured?

      total = WhatsappMessage.where(created_at: 7.days.ago..Time.current).count
      failed = WhatsappMessage.failed.where(created_at: 7.days.ago..Time.current).count

      if total.zero?
        Rails.logger.info "[WhatsappQuality] No messages in last 7 days to evaluate"
        return
      end

      delivery_rate = ((total - failed).to_f / total * 100).round(2)

      if delivery_rate < QUALITY_THRESHOLD
        Rails.logger.warn "[WhatsappQuality] Low quality score: #{delivery_rate}% (threshold: #{QUALITY_THRESHOLD}%)"
      else
        Rails.logger.info "[WhatsappQuality] Score: #{delivery_rate}% — OK"
      end

    { total: total, failed: failed, delivery_rate: delivery_rate }
  rescue StandardError => e
    Rails.logger.error "[WhatsappQuality] Monitor failed: #{e.message}"
    nil
  end
end
