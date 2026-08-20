class WhatsappTemplateSyncJob < ApplicationJob
  queue_as :default

  def perform
    return unless WhatsappProvider.configured?

    templates = WhatsappProvider.fetch_templates
    return if templates.blank?

    templates.each do |tmpl|
      WhatsappTemplate.find_or_initialize_by(name: tmpl[:name]).update!(
        provider_template_id: tmpl[:provider_template_id],
        language: tmpl[:language] || "pt_BR",
        status: tmpl[:status] || "approved",
        components: tmpl[:components] || [],
        last_synced_at: Time.current
      )
    end

    Rails.logger.info "[WhatsappTemplateSync] Synced #{templates.size} templates"
  rescue StandardError => e
    Rails.logger.error "[WhatsappTemplateSync] Failed: #{e.message}"
  end
end
