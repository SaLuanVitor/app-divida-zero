# frozen_string_literal: true

# Cria/atualiza conta demo UniriosDemo com ~18 meses de histórico financeiro
# (Mai/2025 → Out/2026, incluindo meses futuros com registros pendentes).
# Padrão idêntico ao AdminBootstrapService — chamável via rake app:seed_demo.
class DemoSeedService
  class SeedError < StandardError; end

  def self.call!
    new.call!
  end

  def call!
    return false if Rails.env.test?

    user = find_or_create_user!
    create_financial_records!(user)
    create_financial_goals!(user)
    create_gamification_events!(user)
    create_app_rating!(user)
    create_analytics_events!(user)
    refresh_notifications!(user)
    print_summary(user)
    true
  end

  private

  # ---------------------------------------------------------------------------
  # USER
  # ---------------------------------------------------------------------------
  def find_or_create_user!
    user = User.find_by(email: "unirios_demo") || User.find_by(email: "unirios@demo.com")

    if user
      user.update_columns(
        email:           "unirios_demo",
        name:            "UniriosDemo",
        password_digest: BCrypt::Password.create("1234")
      )
      puts "👤 Usuário existente atualizado — login: unirios_demo / senha: 1234"
    else
      user = User.new(
        email:             "unirios_demo",
        name:              "UniriosDemo",
        password:          "1234",
        role:              "user",
        active:            true,
        profile_icon_key:  "icon_03",
        profile_frame_key: "frame_02"
      )
      user.save!(validate: false)
      puts "👤 Usuário criado — login: unirios_demo / senha: 1234"
    end

    puts "🔐 Auth check: #{user.authenticate('1234') ? 'OK' : 'FALHOU'}"
    user
  end

  # ---------------------------------------------------------------------------
  # HELPERS
  # ---------------------------------------------------------------------------
  # Mai/2025 → Out/2026 = 18 meses (índices 0..17)
  def months
    @months ||= (0..17).map { |i| Date.new(2025, 5, 1) + i.months }
  end

  def grp(prefix)
    "#{prefix}_#{SecureRandom.hex(4)}"
  end

  # ---------------------------------------------------------------------------
  # FINANCIAL RECORDS
  # ---------------------------------------------------------------------------
  def create_financial_records!(user)
    recs = []
    recs.concat build_salary
    recs.concat build_freelancers
    recs.concat build_rent
    recs.concat build_credit_card
    recs.concat build_grocery
    recs.concat build_energy
    recs.concat build_water
    recs.concat build_internet
    recs.concat build_gym
    recs.concat build_netflix
    recs.concat build_spotify
    recs.concat build_notebook
    recs.concat build_phone
    recs.concat build_friend_debt
    recs.concat build_fuel
    recs.concat build_health
    recs.concat build_restaurant
    recs.concat build_clothing
    recs.concat build_education
    recs.concat build_transport
    recs.concat build_gifts
    recs.concat build_trip
    recs.concat build_home_expenses
    recs.concat build_phone_insurance
    recs.concat build_extra_income
    recs.concat build_future_extras

    puts "📝 Sincronizando #{recs.size} registros financeiros (aditivo)..."
    created = 0
    recs.each do |attrs|
      full_attrs = attrs.merge(
        recurring:          attrs[:recurring]          || false,
        recurrence_type:    attrs[:recurrence_type]    || "none",
        recurrence_count:   attrs[:recurrence_count]   || 1,
        installments_total: attrs[:installments_total] || 1,
        installment_number: attrs[:installment_number] || 1
      )
      record = user.financial_records.find_or_initialize_by(
        title:    full_attrs[:title],
        due_date: full_attrs[:due_date]
      )
      next unless record.new_record?
      record.assign_attributes(full_attrs)
      record.save!
      created += 1
    end
    puts "✅ #{created} novos registros criados (#{user.financial_records.count} total)."
  end

  # Salário: Mai/2025 → Set/2026 (17 meses)
  def build_salary
    g = grp("salario")
    months[0..16].map.with_index do |m, i|
      due  = m.change(day: 5)
      paid = due <= Date.today
      { title: "Salário #{due.strftime('%b/%Y')}", record_type: "launch", flow_type: "income",
        category: "salario", amount: 3200.00, due_date: due,
        paid_at: paid ? (due - rand(0..2).days) : nil,
        status: paid ? "received" : "pending", priority: "high",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1,
        group_code: g, notes: "Salário mensal empresa Unirios Ltda" }
    end
  end

  # Freelancers históricos + futuros
  def build_freelancers
    data = [
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
      { month: months[13], day: 18, amount: 900.00,  title: "Freela — Mentoria React Native (4h)" },
      { month: months[14], day: 10, amount: 2800.00, title: "Freela — App delivery (MVP)" },
      { month: months[15], day: 22, amount: 1500.00, title: "Freela — Painel administrativo React" }
    ]
    data.map do |f|
      due  = f[:month].change(day: f[:day])
      paid = due <= Date.today
      { title: f[:title], record_type: "launch", flow_type: "income", category: "freelancer",
        amount: f[:amount], due_date: due, paid_at: paid ? (due + rand(1..7).days) : nil,
        status: paid ? "received" : "pending", priority: "normal",
        recurring: false, recurrence_type: "none" }
    end
  end

  # Aluguel: Mai/2025 → Set/2026 (17 meses)
  def build_rent
    g = grp("aluguel")
    months[0..16].map.with_index do |m, i|
      due  = m.change(day: 10)
      paid = due <= Date.today
      { title: "Aluguel #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: 950.00, due_date: due,
        paid_at: paid ? (due - rand(0..3).days) : nil,
        status: paid ? "paid" : "pending", priority: "high",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1,
        group_code: g, notes: "Aluguel apartamento — Rua das Flores, 120" }
    end
  end

  # Fatura Nubank: Mai/2025 → Out/2026 (18 meses)
  def build_credit_card
    faturas = [
      { month: months[0],  day: 15, amount: 1250.00 }, { month: months[1],  day: 15, amount: 980.00 },
      { month: months[2],  day: 15, amount: 1870.00 }, { month: months[3],  day: 15, amount: 720.00 },
      { month: months[4],  day: 15, amount: 2100.00 }, { month: months[5],  day: 15, amount: 640.00 },
      { month: months[6],  day: 15, amount: 1380.00 }, { month: months[7],  day: 15, amount: 1650.00 },
      { month: months[8],  day: 15, amount: 890.00 },  { month: months[9],  day: 15, amount: 1100.00 },
      { month: months[10], day: 15, amount: 2200.00 }, { month: months[11], day: 15, amount: 760.00 },
      { month: months[12], day: 15, amount: 1490.00 }, { month: months[13], day: 15, amount: 830.00 },
      { month: months[14], day: 15, amount: 1120.00 }, { month: months[15], day: 15, amount: 1450.00 },
      { month: months[16], day: 15, amount: 980.00 },  { month: months[17], day: 15, amount: 1300.00 }
    ]
    faturas.map.with_index do |f, i|
      due  = f[:month].change(day: f[:day])
      paid = due < Date.today - 5.days
      { title: "Fatura Nubank #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "cartao_credito", amount: f[:amount], due_date: due,
        paid_at: paid ? (due - rand(1..5).days) : nil,
        status: paid ? "paid" : "pending", priority: i >= 12 ? "high" : "normal",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1,
        group_code: grp("nubank_fatura") }
    end
  end

  # Mercado: Mai/2025 → Out/2026 (18 meses)
  def build_grocery
    amounts = [420, 510, 380, 620, 490, 560, 430, 680, 390, 470, 540, 600, 415, 355, 480, 520, 395, 445]
    g = grp("mercado")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 20)
      paid = due <= Date.today
      { title: "Supermercado #{due.strftime('%b/%Y')}", record_type: "launch", flow_type: "expense",
        category: "alimentacao", amount: amounts[i].to_f, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending", priority: "normal",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  # Energia: Mai/2025 → Out/2026 (18 meses)
  def build_energy
    vals = [130, 145, 220, 190, 115, 155, 168, 210, 140, 175, 195, 122, 160, 138, 148, 205, 172, 135]
    g = grp("energia")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 8)
      paid = due <= Date.today
      { title: "Energia Elétrica #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: vals[i].to_f, due_date: due,
        paid_at: paid ? (due - rand(0..2).days) : nil,
        status: paid ? "paid" : "pending", priority: "normal",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  # Água: Mai/2025 → Out/2026 (18 meses)
  def build_water
    vals = [65, 72, 58, 88, 61, 75, 69, 90, 55, 80, 73, 66, 85, 59, 70, 78, 63, 82]
    g = grp("agua")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 12)
      paid = due <= Date.today
      { title: "Conta de Água #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: vals[i].to_f, due_date: due,
        paid_at: paid ? (due - rand(0..1).days) : nil,
        status: paid ? "paid" : "pending", priority: "normal",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  # Internet: Mai/2025 → Out/2026 (18 meses)
  def build_internet
    g = grp("internet")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 18)
      paid = due <= Date.today
      { title: "Internet #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: 99.90, due_date: due,
        paid_at: paid ? (due - 1.day) : nil,
        status: paid ? "paid" : "pending", priority: "normal",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  # Academia: Mai/2025 → Out/2026 (18 meses)
  def build_gym
    g = grp("academia")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 1)
      paid = due <= Date.today
      { title: "Academia #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "saude", amount: 89.00, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending", priority: "low",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  # Netflix: Mai/2025 → Out/2026 (18 meses)
  def build_netflix
    g = grp("netflix")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 22)
      paid = due <= Date.today
      { title: "Netflix #{due.strftime('%b/%Y')}", record_type: "launch", flow_type: "expense",
        category: "lazer", amount: 39.90, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending", priority: "low",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  # Spotify: Mai/2025 → Out/2026 (18 meses)
  def build_spotify
    g = grp("spotify")
    months[0..17].map.with_index do |m, i|
      due  = m.change(day: 22)
      paid = due <= Date.today
      { title: "Spotify #{due.strftime('%b/%Y')}", record_type: "launch", flow_type: "expense",
        category: "lazer", amount: 21.90, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending", priority: "low",
        recurring: true, recurrence_type: "monthly", recurrence_count: i + 1, group_code: g }
    end
  end

  def build_notebook
    g = grp("notebook_dell")
    (1..12).map do |i|
      due  = (Date.new(2025, 7, 1) + (i - 1).months).change(day: 20)
      paid = due <= Date.today
      { title: "Notebook Dell Inspiron — #{i}/12", record_type: "debt", flow_type: "expense",
        category: "tecnologia", amount: 318.25, due_date: due,
        paid_at: paid ? (due - rand(0..3).days) : nil,
        status: paid ? "paid" : "pending", priority: "normal",
        recurring: false, recurrence_type: "none",
        installments_total: 12, installment_number: i, group_code: g,
        notes: "Dell Inspiron 15 — R$ 3.819,00 parcelado em 12x" }
    end
  end

  def build_phone
    g = grp("celular_samsung")
    (1..10).map do |i|
      due  = (Date.new(2025, 9, 1) + (i - 1).months).change(day: 25)
      paid = due <= Date.today
      { title: "Samsung Galaxy A55 — #{i}/10", record_type: "debt", flow_type: "expense",
        category: "tecnologia", amount: 219.90, due_date: due,
        paid_at: paid ? (due - rand(0..2).days) : nil,
        status: paid ? "paid" : "pending", priority: "normal",
        recurring: false, recurrence_type: "none",
        installments_total: 10, installment_number: i, group_code: g,
        notes: "Samsung Galaxy A55 5G — R$ 2.199,00 parcelado em 10x" }
    end
  end

  def build_friend_debt
    g = grp("divida_amigo")
    (1..5).map do |i|
      due     = (Date.new(2025, 12, 1) + (i - 1).months).change(day: 10)
      paid    = i <= 2
      overdue = !paid && due < Date.today
      { title: "Dívida — João (amigo) #{i}/5", record_type: "debt", flow_type: "expense",
        category: "divida_pessoal", amount: 400.00, due_date: due,
        paid_at: paid ? (due - 1.day) : nil,
        status: paid ? "paid" : "pending",
        priority: overdue ? "high" : "normal",
        recurring: false, recurrence_type: "none",
        installments_total: 5, installment_number: i, group_code: g,
        notes: overdue ? "ATRASADO — combinar nova data com João" : nil }
    end
  end

  def build_fuel
    data = [
      [2025, 5, 8, 180.00], [2025, 5, 22, 160.00], [2025, 6, 5, 195.00], [2025, 6, 19, 170.00],
      [2025, 7, 10, 185.00], [2025, 7, 25, 155.00], [2025, 8, 7, 200.00], [2025, 8, 21, 165.00],
      [2025, 9, 4, 175.00], [2025, 9, 18, 190.00], [2025, 10, 2, 180.00], [2025, 10, 16, 160.00],
      [2025, 11, 6, 195.00], [2025, 11, 20, 145.00], [2025, 12, 3, 185.00], [2025, 12, 18, 170.00],
      [2026, 1, 8, 200.00], [2026, 1, 22, 155.00], [2026, 2, 5, 180.00], [2026, 2, 20, 165.00],
      [2026, 3, 6, 190.00], [2026, 3, 21, 175.00], [2026, 4, 4, 185.00], [2026, 4, 18, 160.00],
      [2026, 5, 2, 195.00], [2026, 5, 16, 170.00], [2026, 6, 5, 180.00],
      [2026, 7, 3, 188.00], [2026, 7, 18, 165.00],
      [2026, 8, 7, 195.00], [2026, 8, 22, 172.00],
      [2026, 9, 5, 180.00], [2026, 9, 19, 160.00]
    ]
    data.map do |y, mo, d, amt|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: "Combustível — Posto Shell", record_type: "launch", flow_type: "expense",
        category: "transporte", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: false, recurrence_type: "none" }
    end
  end

  def build_health
    data = [
      [2025, 5, 15, 45.80, "Farmácia — remédios gripe"],
      [2025, 6, 22, 120.00, "Consulta médico clínico geral"],
      [2025, 7, 8, 38.50, "Farmácia — protetor solar + vitaminas"],
      [2025, 8, 30, 250.00, "Exames laboratoriais"],
      [2025, 9, 12, 55.00, "Farmácia — antibiótico"],
      [2025, 10, 5, 180.00, "Consulta dermatologista"],
      [2025, 11, 18, 42.00, "Farmácia — suplemento vitamina D"],
      [2025, 12, 20, 320.00, "Dentista — limpeza + radiografia"],
      [2026, 1, 14, 68.00, "Farmácia — medicamentos mensais"],
      [2026, 2, 9, 150.00, "Consulta oftalmologista"],
      [2026, 3, 25, 78.00, "Farmácia — protetor + hidratante"],
      [2026, 4, 11, 200.00, "Exame de sangue + urina"],
      [2026, 5, 30, 48.00, "Farmácia — vitaminas complexo B"],
      [2026, 6, 3, 130.00, "Consulta nutróloga"],
      [2026, 7, 15, 85.00, "Farmácia — protetor solar FPS 70"],
      [2026, 8, 20, 220.00, "Dentista — restauração"],
      [2026, 9, 10, 55.00, "Farmácia — medicamentos mensais"]
    ]
    data.map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "expense",
        category: "saude", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "normal", recurring: false, recurrence_type: "none" }
    end
  end

  def build_restaurant
    data = [
      [2025, 5, 12, 89.00, "iFood — jantar pizza"], [2025, 5, 25, 145.00, "Restaurante aniversário namorada"],
      [2025, 6, 8, 62.00, "iFood — almoço japonês"], [2025, 6, 20, 110.00, "Restaurante churrasco"],
      [2025, 7, 5, 78.00, "iFood — hambúrguer artesanal"], [2025, 7, 18, 92.00, "Almoço executivo (semana trabalho)"],
      [2025, 8, 3, 130.00, "iFood — rodízio japonês"], [2025, 8, 28, 75.00, "Lanche padaria + café"],
      [2025, 9, 14, 95.00, "iFood — macarrão italiano"], [2025, 9, 30, 210.00, "Jantar comemorativo (promoção)"],
      [2025, 10, 11, 68.00, "iFood — frango grelhado"], [2025, 10, 25, 85.00, "Almoço self-service"],
      [2025, 11, 7, 55.00, "iFood — açaí + wrap"], [2025, 11, 22, 160.00, "Churrasco família"],
      [2025, 12, 10, 98.00, "iFood — sushi"], [2025, 12, 25, 340.00, "Ceia natal restaurante"],
      [2026, 1, 8, 72.00, "iFood — refeição saudável"], [2026, 1, 20, 88.00, "Almoço reunião equipe"],
      [2026, 2, 14, 280.00, "Restaurante dia dos namorados"], [2026, 2, 25, 65.00, "iFood — pizza"],
      [2026, 3, 12, 90.00, "iFood — marmita fitness"], [2026, 3, 28, 120.00, "Almoço cliente (trabalho)"],
      [2026, 4, 6, 55.00, "iFood — yakisoba"], [2026, 4, 20, 75.00, "Restaurante fim de semana"],
      [2026, 5, 9, 82.00, "iFood — frutos do mar"], [2026, 5, 25, 95.00, "Almoço aniversário amigo"],
      [2026, 6, 4, 68.00, "iFood — refeição executiva"],
      [2026, 7, 11, 88.00, "iFood — hambúrguer premium"], [2026, 7, 26, 115.00, "Restaurante com família"],
      [2026, 8, 8, 72.00, "iFood — marmita fitness"], [2026, 8, 23, 95.00, "Almoço reunião cliente"],
      [2026, 9, 12, 80.00, "iFood — japonês"], [2026, 9, 27, 130.00, "Jantar comemorativo"]
    ]
    data.map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "expense",
        category: "alimentacao", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: false, recurrence_type: "none" }
    end
  end

  def build_clothing
    data = [
      [2025, 6, 15, 189.90, "Tênis Nike — loja física"], [2025, 8, 10, 249.00, "Jaqueta inverno Renner"],
      [2025, 10, 5, 98.00, "Camisetas básicas (4 un)"], [2025, 11, 28, 320.00, "Conjunto social trabalho"],
      [2026, 2, 20, 159.00, "Tênis casual Adidas"], [2026, 4, 12, 210.00, "Roupas verão — liquidação"],
      [2026, 6, 8, 135.00, "Calça jeans + bermuda"],
      [2026, 7, 20, 180.00, "Roupas de frio — inverno"],
      [2026, 8, 15, 225.00, "Tênis corrida — treinos"],
      [2026, 9, 5, 95.00, "Camisetas básicas (3 un)"]
    ]
    data.map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "expense",
        category: "vestuario", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: false, recurrence_type: "none" }
    end
  end

  def build_education
    alura_g = grp("alura")
    data = [
      [2025, 6, 1, 79.90, "Alura — assinatura anual (mensal)"], [2025, 7, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2025, 8, 1, 79.90, "Alura — assinatura anual (mensal)"], [2025, 9, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2025, 10, 1, 79.90, "Alura — assinatura anual (mensal)"], [2025, 11, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2025, 12, 1, 79.90, "Alura — assinatura anual (mensal)"], [2026, 1, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2026, 2, 1, 79.90, "Alura — assinatura anual (mensal)"], [2026, 3, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2026, 4, 1, 79.90, "Alura — assinatura anual (mensal)"], [2026, 5, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2026, 6, 1, 79.90, "Alura — assinatura anual (mensal)"], [2026, 7, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2026, 8, 1, 79.90, "Alura — assinatura anual (mensal)"], [2026, 9, 1, 79.90, "Alura — assinatura anual (mensal)"],
      [2025, 8, 15, 497.00, "Curso React Native — Udemy (compra única)"],
      [2026, 1, 10, 189.00, "Livros técnicos — Amazon"],
      [2026, 3, 20, 350.00, "Bootcamp Design UX — Origamid"],
      [2026, 8, 10, 890.00, "Pós-graduação UX Design — 1ª parcela"]
    ]
    data.map.with_index do |row, i|
      y, mo, d, amt, title = row
      due    = Date.new(y, mo, d)
      paid   = due <= Date.today
      alura  = title.include?("Alura")
      { title: title, record_type: "launch", flow_type: "expense",
        category: "educacao", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: alura, recurrence_type: alura ? "monthly" : "none",
        group_code: alura ? alura_g : nil, recurrence_count: alura ? (i + 1) : 1 }
    end
  end

  def build_transport
    data = [
      [2025, 5, 165.00], [2025, 6, 188.00], [2025, 7, 142.00], [2025, 8, 210.00],
      [2025, 9, 155.00], [2025, 10, 178.00], [2025, 11, 130.00], [2025, 12, 195.00],
      [2026, 1, 160.00], [2026, 2, 148.00], [2026, 3, 172.00], [2026, 4, 155.00],
      [2026, 5, 168.00], [2026, 6, 145.00],
      [2026, 7, 175.00], [2026, 8, 162.00], [2026, 9, 155.00]
    ]
    data.map do |y, mo, amt|
      due  = Date.new(y, mo, 28)
      paid = due <= Date.today
      mn   = Date::MONTHNAMES[mo] || mo.to_s
      { title: "Transporte (Uber + ônibus) #{mn[0..2]}/#{y}", record_type: "launch", flow_type: "expense",
        category: "transporte", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: false, recurrence_type: "none" }
    end
  end

  def build_gifts
    data = [
      [2025, 6, 10, 120.00, "Presente aniversário pai"], [2025, 7, 25, 85.00, "Presente namorada — 6 meses"],
      [2025, 10, 12, 160.00, "Presente dia das crianças sobrinho"], [2025, 12, 20, 380.00, "Presentes Natal (família)"],
      [2026, 2, 14, 95.00, "Presente namorada — Dia dos Namorados"], [2026, 5, 11, 110.00, "Presente Dia das Mães"],
      [2026, 8, 5, 150.00, "Presente aniversário namorada"], [2026, 9, 15, 90.00, "Presente amigo — chá de bebê"]
    ]
    data.map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "expense",
        category: "lazer", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: false, recurrence_type: "none" }
    end
  end

  def build_trip
    g = grp("viagem_jan2026")
    [
      [2025, 11, 15, 850.00,  "Passagens aéreas (ida/volta) — Natal/RN"],
      [2025, 11, 20, 1200.00, "Pousada 7 noites — Natal/RN"],
      [2026, 1, 5,  450.00,   "Passeios e atrações — Natal/RN"],
      [2026, 1, 8,  380.00,   "Alimentação e lazer viagem"],
      [2026, 1, 12, 220.00,   "Souvenirs e compras viagem"]
    ].map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "expense",
        category: "lazer", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "normal", recurring: false, recurrence_type: "none", group_code: g }
    end
  end

  def build_home_expenses
    data = [
      [2025, 5, 20, 89.00, "Lâmpadas LED + tomadas"], [2025, 7, 12, 250.00, "Conserto vazamento torneira"],
      [2025, 8, 5, 450.00, "Ventilador + tapete sala"], [2025, 9, 25, 120.00, "Produtos limpeza em quantidade"],
      [2025, 11, 8, 680.00, "Jogo de panelas + utensílios"], [2025, 12, 15, 320.00, "Decoração natalina"],
      [2026, 2, 10, 890.00, "Micro-ondas novo — substituição"],
      [2026, 3, 18, 155.00, "Conserto ar condicionado (limpeza)"],
      [2026, 4, 22, 95.00, "Produtos organização — closet"],
      [2026, 6, 1, 280.00, "Cadeira de escritório nova"],
      [2026, 7, 10, 340.00, "Cobertor + roupa de cama inverno"],
      [2026, 8, 25, 520.00, "Prateleiras + organização quarto"],
      [2026, 9, 8, 180.00, "Produtos de limpeza + organização"]
    ]
    data.map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "expense",
        category: "moradia", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: false, recurrence_type: "none" }
    end
  end

  # Seguro celular: Set/2025 → Jun/2026 (10 meses)
  def build_phone_insurance
    g = grp("seguro_celular")
    (0..9).map do |i|
      due  = (Date.new(2025, 9, 1) + i.months).change(day: 25)
      paid = due <= Date.today
      { title: "Seguro Celular Samsung #{due.strftime('%b/%Y')}", record_type: "debt", flow_type: "expense",
        category: "tecnologia", amount: 19.90, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "paid" : "pending",
        priority: "low", recurring: true, recurrence_type: "monthly",
        recurrence_count: i + 1, group_code: g }
    end
  end

  def build_extra_income
    data = [
      [2025, 8, 31, 500.00,  "Bônus desempenho — Q2 empresa"],
      [2025, 12, 20, 1200.00, "13º salário (proporcional)"],
      [2026, 3, 15, 280.00,  "Restituição IR 2025"],
      [2026, 4, 10, 180.00,  "Cashback Nubank acumulado"],
      [2026, 5, 5,  350.00,  "Venda notebook antigo — Marketplace"],
      [2026, 6, 10, 420.00,  "Bônus indicação — empresa parceira"]
    ]
    data.map do |y, mo, d, amt, title|
      due  = Date.new(y, mo, d)
      paid = due <= Date.today
      { title: title, record_type: "launch", flow_type: "income",
        category: "outros", amount: amt, due_date: due,
        paid_at: paid ? due : nil, status: paid ? "received" : "pending",
        priority: "normal", recurring: false, recurrence_type: "none" }
    end
  end

  # Despesas e receitas futuras específicas
  def build_future_extras
    data = [
      # IPTU parcelado Jul/2026
      { title: "IPTU 2026 — parcela 1/5", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: 320.00, due_date: Date.new(2026, 7, 10),
        status: "pending", priority: "high", recurring: false, recurrence_type: "none",
        installments_total: 5, installment_number: 1, group_code: grp("iptu_2026"),
        notes: "IPTU parcelado em 5x" },
      { title: "IPTU 2026 — parcela 2/5", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: 320.00, due_date: Date.new(2026, 8, 10),
        status: "pending", priority: "normal", recurring: false, recurrence_type: "none",
        installments_total: 5, installment_number: 2, group_code: grp("iptu_2026"),
        notes: "IPTU parcelado em 5x" },
      { title: "IPTU 2026 — parcela 3/5", record_type: "debt", flow_type: "expense",
        category: "moradia", amount: 320.00, due_date: Date.new(2026, 9, 10),
        status: "pending", priority: "normal", recurring: false, recurrence_type: "none",
        installments_total: 5, installment_number: 3, group_code: grp("iptu_2026"),
        notes: "IPTU parcelado em 5x" },
      # Bônus de meta Jul/2026
      { title: "Bônus desempenho — Q2 2026", record_type: "launch", flow_type: "income",
        category: "outros", amount: 700.00, due_date: Date.new(2026, 7, 31),
        status: "pending", priority: "normal", recurring: false, recurrence_type: "none" },
      # 13º salário Dez/2026 (previsto)
      { title: "13º salário 2026 (previsto)", record_type: "launch", flow_type: "income",
        category: "salario", amount: 1600.00, due_date: Date.new(2026, 12, 20),
        status: "pending", priority: "high", recurring: false, recurrence_type: "none",
        notes: "Estimativa proporcional 13º" },
      # Viagem de férias Jul/2026 planejada
      { title: "Passagens Gramado — Jul/2026", record_type: "launch", flow_type: "expense",
        category: "lazer", amount: 680.00, due_date: Date.new(2026, 7, 5),
        status: "pending", priority: "normal", recurring: false, recurrence_type: "none",
        group_code: grp("viagem_jul2026") },
      { title: "Hospedagem Gramado — 4 noites", record_type: "launch", flow_type: "expense",
        category: "lazer", amount: 1200.00, due_date: Date.new(2026, 7, 8),
        status: "pending", priority: "normal", recurring: false, recurrence_type: "none",
        group_code: grp("viagem_jul2026") },
      # Manutenção preventiva carro Set/2026
      { title: "Revisão carro — 60.000 km", record_type: "launch", flow_type: "expense",
        category: "transporte", amount: 890.00, due_date: Date.new(2026, 9, 20),
        status: "pending", priority: "normal", recurring: false, recurrence_type: "none",
        notes: "Revisão preventiva programada" }
    ]
    data.map { |attrs| { paid_at: nil }.merge(attrs) }
  end

  # ---------------------------------------------------------------------------
  # FINANCIAL GOALS
  # ---------------------------------------------------------------------------
  def create_financial_goals!(user)
    return puts "🎯 Metas já existem (#{user.financial_goals.count}) — pulando." if user.financial_goals.count >= 5

    puts "🎯 Criando metas financeiras..."

    g1 = user.financial_goals.find_or_create_by!(title: "Reserva de Emergência") do |g|
      g.description = "Meta de ter 3 salários guardados para emergências"
      g.goal_type = "save"; g.target_amount = 10_000.00; g.current_amount = 6_700.00
      g.progress_pct = 67; g.status = "active"
      g.start_date = Date.new(2025, 5, 1); g.target_date = Date.new(2026, 12, 31)
      g.last_awarded_milestone = 50
    end
    if g1.financial_goal_contributions.empty?
      [
        [500.00, "Primeiro aporte reserva"], [400.00, "Aporte mensal"],
        [600.00, "Aporte freela julho"], [300.00, "Aporte mensal"],
        [500.00, "Aporte mensal"], [400.00, "Aporte mensal"],
        [700.00, "Aporte extra — sem gastos extras"], [300.00, "Aporte dezembro"],
        [500.00, "Aporte janeiro"], [400.00, "Aporte fevereiro"],
        [600.00, "Aporte freela março"], [500.00, "Aporte abril"],
        [400.00, "Aporte maio"], [100.00, "Aporte parcial junho"]
      ].each { |amt, notes| g1.financial_goal_contributions.create!(kind: "deposit", amount: amt, notes: notes) }
    end

    g2 = user.financial_goals.find_or_create_by!(title: "Quitar Saldo Cartão Nubank") do |g|
      g.description = "Eliminar saldo devedor do Nubank e usar só no débito"
      g.goal_type = "debt"; g.target_amount = 3_500.00; g.current_amount = 1_400.00
      g.progress_pct = 40; g.status = "active"
      g.start_date = Date.new(2025, 10, 1); g.target_date = Date.new(2026, 9, 30)
      g.last_awarded_milestone = 25
    end
    if g2.financial_goal_contributions.empty?
      [200, 300, 250, 200, 150, 300].each_with_index do |amt, i|
        g2.financial_goal_contributions.create!(kind: "deposit", amount: amt, notes: "Pagamento extra fatura #{i + 1}")
      end
    end

    g3 = user.financial_goals.find_or_create_by!(title: "Viagem Férias — Natal/RN") do |g|
      g.description = "Guardar para viagem de férias em janeiro de 2026"
      g.goal_type = "specific"; g.target_amount = 3_100.00; g.current_amount = 3_100.00
      g.progress_pct = 100; g.status = "completed"
      g.start_date = Date.new(2025, 6, 1); g.target_date = Date.new(2026, 1, 1)
      g.completed_at = Time.new(2025, 12, 30, 10, 0, 0); g.last_awarded_milestone = 100
    end
    if g3.financial_goal_contributions.empty?
      [400, 350, 500, 400, 450, 500, 500].each_with_index do |amt, i|
        g3.financial_goal_contributions.create!(kind: "deposit", amount: amt, notes: "Aporte viagem #{i + 1}")
      end
    end

    g4 = user.financial_goals.find_or_create_by!(title: "MacBook Pro M4") do |g|
      g.description = "Comprar MacBook para trabalho freelancer"
      g.goal_type = "specific"; g.target_amount = 15_000.00; g.current_amount = 4_500.00
      g.progress_pct = 30; g.status = "active"
      g.start_date = Date.new(2026, 2, 1); g.target_date = Date.new(2026, 12, 31)
      g.last_awarded_milestone = 25
    end
    if g4.financial_goal_contributions.empty?
      [800, 700, 900, 800, 700, 600].each_with_index do |amt, i|
        g4.financial_goal_contributions.create!(kind: "deposit", amount: amt, notes: "Poupança MacBook #{i + 1}")
      end
    end

    g5 = user.financial_goals.find_or_create_by!(title: "Pós-graduação em UX Design") do |g|
      g.description = "Guardar para curso de pós no segundo semestre 2026"
      g.goal_type = "save"; g.target_amount = 8_000.00; g.current_amount = 1_600.00
      g.progress_pct = 20; g.status = "active"
      g.start_date = Date.new(2026, 3, 1); g.target_date = Date.new(2026, 7, 31)
      g.last_awarded_milestone = 0
    end
    if g5.financial_goal_contributions.empty?
      [400, 300, 450, 450].each_with_index do |amt, i|
        g5.financial_goal_contributions.create!(kind: "deposit", amount: amt, notes: "Aporte pós-graduação #{i + 1}")
      end
    end

    total_contribs = FinancialGoalContribution.joins(:financial_goal).where(financial_goals: { user_id: user.id }).count
    puts "✅ #{user.financial_goals.count} metas e #{total_contribs} contribuições criadas."
  end

  # ---------------------------------------------------------------------------
  # GAMIFICATION
  # ---------------------------------------------------------------------------
  def create_gamification_events!(user)
    return puts "🎮 Gamificação já existe (#{user.gamification_events.count}) — pulando." if user.gamification_events.count >= 40

    puts "🎮 Criando eventos de gamificação..."
    events = [
      { event_type: "record_created",    points: 10, ts: Time.new(2025, 5, 1, 9, 0),   meta: { category: "salario" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 5, 6, 8, 0),   meta: { amount: 3200 } },
      { event_type: "expense_paid",      points: 15, ts: Time.new(2025, 5, 10, 14, 0), meta: { amount: 950 } },
      { event_type: "goal_created",      points: 30, ts: Time.new(2025, 5, 15, 11, 0), meta: { goal: "Reserva de Emergência" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 6, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "income_received",   points: 25, ts: Time.new(2025, 6, 20, 16, 0), meta: { amount: 850, type: "freelancer" } },
      { event_type: "goal_created",      points: 30, ts: Time.new(2025, 6, 1, 10, 0),  meta: { goal: "Viagem Natal" } },
      { event_type: "achievement_unlocked", points: 50, ts: Time.new(2025, 6, 30, 23, 59), meta: { achievement: "primeiro_mes_completo" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 7, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "income_received",   points: 35, ts: Time.new(2025, 7, 8, 15, 0),  meta: { amount: 2500, type: "freelancer" } },
      { event_type: "goal_progress_milestone", points: 40, ts: Time.new(2025, 7, 20, 10, 0), meta: { goal: "Reserva de Emergência", milestone: 10 } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 8, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "achievement_unlocked", points: 75, ts: Time.new(2025, 8, 31, 23, 0), meta: { achievement: "3_meses_sem_atraso" } },
      { event_type: "income_received",   points: 30, ts: Time.new(2025, 8, 31, 10, 0), meta: { amount: 500, type: "bonus" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 9, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "goal_progress_milestone", points: 50, ts: Time.new(2025, 9, 25, 10, 0), meta: { goal: "Reserva de Emergência", milestone: 25 } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 10, 5, 8, 0),  meta: { amount: 3200 } },
      { event_type: "goal_created",      points: 30, ts: Time.new(2025, 10, 1, 10, 0), meta: { goal: "Quitar Nubank" } },
      { event_type: "achievement_unlocked", points: 100, ts: Time.new(2025, 10, 31, 23, 0), meta: { achievement: "6_meses_ativo" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 11, 5, 8, 0),  meta: { amount: 3200 } },
      { event_type: "goal_progress_milestone", points: 50, ts: Time.new(2025, 11, 15, 10, 0), meta: { goal: "Reserva de Emergência", milestone: 50 } },
      { event_type: "achievement_unlocked", points: 75, ts: Time.new(2025, 11, 30, 23, 0), meta: { achievement: "meta_50_pct" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2025, 12, 5, 8, 0),  meta: { amount: 3200 } },
      { event_type: "income_received",   points: 30, ts: Time.new(2025, 12, 20, 10, 0), meta: { amount: 1200, type: "decimo_terceiro" } },
      { event_type: "goal_completed",    points: 100, ts: Time.new(2025, 12, 30, 10, 0), meta: { goal: "Viagem Natal/RN" } },
      { event_type: "achievement_unlocked", points: 150, ts: Time.new(2025, 12, 31, 23, 59), meta: { achievement: "ano_completo" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2026, 1, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "goal_created",      points: 30, ts: Time.new(2026, 2, 1, 10, 0),  meta: { goal: "MacBook Pro" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2026, 2, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "achievement_unlocked", points: 100, ts: Time.new(2026, 2, 28, 23, 0), meta: { achievement: "9_meses_ativo" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2026, 3, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "goal_created",      points: 30, ts: Time.new(2026, 3, 1, 10, 0),  meta: { goal: "Pós-graduação" } },
      { event_type: "goal_progress_milestone", points: 60, ts: Time.new(2026, 3, 20, 10, 0), meta: { goal: "Reserva de Emergência", milestone: 60 } },
      { event_type: "income_received",   points: 20, ts: Time.new(2026, 4, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "achievement_unlocked", points: 75, ts: Time.new(2026, 4, 30, 23, 0), meta: { achievement: "1_ano_ativo" } },
      { event_type: "income_received",   points: 20, ts: Time.new(2026, 5, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "income_received",   points: 35, ts: Time.new(2026, 5, 18, 12, 0), meta: { amount: 2100, type: "freelancer" } },
      { event_type: "goal_progress_milestone", points: 60, ts: Time.new(2026, 5, 25, 10, 0), meta: { goal: "MacBook Pro", milestone: 25 } },
      { event_type: "income_received",   points: 20, ts: Time.new(2026, 6, 5, 8, 0),   meta: { amount: 3200 } },
      { event_type: "daily_achievement_completed", points: 5, ts: Time.new(2026, 6, 10, 8, 0), meta: { streak: 7 } },
      { event_type: "daily_achievement_completed", points: 5, ts: Time.new(2026, 6, 11, 8, 0), meta: { streak: 8 } },
      { event_type: "daily_achievement_completed", points: 5, ts: Time.new(2026, 6, 12, 8, 0), meta: { streak: 9 } },
      { event_type: "daily_achievement_completed", points: 5, ts: Time.new(2026, 6, 13, 8, 0), meta: { streak: 10 } }
    ]

    events.each do |e|
      ev = user.gamification_events.create!(
        event_type: e[:event_type], points: e[:points],
        source_type: "User", source_id: user.id, metadata: e[:meta] || {}
      )
      ev.update_columns(created_at: e[:ts], updated_at: e[:ts])
    end
    puts "✅ #{user.gamification_events.count} eventos de gamificação criados."
  end

  # ---------------------------------------------------------------------------
  # APP RATING
  # ---------------------------------------------------------------------------
  def create_app_rating!(user)
    puts "⭐ Criando avaliação do app..."
    AppRating.find_or_create_by!(user: user) do |r|
      r.usability_rating   = 5
      r.helpfulness_rating = 5
      r.calendar_rating    = 4
      r.alerts_rating      = 4
      r.goals_rating       = 5
      r.reports_rating     = 4
      r.records_rating     = 5
      r.suggestions        = "App incrível! Ajudou muito a organizar minha vida financeira. Seria ótimo ter gráficos de tendência de gastos por categoria ao longo dos meses."
    end
    puts "✅ Avaliação criada."
  end

  # ---------------------------------------------------------------------------
  # ANALYTICS
  # ---------------------------------------------------------------------------
  def create_analytics_events!(user)
    return puts "📊 Analytics já existe (#{user.analytics_events.count}) — pulando." if user.analytics_events.count >= 15

    puts "📊 Criando eventos de analytics..."
    sessions = (1..10).map { |i| "seed_session_#{i}_#{SecureRandom.hex(4)}" }
    [
      { event_name: "login_success",           screen: "login",     sid: sessions[0], ts: Time.new(2025, 5, 1, 9, 0) },
      { event_name: "onboarding_completed",    screen: "onboarding", sid: sessions[0], ts: Time.new(2025, 5, 1, 9, 5) },
      { event_name: "record_created",          screen: "records",   sid: sessions[0], ts: Time.new(2025, 5, 1, 9, 10) },
      { event_name: "app_opened",              screen: "home",      sid: sessions[1], ts: Time.new(2025, 6, 1, 8, 0) },
      { event_name: "login_success",           screen: "login",     sid: sessions[1], ts: Time.new(2025, 6, 1, 8, 1) },
      { event_name: "goal_created",            screen: "goals",     sid: sessions[1], ts: Time.new(2025, 6, 1, 8, 10) },
      { event_name: "reports_viewed",          screen: "reports",   sid: sessions[2], ts: Time.new(2025, 8, 15, 20, 0) },
      { event_name: "login_success",           screen: "login",     sid: sessions[3], ts: Time.new(2025, 10, 1, 9, 1) },
      { event_name: "record_paid_or_received", screen: "records",   sid: sessions[3], ts: Time.new(2025, 10, 5, 9, 5) },
      { event_name: "reports_viewed",          screen: "reports",   sid: sessions[4], ts: Time.new(2025, 12, 31, 22, 0) },
      { event_name: "goal_created",            screen: "goals",     sid: sessions[5], ts: Time.new(2026, 2, 1, 10, 0) },
      { event_name: "login_success",           screen: "login",     sid: sessions[6], ts: Time.new(2026, 3, 1, 8, 1) },
      { event_name: "record_created",          screen: "records",   sid: sessions[6], ts: Time.new(2026, 3, 5, 9, 0) },
      { event_name: "reports_viewed",          screen: "reports",   sid: sessions[7], ts: Time.new(2026, 4, 30, 21, 0) },
      { event_name: "login_success",           screen: "login",     sid: sessions[8], ts: Time.new(2026, 6, 13, 8, 1) },
      { event_name: "record_paid_or_received", screen: "records",   sid: sessions[8], ts: Time.new(2026, 6, 13, 8, 5) },
      { event_name: "reports_viewed",          screen: "reports",   sid: sessions[9], ts: Time.new(2026, 6, 14, 7, 30) }
    ].each do |e|
      ev = user.analytics_events.create!(event_name: e[:event_name], screen: e[:screen], session_id: e[:sid], metadata: {})
      ev.update_columns(created_at: e[:ts], updated_at: e[:ts])
    end
    puts "✅ #{user.analytics_events.count} eventos de analytics criados."
  end

  # ---------------------------------------------------------------------------
  # NOTIFICATIONS — Geradas a partir dos dados reais (sempre atualiza)
  # ---------------------------------------------------------------------------
  def refresh_notifications!(user)
    puts "🔔 Atualizando notificações com dados reais..."

    # Remove todas as notificações existentes do usuário demo para garantir dados frescos
    user.notification_alerts.delete_all

    today = Date.today
    pending = user.financial_records.where(status: "pending")

    # --- Alertas do serviço padrão (overdue, due_today, near_due) ---
    NotificationAlertsService.generate_for_user!(user)

    # --- Resumo semanal manual (o job só roda às sextas) ---
    week_start       = today.beginning_of_week(:monday)
    week_pending     = pending.where(due_date: week_start..today)
    week_income      = week_pending.where(flow_type: "income").sum(:amount).to_d
    week_expense     = week_pending.where(flow_type: "expense").sum(:amount).to_d
    week_count       = week_pending.count
    projected_bal    = week_income - week_expense

    # Próximos 7 dias (para o resumo da semana futura)
    next_7_expense = pending.where(flow_type: "expense", due_date: (today + 1)..(today + 7)).sum(:amount).to_d
    next_7_income  = pending.where(flow_type: "income",  due_date: (today + 1)..(today + 7)).sum(:amount).to_d

    user.notification_alerts.create!(
      alert_type: "weekly_summary",
      title:      "Resumo semanal da conta",
      window_key: "demo-weekly-#{today.iso8601}",
      due_count:  week_count,
      read_at:    nil,
      metadata:   { week_start: week_start.iso8601, week_end: today.iso8601,
                    pending_income_total: week_income.to_s("F"),
                    pending_expense_total: week_expense.to_s("F"),
                    projected_balance: projected_bal.to_s("F") },
      message: "Até hoje nesta semana: #{week_count} pendência(s). " \
               "Entradas pendentes #{fmt_money(week_income)} e saídas pendentes #{fmt_money(week_expense)}. " \
               "Saldo previsto #{fmt_money(projected_bal)}."
    )

    # --- Lembrete próximos 7 dias ---
    upcoming = pending.where(due_date: (today + 1)..(today + 7)).order(:due_date).limit(3)
    if upcoming.any?
      titles_list = upcoming.map { |r| "#{r.title} (#{r.due_date.strftime('%d/%m')} — #{fmt_money(r.amount)})" }.join(", ")
      user.notification_alerts.create!(
        alert_type: "near_due",
        title:      "Próximos vencimentos (7 dias)",
        window_key: "demo-upcoming-#{today.iso8601}",
        due_count:  upcoming.count,
        read_at:    nil,
        metadata:   { next_7_expense: next_7_expense.to_s("F"), next_7_income: next_7_income.to_s("F") },
        message:    "Nos próximos 7 dias: #{titles_list}."
      )
    end

    # --- Mensagem AI do dia ---
    overdue_count   = pending.where("due_date < ?", today).count
    goal_pct        = user.financial_goals.where(status: "active").average(:progress_pct).to_i rescue 0
    ai_message      = build_ai_daily_message(overdue_count, goal_pct, next_7_expense)

    user.notification_alerts.create!(
      alert_type: "daily_ai_message",
      title:      "Dica do dia",
      window_key: "demo-ai-#{today.iso8601}",
      due_count:  0,
      read_at:    nil,
      metadata:   { overdue_count: overdue_count, goal_avg_pct: goal_pct },
      message:    ai_message
    )

    puts "✅ #{user.notification_alerts.count} notificações geradas."
  end

  def build_ai_daily_message(overdue_count, goal_pct, next_7_expense)
    if overdue_count > 0
      "Você tem #{overdue_count} conta(s) em atraso. Regularizar agora evita juros e protege seu score. " \
      "Suas metas estão #{goal_pct}% concluídas em média — continue!"
    elsif next_7_expense > 1000
      "Atenção: #{fmt_money(next_7_expense)} em vencimentos nos próximos 7 dias. " \
      "Separe o valor agora para não ser pego de surpresa. Suas metas estão indo bem (#{goal_pct}%)!"
    else
      "Ótima semana! Suas metas estão #{goal_pct}% concluídas. " \
      "Com disciplina você chega à reserva de emergência completa ainda este ano. Continue assim!"
    end
  end

  def fmt_money(value)
    ActionController::Base.helpers.number_to_currency(
      value.to_d, unit: "R$ ", separator: ",", delimiter: "."
    )
  end

  # ---------------------------------------------------------------------------
  # SUMMARY
  # ---------------------------------------------------------------------------
  def print_summary(user)
    total_income  = user.financial_records.where(flow_type: "income",  status: "received").sum(:amount)
    total_expense = user.financial_records.where(flow_type: "expense", status: "paid").sum(:amount)
    future_exp    = user.financial_records.where(flow_type: "expense", status: "pending").sum(:amount)
    xp_total      = user.gamification_events.sum(:points)
    contribs      = FinancialGoalContribution.joins(:financial_goal).where(financial_goals: { user_id: user.id }).count
    overdue       = user.financial_records.where(status: "pending").where("due_date < ?", Date.today).count

    puts ""
    puts "🎉 =============================================="
    puts "   SEED CONCLUÍDO — Conta Demo UniriosDemo"
    puts "   Login: unirios_demo | Senha: 1234"
    puts "================================================"
    puts "   📝 Financial Records:   #{user.financial_records.count}"
    puts "   ⚠️  Em atraso:           #{overdue} registros"
    puts "   📅 Futuros pendentes:   #{fmt_money(future_exp)}"
    puts "   🎯 Metas:               #{user.financial_goals.count}"
    puts "   💰 Contribuições:       #{contribs}"
    puts "   🎮 Eventos XP:          #{user.gamification_events.count} (#{xp_total} XP)"
    puts "   🔔 Notificações:        #{user.notification_alerts.count}"
    puts "   📊 Analytics:           #{user.analytics_events.count}"
    puts "   ⭐ App Rating:          1"
    puts "   💵 Total Recebido:      #{fmt_money(total_income)}"
    puts "   💸 Total Pago:          #{fmt_money(total_expense)}"
    puts "================================================"
  end
end
