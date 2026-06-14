namespace :app do
  desc "Cria/garante conta admin via variáveis de ambiente"
  task bootstrap_admin: :environment do
    AdminBootstrapService.call!
    DemoSeedService.call!
  rescue AdminBootstrapService::BootstrapError => error
    abort(error.message)
  rescue => error
    puts "⚠️  DemoSeedService falhou (não crítico): #{error.message}"
  end
end
