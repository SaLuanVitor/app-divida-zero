namespace :app do
  desc "Cria/garante conta admin via variáveis de ambiente"
  task bootstrap_admin: :environment do
    AdminBootstrapService.call!
  rescue AdminBootstrapService::BootstrapError => error
    abort(error.message)
  end
end
