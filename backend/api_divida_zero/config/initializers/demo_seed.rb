# frozen_string_literal: true

# Garante que a conta demo unirios_demo existe ao subir o servidor em produção.
# Idempotente: DemoSeedService verifica financial_records.exists? antes de criar dados.
# Output vai para os Deploy Logs do Railway (visível ao contrário do preDeployCommand).
if Rails.env.production?
  Rails.application.config.after_initialize do
    begin
      DemoSeedService.call!
    rescue => e
      Rails.logger.error "[DemoSeed] falhou: #{e.message}"
    end
  end
end
