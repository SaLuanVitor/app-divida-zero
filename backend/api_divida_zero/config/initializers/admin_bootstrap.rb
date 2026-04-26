if Rails.env.production?
  Rails.application.config.after_initialize do
    # Skip during asset precompile at image build time.
    next if ENV["SECRET_KEY_BASE_DUMMY"].present?

    AdminBootstrapService.call!(require_env: true)
  rescue AdminBootstrapService::BootstrapError => error
    Rails.logger.error("[admin_bootstrap] #{error.message}")
    raise
  rescue StandardError => error
    Rails.logger.error("[admin_bootstrap] Falha inesperada: #{error.class}: #{error.message}")
    raise
  end
end
