# frozen_string_literal: true

# Seeds delegam ao DemoSeedService — mesma lógica usada pelo rake app:seed_demo.
# Não roda em ambiente de teste para evitar poluição do banco de CI.
return if Rails.env.test?

DemoSeedService.call!
