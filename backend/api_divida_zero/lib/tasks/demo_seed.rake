namespace :app do
  desc "Cria/atualiza conta demo UniriosDemo com dados de apresentação"
  task seed_demo: :environment do
    DemoSeedService.call!
  rescue => error
    puts "⚠️  seed_demo falhou: #{error.message}"
    puts error.backtrace.first(5).join("\n")
  end
end
