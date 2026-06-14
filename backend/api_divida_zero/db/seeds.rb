# frozen_string_literal: true

# =============================================================================
# SEED — Conta Demo "unirios"
# Usuário com ~14 meses de histórico real (Maio/2025 → Junho/2026)
# Idempotente: skip se financial_records já existirem para este usuário
# Guarda: não roda em ambiente de teste (evita poluição do banco de testes CI)
# =============================================================================

return if Rails.env.test?

puts "🌱 Iniciando seed da conta demo unirios..."

# -----------------------------------------------------------------------------
# USUÁRIO
# Sempre garante senha correta mesmo se usuário já existia
# -----------------------------------------------------------------------------
user = User.find_by(email: "unirios@demo.com")

if user
  user.update_column(:password_digest, BCrypt::Password.create("1234"))
  puts "👤 Usuário existente encontrado — senha atualizada: #{user.email}"
else
  user = User.new(
    email:              "unirios@demo.com",
    name:               "Unirios Demo",
    password:           "1234",
    role:               "user",
    active:             true,
    profile_icon_key:   "icon_03",
    profile_frame_key:  "frame_02"
  )
  user.save!(validate: false)
  puts "👤 Usuário criado: #{user.email}"
end

if user.financial_records.exists?
  puts "✅ Seed já executado para unirios. Pulando."
  return
end

puts "👤 Usuário criado: #{user.email}"

# -----------------------------------------------------------------------------
# HELPERS
# -----------------------------------------------------------------------------
def paid_at_for(due_date, paid: true)
  return nil unless paid
  due_date - rand(0..5).days
end

def group(prefix)
  "#{prefix}_#{SecureRandom.hex(4)}"
end

# Referências de meses (due_date dia 5 de cada mês)
months = (0..13).map { |i| Date.new(2025, 5, 1) + i.months }

# =============================================================================
# FINANCIAL RECORDS
# =============================================================================

records_to_create = []

# -----------------------------------------------------------------------------
# 1. SALÁRIO — R$ 3.200/mês (13 competências, lançamento mensal)
# -----------------------------------------------------------------------------
salary_group = group("salario")
months[0..12].each_with_index do |m, i|
  due   = m.change(day: 5)
  paid  = due <= Date.today
  records_to_create << {
    title:           "Salário #{due.strftime('%b/%Y')}",
    record_type:     "launch",
    flow_type:       "income",
    category:        "salario",
    amount:          3200.00,
    due_date:        due,
    paid_at:         paid ? (due - rand(0..2).days) : nil,
    status:          paid ? "received" : "pending",
    priority:        "high",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      salary_group,
    notes:           "Salário mensal empresa Unirios Ltda"
  }
end

# -----------------------------------------------------------------------------
# 2. FREELANCER — Valores variados, irregulares (~11 ao longo do período)
# -----------------------------------------------------------------------------
freelancers = [
  { month: months[0],  day: 12, amount: 1200.00, title: "Freela — Site institucional cliente A" },
  { month: months[1],  day: 20, amount: 850.00,  title: "Freela — Logo e identidade visual" },
  { month: months[2],  day: 8,  amount: 2500.00, title: "Freela — App landing page (full)" },
  { month: months[3],  day: 15, amount: 600.00,  title: "Freela — Consultoria UX/UI" },
  { month: months[4],  day: 28, amount: 1800.00, title: "Freela — E-commerce pequeno porte" },
  { month: months[5],  day: 10, amount: 400.00,  title: "Freela — Edição vídeo institucional" },
  { month: months[7],  day: 3,  amount: 3200.00, title: "Freela — Sistema de agendamento" },
  { month: months[8],  day: 22, amount: 750.00,  title: "Freela — Dashboards analytics" },
  { month: months[9],  day: 14, amount: 1400.00, title: "Freela — API REST integração ERP" },
  { month: months[11], day: 5,  amount: 2100.00, title: "Freela — App mobile MVP" },
  { month: months[13], day: 18, amount: 900.00,  title: "Freela — Mentoria React Native (4h)" }
]

freelancers.each do |f|
  due  = f[:month].change(day: f[:day])
  paid = due <= Date.today
  records_to_create << {
    title:       f[:title],
    record_type: "launch",
    flow_type:   "income",
    category:    "freelancer",
    amount:      f[:amount],
    due_date:    due,
    paid_at:     paid ? (due + rand(1..7).days) : nil,
    status:      paid ? "received" : "pending",
    priority:    "normal",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 3. ALUGUEL — R$ 950/mês (13 meses, dívida recorrente)
# -----------------------------------------------------------------------------
rent_group = group("aluguel")
months[0..12].each_with_index do |m, i|
  due  = m.change(day: 10)
  paid = due <= Date.today
  records_to_create << {
    title:           "Aluguel #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "moradia",
    amount:          950.00,
    due_date:        due,
    paid_at:         paid ? (due - rand(0..3).days) : nil,
    status:          paid ? "paid" : "pending",
    priority:        "high",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      rent_group,
    notes:           "Aluguel apartamento — Rua das Flores, 120"
  }
end

# -----------------------------------------------------------------------------
# 4. CARTÃO DE CRÉDITO (NUBANK) — faturas mensais variando R$ 600–2.200
# -----------------------------------------------------------------------------
card_faturas = [
  { month: months[0],  day: 15, amount: 1250.00 },
  { month: months[1],  day: 15, amount: 980.00  },
  { month: months[2],  day: 15, amount: 1870.00 },
  { month: months[3],  day: 15, amount: 720.00  },
  { month: months[4],  day: 15, amount: 2100.00 },
  { month: months[5],  day: 15, amount: 640.00  },
  { month: months[6],  day: 15, amount: 1380.00 },
  { month: months[7],  day: 15, amount: 1650.00 },
  { month: months[8],  day: 15, amount: 890.00  },
  { month: months[9],  day: 15, amount: 1100.00 },
  { month: months[10], day: 15, amount: 2200.00 },
  { month: months[11], day: 15, amount: 760.00  },
  { month: months[12], day: 15, amount: 1490.00 },
  { month: months[13], day: 15, amount: 830.00  }
]

card_faturas.each_with_index do |f, i|
  due      = f[:month].change(day: f[:day])
  paid     = due < Date.today - 5.days
  g        = group("nubank_fatura")
  records_to_create << {
    title:           "Fatura Nubank #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "cartao_credito",
    amount:          f[:amount],
    due_date:        due,
    paid_at:         paid ? (due - rand(1..5).days) : nil,
    status:          paid ? "paid" : "pending",
    priority:        i >= 12 ? "high" : "normal",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      g
  }
end

# -----------------------------------------------------------------------------
# 5. MERCADO / SUPERMERCADO — lançamento mensal R$ 380–680
# -----------------------------------------------------------------------------
grocery_amounts = [420, 510, 380, 620, 490, 560, 430, 680, 390, 470, 540, 600, 415, 355]
grocery_group   = group("mercado")
months[0..13].each_with_index do |m, i|
  due = m.change(day: 20)
  paid = due <= Date.today
  records_to_create << {
    title:           "Supermercado #{due.strftime('%b/%Y')}",
    record_type:     "launch",
    flow_type:       "expense",
    category:        "alimentacao",
    amount:          grocery_amounts[i].to_f,
    due_date:        due,
    paid_at:         paid ? due : nil,
    status:          paid ? "paid" : "pending",
    priority:        "normal",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      grocery_group
  }
end

# -----------------------------------------------------------------------------
# 6. ENERGIA ELÉTRICA — R$ 110–220/mês
# -----------------------------------------------------------------------------
energy_vals   = [130, 145, 220, 190, 115, 155, 168, 210, 140, 175, 195, 122, 160, 138]
energy_group  = group("energia")
months[0..13].each_with_index do |m, i|
  due  = m.change(day: 8)
  paid = due <= Date.today
  records_to_create << {
    title:           "Energia Elétrica #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "moradia",
    amount:          energy_vals[i].to_f,
    due_date:        due,
    paid_at:         paid ? (due - rand(0..2).days) : nil,
    status:          paid ? "paid" : "pending",
    priority:        "normal",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      energy_group
  }
end

# -----------------------------------------------------------------------------
# 7. ÁGUA — R$ 55–90/mês
# -----------------------------------------------------------------------------
water_group = group("agua")
water_vals  = [65, 72, 58, 88, 61, 75, 69, 90, 55, 80, 73, 66, 85, 59]
months[0..13].each_with_index do |m, i|
  due  = m.change(day: 12)
  paid = due <= Date.today
  records_to_create << {
    title:           "Conta de Água #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "moradia",
    amount:          water_vals[i].to_f,
    due_date:        due,
    paid_at:         paid ? (due - rand(0..1).days) : nil,
    status:          paid ? "paid" : "pending",
    priority:        "normal",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      water_group
  }
end

# -----------------------------------------------------------------------------
# 8. INTERNET — R$ 99,90/mês
# -----------------------------------------------------------------------------
internet_group = group("internet")
months[0..13].each_with_index do |m, i|
  due  = m.change(day: 18)
  paid = due <= Date.today
  records_to_create << {
    title:           "Internet #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "moradia",
    amount:          99.90,
    due_date:        due,
    paid_at:         paid ? (due - 1.day) : nil,
    status:          paid ? "paid" : "pending",
    priority:        "normal",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      internet_group
  }
end

# -----------------------------------------------------------------------------
# 9. ACADEMIA — R$ 89/mês
# -----------------------------------------------------------------------------
gym_group = group("academia")
months[0..13].each_with_index do |m, i|
  due  = m.change(day: 1)
  paid = due <= Date.today
  records_to_create << {
    title:           "Academia #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "saude",
    amount:          89.00,
    due_date:        due,
    paid_at:         paid ? due : nil,
    status:          paid ? "paid" : "pending",
    priority:        "low",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      gym_group
  }
end

# -----------------------------------------------------------------------------
# 10. NETFLIX — R$ 39,90/mês
# -----------------------------------------------------------------------------
netflix_group = group("netflix")
months[0..13].each_with_index do |m, i|
  due  = m.change(day: 22)
  paid = due <= Date.today
  records_to_create << {
    title:           "Netflix #{due.strftime('%b/%Y')}",
    record_type:     "launch",
    flow_type:       "expense",
    category:        "lazer",
    amount:          39.90,
    due_date:        due,
    paid_at:         paid ? due : nil,
    status:          paid ? "paid" : "pending",
    priority:        "low",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      netflix_group
  }
end

# -----------------------------------------------------------------------------
# 11. SPOTIFY — R$ 21,90/mês
# -----------------------------------------------------------------------------
spotify_group = group("spotify")
months[0..13].each_with_index do |m, i|
  due  = m.change(day: 22)
  paid = due <= Date.today
  records_to_create << {
    title:           "Spotify #{due.strftime('%b/%Y')}",
    record_type:     "launch",
    flow_type:       "expense",
    category:        "lazer",
    amount:          21.90,
    due_date:        due,
    paid_at:         paid ? due : nil,
    status:          paid ? "paid" : "pending",
    priority:        "low",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      spotify_group
  }
end

# -----------------------------------------------------------------------------
# 12. NOTEBOOK DELL — 12x R$ 318,25 (Jul/2025 a Jun/2026)
# -----------------------------------------------------------------------------
notebook_group = group("notebook_dell")
notebook_start = Date.new(2025, 7, 1)
(1..12).each do |i|
  due  = (notebook_start + (i - 1).months).change(day: 20)
  paid = due <= Date.today
  records_to_create << {
    title:              "Notebook Dell Inspiron — #{i}/12",
    record_type:        "debt",
    flow_type:          "expense",
    category:           "tecnologia",
    amount:             318.25,
    due_date:           due,
    paid_at:            paid ? (due - rand(0..3).days) : nil,
    status:             paid ? "paid" : "pending",
    priority:           "normal",
    recurring:          false,
    recurrence_type:    "none",
    installments_total: 12,
    installment_number: i,
    group_code:         notebook_group,
    notes:              "Dell Inspiron 15 — R$ 3.819,00 parcelado em 12x"
  }
end

# -----------------------------------------------------------------------------
# 13. CELULAR SAMSUNG — 10x R$ 219,90 (Set/2025 a Jun/2026)
# -----------------------------------------------------------------------------
phone_group  = group("celular_samsung")
phone_start  = Date.new(2025, 9, 1)
(1..10).each do |i|
  due  = (phone_start + (i - 1).months).change(day: 25)
  paid = due <= Date.today
  records_to_create << {
    title:              "Samsung Galaxy A55 — #{i}/10",
    record_type:        "debt",
    flow_type:          "expense",
    category:           "tecnologia",
    amount:             219.90,
    due_date:           due,
    paid_at:            paid ? (due - rand(0..2).days) : nil,
    status:             paid ? "paid" : "pending",
    priority:           "normal",
    recurring:          false,
    recurrence_type:    "none",
    installments_total: 10,
    installment_number: i,
    group_code:         phone_group,
    notes:              "Samsung Galaxy A55 5G — R$ 2.199,00 parcelado em 10x"
  }
end

# -----------------------------------------------------------------------------
# 14. DÍVIDA PESSOAL — empréstimo amigo R$ 2.000 (5x R$ 400) com atraso
# -----------------------------------------------------------------------------
debt_friend_group = group("divida_amigo")
debt_start        = Date.new(2025, 12, 1)
(1..5).each do |i|
  due    = (debt_start + (i - 1).months).change(day: 10)
  paid   = i <= 2
  overdue = !paid && due < Date.today
  records_to_create << {
    title:              "Dívida — João (amigo) #{i}/5",
    record_type:        "debt",
    flow_type:          "expense",
    category:           "divida_pessoal",
    amount:             400.00,
    due_date:           due,
    paid_at:            paid ? (due - 1.day) : nil,
    status:             paid ? "paid" : "pending",
    priority:           overdue ? "high" : "normal",
    recurring:          false,
    recurrence_type:    "none",
    installments_total: 5,
    installment_number: i,
    group_code:         debt_friend_group,
    notes:              overdue ? "ATRASADO — combinar nova data com João" : nil
  }
end

# -----------------------------------------------------------------------------
# 15. COMBUSTÍVEL — lançamentos esporádicos
# -----------------------------------------------------------------------------
fuel_dates = [
  [2025, 5, 8,  180.00], [2025, 5, 22, 160.00],
  [2025, 6, 5,  195.00], [2025, 6, 19, 170.00],
  [2025, 7, 10, 185.00], [2025, 7, 25, 155.00],
  [2025, 8, 7,  200.00], [2025, 8, 21, 165.00],
  [2025, 9, 4,  175.00], [2025, 9, 18, 190.00],
  [2025, 10, 2, 180.00], [2025, 10, 16, 160.00],
  [2025, 11, 6, 195.00], [2025, 11, 20, 145.00],
  [2025, 12, 3, 185.00], [2025, 12, 18, 170.00],
  [2026, 1, 8,  200.00], [2026, 1, 22, 155.00],
  [2026, 2, 5,  180.00], [2026, 2, 20, 165.00],
  [2026, 3, 6,  190.00], [2026, 3, 21, 175.00],
  [2026, 4, 4,  185.00], [2026, 4, 18, 160.00],
  [2026, 5, 2,  195.00], [2026, 5, 16, 170.00],
  [2026, 6, 5,  180.00]
]

fuel_dates.each do |y, mo, d, amt|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       "Combustível — Posto Shell",
    record_type: "launch",
    flow_type:   "expense",
    category:    "transporte",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 16. FARMÁCIA / SAÚDE — esporádicos
# -----------------------------------------------------------------------------
health_records = [
  [2025, 5,  15, 45.80,  "Farmácia — remédios gripe"],
  [2025, 6,  22, 120.00, "Consulta médico clínico geral"],
  [2025, 7,  8,  38.50,  "Farmácia — protetor solar + vitaminas"],
  [2025, 8,  30, 250.00, "Exames laboratoriais"],
  [2025, 9,  12, 55.00,  "Farmácia — antibiótico"],
  [2025, 10, 5,  180.00, "Consulta dermatologista"],
  [2025, 11, 18, 42.00,  "Farmácia — suplemento vitamina D"],
  [2025, 12, 20, 320.00, "Dentista — limpeza + radiografia"],
  [2026, 1,  14, 68.00,  "Farmácia — medicamentos mensais"],
  [2026, 2,  9,  150.00, "Consulta oftalmologista"],
  [2026, 3,  25, 78.00,  "Farmácia — protetor + hidratante"],
  [2026, 4,  11, 200.00, "Exame de sangue + urina"],
  [2026, 5,  30, 48.00,  "Farmácia — vitaminas complexo B"],
  [2026, 6,  3,  130.00, "Consulta nutróloga"]
]

health_records.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "saude",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "normal",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 17. RESTAURANTE / DELIVERY — mensais
# -----------------------------------------------------------------------------
resto_amounts = [
  [2025, 5,  12, 89.00,  "iFood — jantar pizza"],
  [2025, 5,  25, 145.00, "Restaurante aniversário namorada"],
  [2025, 6,  8,  62.00,  "iFood — almoço japonês"],
  [2025, 6,  20, 110.00, "Restaurante churrasco"],
  [2025, 7,  5,  78.00,  "iFood — hambúrguer artesanal"],
  [2025, 7,  18, 92.00,  "Almoço executivo (semana trabalho)"],
  [2025, 8,  3,  130.00, "iFood — rodízio japonês"],
  [2025, 8,  28, 75.00,  "Lanche padaria + café"],
  [2025, 9,  14, 95.00,  "iFood — macarrão italiano"],
  [2025, 9,  30, 210.00, "Jantar comemorativo (promoção)"],
  [2025, 10, 11, 68.00,  "iFood — frango grelhado"],
  [2025, 10, 25, 85.00,  "Almoço self-service"],
  [2025, 11, 7,  55.00,  "iFood — açaí + wrap"],
  [2025, 11, 22, 160.00, "Churrasco família"],
  [2025, 12, 10, 98.00,  "iFood — sushi"],
  [2025, 12, 25, 340.00, "Ceia natal restaurante"],
  [2026, 1,  8,  72.00,  "iFood — refeição saudável"],
  [2026, 1,  20, 88.00,  "Almoço reunião equipe"],
  [2026, 2,  14, 280.00, "Restaurante dia dos namorados"],
  [2026, 2,  25, 65.00,  "iFood — pizza"],
  [2026, 3,  12, 90.00,  "iFood — marmita fitness"],
  [2026, 3,  28, 120.00, "Almoço cliente (trabalho)"],
  [2026, 4,  6,  55.00,  "iFood — yakisoba"],
  [2026, 4,  20, 75.00,  "Restaurante fim de semana"],
  [2026, 5,  9,  82.00,  "iFood — frutos do mar"],
  [2026, 5,  25, 95.00,  "Almoço aniversário amigo"],
  [2026, 6,  4,  68.00,  "iFood — refeição executiva"]
]

resto_amounts.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "alimentacao",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 18. ROUPAS / CALÇADOS — compras esporádicas
# -----------------------------------------------------------------------------
clothing = [
  [2025, 6,  15, 189.90, "Tênis Nike — loja física"],
  [2025, 8,  10, 249.00, "Jaqueta inverno Renner"],
  [2025, 10, 5,  98.00,  "Camisetas básicas (4 un)"],
  [2025, 11, 28, 320.00, "Conjunto social trabalho"],
  [2026, 2,  20, 159.00, "Tênis casual Adidas"],
  [2026, 4,  12, 210.00, "Roupas verão — liquidação"],
  [2026, 6,  8,  135.00, "Calça jeans + bermuda"]
]

clothing.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "vestuario",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 19. EDUCAÇÃO — cursos e assinaturas
# -----------------------------------------------------------------------------
edu = [
  [2025, 6,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 7,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 8,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 9,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 10, 1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 11, 1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 12, 1,  79.90, "Alura — assinatura anual (mensal)"],
  [2026, 1,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2026, 2,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2026, 3,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2026, 4,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2026, 5,  1,  79.90, "Alura — assinatura anual (mensal)"],
  [2025, 8,  15, 497.00, "Curso React Native — Udemy (compra única)"],
  [2026, 1,  10, 189.00, "Livros técnicos — Amazon"],
  [2026, 3,  20, 350.00, "Bootcamp Design UX — Origamid"]
]
edu_group = group("alura")

edu.each_with_index do |row, i|
  y, mo, d, amt, title = row
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "educacao",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   title.include?("Alura"),
    recurrence_type: title.include?("Alura") ? "monthly" : "none",
    group_code:  title.include?("Alura") ? edu_group : nil,
    recurrence_count: title.include?("Alura") ? (i + 1) : 1
  }
end

# -----------------------------------------------------------------------------
# 20. TRANSPORTE (Uber / Ônibus) — lançamentos mensais
# -----------------------------------------------------------------------------
transport = [
  [2025, 5,  165.00], [2025, 6,  188.00], [2025, 7,  142.00],
  [2025, 8,  210.00], [2025, 9,  155.00], [2025, 10, 178.00],
  [2025, 11, 130.00], [2025, 12, 195.00], [2026, 1,  160.00],
  [2026, 2,  148.00], [2026, 3,  172.00], [2026, 4,  155.00],
  [2026, 5,  168.00], [2026, 6,  145.00]
]

transport.each do |y, mo, amt|
  due  = Date.new(y, mo, 28)
  paid = due <= Date.today
  records_to_create << {
    title:       "Transporte (Uber + ônibus) #{Date::MONTHNAMES[mo].then { |n| n.nil? ? mo.to_s : n[0..2] }}/#{y}",
    record_type: "launch",
    flow_type:   "expense",
    category:    "transporte",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 21. PRESENTES — esporádicos
# -----------------------------------------------------------------------------
gifts = [
  [2025, 6,  10, 120.00, "Presente aniversário pai"],
  [2025, 7,  25, 85.00,  "Presente namorada — 6 meses"],
  [2025, 10, 12, 160.00, "Presente dia das crianças sobrinho"],
  [2025, 12, 20, 380.00, "Presentes Natal (família)"],
  [2026, 2,  14, 95.00,  "Presente namorada — Dia dos Namorados"],
  [2026, 5,  11, 110.00, "Presente Dia das Mães"]
]

gifts.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "lazer",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 22. VIAGEM DE FÉRIAS — Janeiro/2026 (pago em partes)
# -----------------------------------------------------------------------------
trip_group = group("viagem_jan2026")
trip_items = [
  [2025, 11, 15, 850.00,  "Passagens aéreas (ida/volta) — Natal/RN"],
  [2025, 11, 20, 1200.00, "Pousada 7 noites — Natal/RN"],
  [2026, 1,  5,  450.00,  "Passeios e atrações — Natal/RN"],
  [2026, 1,  8,  380.00,  "Alimentação e lazer viagem"],
  [2026, 1,  12, 220.00,  "Souvenirs e compras viagem"]
]

trip_items.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "lazer",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "normal",
    recurring:   false,
    recurrence_type: "none",
    group_code:  trip_group
  }
end

# -----------------------------------------------------------------------------
# 23. DESPESAS CASA — manutenção, itens domésticos
# -----------------------------------------------------------------------------
home_expenses = [
  [2025, 5,  20, 89.00,  "Lâmpadas LED + tomadas"],
  [2025, 7,  12, 250.00, "Conserto vazamento torneira"],
  [2025, 8,  5,  450.00, "Ventilador + tapete sala"],
  [2025, 9,  25, 120.00, "Produtos limpeza em quantidade"],
  [2025, 11, 8,  680.00, "Jogo de panelas + utensílios"],
  [2025, 12, 15, 320.00, "Decoração natalina"],
  [2026, 2,  10, 890.00, "Micro-ondas novo — substituição"],
  [2026, 3,  18, 155.00, "Conserto ar condicionado (limpeza)"],
  [2026, 4,  22, 95.00,  "Produtos organização — closet"],
  [2026, 6,  1,  280.00, "Cadeira de escritório nova"]
]

home_expenses.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "expense",
    category:    "moradia",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "paid" : "pending",
    priority:    "low",
    recurring:   false,
    recurrence_type: "none"
  }
end

# -----------------------------------------------------------------------------
# 24. SEGURO CELULAR — R$ 19,90/mês (a partir de Set/2025)
# -----------------------------------------------------------------------------
insurance_group = group("seguro_celular")
(0..9).each do |i|
  due  = (Date.new(2025, 9, 1) + i.months).change(day: 25)
  paid = due <= Date.today
  records_to_create << {
    title:           "Seguro Celular Samsung #{due.strftime('%b/%Y')}",
    record_type:     "debt",
    flow_type:       "expense",
    category:        "tecnologia",
    amount:          19.90,
    due_date:        due,
    paid_at:         paid ? due : nil,
    status:          paid ? "paid" : "pending",
    priority:        "low",
    recurring:       true,
    recurrence_type: "monthly",
    recurrence_count: i + 1,
    group_code:      insurance_group
  }
end

# -----------------------------------------------------------------------------
# 25. RECEITAS EXTRAS — bônus, rendimentos, cashback
# -----------------------------------------------------------------------------
extras = [
  [2025, 8,  31, 500.00,  "Bônus desempenho — Q2 empresa"],
  [2025, 12, 20, 1200.00, "13º salário (proporcional)"],
  [2026, 3,  15, 280.00,  "Restituição IR 2025"],
  [2026, 4,  10, 180.00,  "Cashback Nubank acumulado"],
  [2026, 5,  5,  350.00,  "Venda notebook antigo — Marketplace"],
  [2026, 6,  10, 420.00,  "Bônus indicação — empresa parceira"]
]

extras.each do |y, mo, d, amt, title|
  due  = Date.new(y, mo, d)
  paid = due <= Date.today
  records_to_create << {
    title:       title,
    record_type: "launch",
    flow_type:   "income",
    category:    "outros",
    amount:      amt,
    due_date:    due,
    paid_at:     paid ? due : nil,
    status:      paid ? "received" : "pending",
    priority:    "normal",
    recurring:   false,
    recurrence_type: "none"
  }
end

# Inserir todos os registros
puts "📝 Criando #{records_to_create.size} financial_records..."
records_to_create.each do |attrs|
  user.financial_records.create!(attrs.merge(
    recurring:          attrs[:recurring]          || false,
    recurrence_type:    attrs[:recurrence_type]    || "none",
    recurrence_count:   attrs[:recurrence_count]   || 1,
    installments_total: attrs[:installments_total] || 1,
    installment_number: attrs[:installment_number] || 1
  ))
end
puts "✅ #{user.financial_records.count} financial_records criados."

# =============================================================================
# FINANCIAL GOALS
# =============================================================================
puts "🎯 Criando metas financeiras..."

# META 1 — Reserva de Emergência (67% concluído)
goal_emergency = user.financial_goals.create!(
  title:          "Reserva de Emergência",
  description:    "Meta de ter 3 salários guardados para emergências",
  goal_type:      "save",
  target_amount:  10_000.00,
  current_amount: 6_700.00,
  progress_pct:   67,
  status:         "active",
  start_date:     Date.new(2025, 5, 1),
  target_date:    Date.new(2026, 12, 31),
  last_awarded_milestone: 50
)

emergency_contributions = [
  [2025, 5,  500.00,  "Primeiro aporte reserva"],
  [2025, 6,  400.00,  "Aporte mensal"],
  [2025, 7,  600.00,  "Aporte freela julho"],
  [2025, 8,  300.00,  "Aporte mensal"],
  [2025, 9,  500.00,  "Aporte mensal"],
  [2025, 10, 400.00,  "Aporte mensal"],
  [2025, 11, 700.00,  "Aporte extra — sem gastos extras"],
  [2025, 12, 300.00,  "Aporte dezembro"],
  [2026, 1,  500.00,  "Aporte janeiro"],
  [2026, 2,  400.00,  "Aporte fevereiro"],
  [2026, 3,  600.00,  "Aporte freela março"],
  [2026, 4,  500.00,  "Aporte abril"],
  [2026, 5,  400.00,  "Aporte maio"],
  [2026, 6,  100.00,  "Aporte parcial junho"]
]

emergency_contributions.each do |y, mo, amt, notes|
  goal_emergency.financial_goal_contributions.create!(
    kind:   "deposit",
    amount: amt,
    notes:  notes
  )
end

# META 2 — Quitar Cartão Nubank (40% concluído)
goal_card = user.financial_goals.create!(
  title:          "Quitar Saldo Cartão Nubank",
  description:    "Eliminar saldo devedor do Nubank e usar só no débito",
  goal_type:      "debt",
  target_amount:  3_500.00,
  current_amount: 1_400.00,
  progress_pct:   40,
  status:         "active",
  start_date:     Date.new(2025, 10, 1),
  target_date:    Date.new(2026, 9, 30),
  last_awarded_milestone: 25
)

[200, 300, 250, 200, 150, 300].each_with_index do |amt, i|
  goal_card.financial_goal_contributions.create!(
    kind:   "deposit",
    amount: amt,
    notes:  "Pagamento extra fatura #{i + 1}"
  )
end

# META 3 — Viagem Natal/RN (concluída em Janeiro/2026)
goal_trip = user.financial_goals.create!(
  title:          "Viagem Férias — Natal/RN",
  description:    "Guardar para viagem de férias em janeiro de 2026",
  goal_type:      "specific",
  target_amount:  3_100.00,
  current_amount: 3_100.00,
  progress_pct:   100,
  status:         "completed",
  start_date:     Date.new(2025, 6, 1),
  target_date:    Date.new(2026, 1, 1),
  completed_at:   Time.new(2025, 12, 30, 10, 0, 0),
  last_awarded_milestone: 100
)

trip_contribs = [400, 350, 500, 400, 450, 500, 500]
trip_contribs.each_with_index do |amt, i|
  goal_trip.financial_goal_contributions.create!(
    kind:   "deposit",
    amount: amt,
    notes:  "Aporte viagem #{i + 1}"
  )
end

# META 4 — Novo Laptop (30% concluído)
goal_laptop = user.financial_goals.create!(
  title:          "MacBook Pro M4",
  description:    "Comprar MacBook para trabalho freelancer",
  goal_type:      "specific",
  target_amount:  15_000.00,
  current_amount: 4_500.00,
  progress_pct:   30,
  status:         "active",
  start_date:     Date.new(2026, 2, 1),
  target_date:    Date.new(2026, 12, 31),
  last_awarded_milestone: 25
)

[800, 700, 900, 800, 700, 600].each_with_index do |amt, i|
  goal_laptop.financial_goal_contributions.create!(
    kind:   "deposit",
    amount: amt,
    notes:  "Poupança MacBook #{i + 1}"
  )
end

# META 5 — Fundo Educação (20% concluído)
goal_edu = user.financial_goals.create!(
  title:          "Pós-graduação em UX Design",
  description:    "Guardar para curso de pós no segundo semestre 2026",
  goal_type:      "save",
  target_amount:  8_000.00,
  current_amount: 1_600.00,
  progress_pct:   20,
  status:         "active",
  start_date:     Date.new(2026, 3, 1),
  target_date:    Date.new(2026, 7, 31),
  last_awarded_milestone: 0
)

[400, 300, 450, 450].each_with_index do |amt, i|
  goal_edu.financial_goal_contributions.create!(
    kind:   "deposit",
    amount: amt,
    notes:  "Aporte pós-graduação #{i + 1}"
  )
end

puts "✅ #{user.financial_goals.count} metas criadas com #{FinancialGoalContribution.joins(:financial_goal).where(financial_goals: { user_id: user.id }).count} contribuições."

# =============================================================================
# GAMIFICATION EVENTS
# =============================================================================
puts "🎮 Criando eventos de gamificação..."

gamification_data = [
  # Primeiros lançamentos
  { event_type: "record_created",    points: 10, created_at: Time.new(2025, 5, 1, 9, 0), metadata: { category: "salario" } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 5, 6, 8, 0), metadata: { amount: 3200 } },
  { event_type: "record_created",    points: 10, created_at: Time.new(2025, 5, 10, 10, 0), metadata: { category: "moradia" } },
  { event_type: "expense_paid",      points: 15, created_at: Time.new(2025, 5, 10, 14, 0), metadata: { amount: 950 } },
  { event_type: "goal_created",      points: 30, created_at: Time.new(2025, 5, 15, 11, 0), metadata: { goal: "Reserva de Emergência" } },
  # Junho
  { event_type: "record_created",    points: 10, created_at: Time.new(2025, 6, 1, 9, 0), metadata: {} },
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 6, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "income_received",   points: 25, created_at: Time.new(2025, 6, 20, 16, 0), metadata: { amount: 850, type: "freelancer" } },
  { event_type: "goal_created",      points: 30, created_at: Time.new(2025, 6, 1, 10, 0), metadata: { goal: "Viagem Natal" } },
  { event_type: "achievement_unlocked", points: 50, created_at: Time.new(2025, 6, 30, 23, 59), metadata: { achievement: "primeiro_mes_completo" } },
  # Julho
  { event_type: "expense_paid",      points: 15, created_at: Time.new(2025, 7, 10, 9, 0), metadata: { amount: 950 } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 7, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "income_received",   points: 35, created_at: Time.new(2025, 7, 8, 15, 0), metadata: { amount: 2500, type: "freelancer" } },
  { event_type: "goal_progress_milestone", points: 40, created_at: Time.new(2025, 7, 20, 10, 0), metadata: { goal: "Reserva de Emergência", milestone: 10 } },
  # Agosto
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 8, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "expense_paid",      points: 15, created_at: Time.new(2025, 8, 10, 9, 0), metadata: { amount: 950 } },
  { event_type: "achievement_unlocked", points: 75, created_at: Time.new(2025, 8, 31, 23, 0), metadata: { achievement: "3_meses_sem_atraso" } },
  { event_type: "income_received",   points: 30, created_at: Time.new(2025, 8, 31, 10, 0), metadata: { amount: 500, type: "bonus" } },
  # Setembro
  { event_type: "record_created",    points: 10, created_at: Time.new(2025, 9, 1, 9, 0), metadata: {} },
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 9, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "goal_progress_milestone", points: 50, created_at: Time.new(2025, 9, 25, 10, 0), metadata: { goal: "Reserva de Emergência", milestone: 25 } },
  # Outubro
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 10, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "expense_paid",      points: 15, created_at: Time.new(2025, 10, 10, 9, 0), metadata: { amount: 950 } },
  { event_type: "goal_created",      points: 30, created_at: Time.new(2025, 10, 1, 10, 0), metadata: { goal: "Quitar Nubank" } },
  { event_type: "achievement_unlocked", points: 100, created_at: Time.new(2025, 10, 31, 23, 0), metadata: { achievement: "6_meses_ativo" } },
  # Novembro
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 11, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "goal_progress_milestone", points: 50, created_at: Time.new(2025, 11, 15, 10, 0), metadata: { goal: "Reserva de Emergência", milestone: 50 } },
  { event_type: "achievement_unlocked", points: 75, created_at: Time.new(2025, 11, 30, 23, 0), metadata: { achievement: "meta_50_pct" } },
  # Dezembro
  { event_type: "income_received",   points: 20, created_at: Time.new(2025, 12, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "income_received",   points: 30, created_at: Time.new(2025, 12, 20, 10, 0), metadata: { amount: 1200, type: "decimo_terceiro" } },
  { event_type: "goal_completed",    points: 100, created_at: Time.new(2025, 12, 30, 10, 0), metadata: { goal: "Viagem Natal/RN" } },
  { event_type: "achievement_unlocked", points: 150, created_at: Time.new(2025, 12, 31, 23, 59), metadata: { achievement: "ano_completo" } },
  # 2026
  { event_type: "income_received",   points: 20, created_at: Time.new(2026, 1, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "expense_paid",      points: 15, created_at: Time.new(2026, 1, 10, 9, 0), metadata: { amount: 950 } },
  { event_type: "goal_created",      points: 30, created_at: Time.new(2026, 2, 1, 10, 0), metadata: { goal: "MacBook Pro" } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2026, 2, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "achievement_unlocked", points: 100, created_at: Time.new(2026, 2, 28, 23, 0), metadata: { achievement: "9_meses_ativo" } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2026, 3, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "goal_created",      points: 30, created_at: Time.new(2026, 3, 1, 10, 0), metadata: { goal: "Pós-graduação" } },
  { event_type: "goal_progress_milestone", points: 60, created_at: Time.new(2026, 3, 20, 10, 0), metadata: { goal: "Reserva de Emergência", milestone: 60 } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2026, 4, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "expense_paid",      points: 15, created_at: Time.new(2026, 4, 10, 9, 0), metadata: { amount: 950 } },
  { event_type: "achievement_unlocked", points: 75, created_at: Time.new(2026, 4, 30, 23, 0), metadata: { achievement: "1_ano_ativo" } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2026, 5, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "income_received",   points: 35, created_at: Time.new(2026, 5, 18, 12, 0), metadata: { amount: 2100, type: "freelancer" } },
  { event_type: "goal_progress_milestone", points: 60, created_at: Time.new(2026, 5, 25, 10, 0), metadata: { goal: "MacBook Pro", milestone: 25 } },
  { event_type: "income_received",   points: 20, created_at: Time.new(2026, 6, 5, 8, 0), metadata: { amount: 3200 } },
  { event_type: "daily_achievement_completed", points: 5, created_at: Time.new(2026, 6, 10, 8, 0), metadata: { streak: 7 } },
  { event_type: "daily_achievement_completed", points: 5, created_at: Time.new(2026, 6, 11, 8, 0), metadata: { streak: 8 } },
  { event_type: "daily_achievement_completed", points: 5, created_at: Time.new(2026, 6, 12, 8, 0), metadata: { streak: 9 } },
  { event_type: "daily_achievement_completed", points: 5, created_at: Time.new(2026, 6, 13, 8, 0), metadata: { streak: 10 } }
]

gamification_data.each do |attrs|
  meta = attrs.delete(:metadata) || {}
  created = attrs.delete(:created_at) || Time.now
  event = user.gamification_events.create!(attrs.merge(
    source_type: "User",
    source_id:   user.id,
    metadata:    meta
  ))
  event.update_columns(created_at: created, updated_at: created)
end

puts "✅ #{user.gamification_events.count} eventos de gamificação criados."

# =============================================================================
# NOTIFICATION ALERTS
# =============================================================================
puts "🔔 Criando notificações..."

notifications = [
  {
    alert_type: "overdue",
    title:      "Parcela em atraso!",
    message:    "Dívida com João — parcela 3/5 está atrasada há 5 dias. Valor: R$ 400,00",
    window_key: "overdue_amigo_202605",
    due_count:  1,
    read_at:    nil,
    metadata:   { amount: 400.00, creditor: "João" }
  },
  {
    alert_type: "overdue",
    title:      "Parcela em atraso!",
    message:    "Dívida com João — parcela 4/5 está atrasada há 3 dias. Valor: R$ 400,00",
    window_key: "overdue_amigo_202606",
    due_count:  1,
    read_at:    nil,
    metadata:   { amount: 400.00, creditor: "João" }
  },
  {
    alert_type: "near_due",
    title:      "Vencimento próximo",
    message:    "Fatura Nubank vence em 2 dias — R$ 830,00. Não perca o prazo!",
    window_key: "near_due_nubank_202506",
    due_count:  1,
    read_at:    nil,
    metadata:   { amount: 830.00, days_until: 2 }
  },
  {
    alert_type: "due_today",
    title:      "Conta vence hoje",
    message:    "Samsung Galaxy A55 — parcela 10/10 vence hoje. R$ 219,90",
    window_key: "due_today_samsung_202506",
    due_count:  1,
    read_at:    nil,
    metadata:   { amount: 219.90 }
  },
  {
    alert_type: "weekly_summary",
    title:      "Resumo da semana",
    message:    "Semana de 02/06 a 08/06: R$ 3.200,00 recebidos, R$ 1.450,00 gastos. Saldo positivo de R$ 1.750,00!",
    window_key: "weekly_202506_w1",
    due_count:  0,
    read_at:    Time.new(2026, 6, 9, 9, 0),
    metadata:   { income: 3200, expense: 1450, balance: 1750 }
  },
  {
    alert_type: "weekly_summary",
    title:      "Resumo da semana",
    message:    "Semana de 26/05 a 01/06: Você pagou 4 contas em dia! Continue assim.",
    window_key: "weekly_202506_w0",
    due_count:  4,
    read_at:    Time.new(2026, 6, 3, 10, 0),
    metadata:   { paid_count: 4 }
  },
  {
    alert_type: "daily_ai_message",
    title:      "Dica do dia",
    message:    "Você já economizou R$ 6.700 para sua reserva de emergência! Que tal manter o ritmo e chegar a 70% até julho?",
    window_key: "daily_ai_20260614",
    due_count:  0,
    read_at:    nil,
    metadata:   { theme: "constancia", goal_progress: 67 }
  },
  {
    alert_type: "near_due",
    title:      "Vencimento próximo",
    message:    "Seguro celular vence em 5 dias — R$ 19,90. Parcela 10/10.",
    window_key: "near_due_seguro_202506",
    due_count:  1,
    read_at:    nil,
    metadata:   { amount: 19.90 }
  },
  {
    alert_type: "goal_funding",
    title:      "Meta em andamento",
    message:    "Sua meta 'Reserva de Emergência' está em 67%. Adicione mais R$ 500 este mês para chegar a 72%!",
    window_key: "goal_funding_emergency_202506",
    due_count:  0,
    read_at:    Time.new(2026, 6, 12, 8, 30),
    metadata:   { goal: "Reserva de Emergência", progress: 67, suggestion: 500 }
  },
  {
    alert_type: "weekly_summary",
    title:      "Balanço mensal — Maio",
    message:    "Maio/2026 fechou positivo! Total recebido: R$ 6.720,00 | Total gasto: R$ 4.130,00 | Saldo: R$ 2.590,00",
    window_key: "monthly_summary_202505",
    due_count:  0,
    read_at:    Time.new(2026, 6, 1, 9, 0),
    metadata:   { income: 6720, expense: 4130, balance: 2590, month: "Maio/2026" }
  }
]

notifications.each do |attrs|
  user.notification_alerts.create!(attrs)
end

puts "✅ #{user.notification_alerts.count} notificações criadas."

# =============================================================================
# APP RATING
# =============================================================================
puts "⭐ Criando avaliação do app..."

AppRating.find_or_create_by!(user: user) do |r|
  r.usability_rating    = 5
  r.helpfulness_rating  = 5
  r.calendar_rating     = 4
  r.alerts_rating       = 4
  r.goals_rating        = 5
  r.reports_rating      = 4
  r.records_rating      = 5
  r.suggestions         = "App incrível! Ajudou muito a organizar minha vida financeira. Seria ótimo ter gráficos de tendência de gastos por categoria ao longo dos meses."
end

puts "✅ Avaliação criada."

# =============================================================================
# ANALYTICS EVENTS
# =============================================================================
puts "📊 Criando eventos de analytics..."

session_ids = (1..10).map { |i| "seed_session_#{SecureRandom.hex(8)}" }

analytics = [
  { event_name: "login_success",      screen: "login",   session_id: session_ids[0], created_at: Time.new(2025, 5, 1, 9, 0) },
  { event_name: "onboarding_completed", screen: "onboarding", session_id: session_ids[0], created_at: Time.new(2025, 5, 1, 9, 5) },
  { event_name: "record_created",     screen: "records", session_id: session_ids[0], created_at: Time.new(2025, 5, 1, 9, 10) },
  { event_name: "app_opened",         screen: "home",    session_id: session_ids[1], created_at: Time.new(2025, 6, 1, 8, 0) },
  { event_name: "login_success",      screen: "login",   session_id: session_ids[1], created_at: Time.new(2025, 6, 1, 8, 1) },
  { event_name: "goal_created",       screen: "goals",   session_id: session_ids[1], created_at: Time.new(2025, 6, 1, 8, 10) },
  { event_name: "reports_viewed",     screen: "reports", session_id: session_ids[2], created_at: Time.new(2025, 8, 15, 20, 0) },
  { event_name: "app_opened",         screen: "home",    session_id: session_ids[3], created_at: Time.new(2025, 10, 1, 9, 0) },
  { event_name: "login_success",      screen: "login",   session_id: session_ids[3], created_at: Time.new(2025, 10, 1, 9, 1) },
  { event_name: "record_paid_or_received", screen: "records", session_id: session_ids[3], created_at: Time.new(2025, 10, 5, 9, 5) },
  { event_name: "reports_viewed",     screen: "reports", session_id: session_ids[4], created_at: Time.new(2025, 12, 31, 22, 0) },
  { event_name: "goal_created",       screen: "goals",   session_id: session_ids[5], created_at: Time.new(2026, 2, 1, 10, 0) },
  { event_name: "app_opened",         screen: "home",    session_id: session_ids[6], created_at: Time.new(2026, 3, 1, 8, 0) },
  { event_name: "login_success",      screen: "login",   session_id: session_ids[6], created_at: Time.new(2026, 3, 1, 8, 1) },
  { event_name: "record_created",     screen: "records", session_id: session_ids[6], created_at: Time.new(2026, 3, 5, 9, 0) },
  { event_name: "reports_viewed",     screen: "reports", session_id: session_ids[7], created_at: Time.new(2026, 4, 30, 21, 0) },
  { event_name: "app_opened",         screen: "home",    session_id: session_ids[8], created_at: Time.new(2026, 6, 13, 8, 0) },
  { event_name: "login_success",      screen: "login",   session_id: session_ids[8], created_at: Time.new(2026, 6, 13, 8, 1) },
  { event_name: "record_paid_or_received", screen: "records", session_id: session_ids[8], created_at: Time.new(2026, 6, 13, 8, 5) },
  { event_name: "reports_viewed",     screen: "reports", session_id: session_ids[9], created_at: Time.new(2026, 6, 14, 7, 30) }
]

analytics.each do |attrs|
  created = attrs.delete(:created_at)
  ev = user.analytics_events.create!(attrs.merge(metadata: {}))
  ev.update_columns(created_at: created, updated_at: created)
end

puts "✅ #{user.analytics_events.count} eventos de analytics criados."

# =============================================================================
# SUMMARY
# =============================================================================
total_income  = user.financial_records.where(flow_type: "income", status: "received").sum(:amount)
total_expense = user.financial_records.where(flow_type: "expense", status: "paid").sum(:amount)
xp_total      = user.gamification_events.sum(:points)

puts ""
puts "🎉 =============================================="
puts "   SEED CONCLUÍDO — Conta Demo unirios"
puts "   Email: unirios@demo.com | Senha: 1234"
puts "================================================"
puts "   📝 Financial Records:   #{user.financial_records.count}"
puts "   🎯 Metas:               #{user.financial_goals.count}"
puts "   💰 Contribuições:       #{FinancialGoalContribution.joins(:financial_goal).where(financial_goals: { user_id: user.id }).count}"
puts "   🎮 Eventos XP:          #{user.gamification_events.count} (#{xp_total} XP)"
puts "   🔔 Notificações:        #{user.notification_alerts.count}"
puts "   📊 Analytics:           #{user.analytics_events.count}"
puts "   ⭐ App Rating:          1"
puts "   💵 Total Recebido:      R$ #{format('%.2f', total_income)}"
puts "   💸 Total Pago:          R$ #{format('%.2f', total_expense)}"
puts "================================================"
