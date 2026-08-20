# Story 4.3 — AI Categorization + Dedup Services

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing
> **Story:** 4.3 — AI Categorization + Dedup
> **Prioridade:** Alta
> **Dependências:** Story 4.2 (parser services)

---

## Acceptance Criteria

- [x] AC-01: `Bank::AiCategorizationService` categoriza lote de 20 transações em 1 chamada OpenAI
- [x] AC-02: Prompt envia description + amount de cada transação para IA sugerir categoria
- [x] AC-03: Fallback: sem IA, todas categorizadas como "Outros", confidence 0.4
- [x] AC-04: Em test mode, usa `fake_categorize` (sem chamada externa)
- [x] AC-05: `Bank::DeduplicationService.detect` compara com FinancialRecord dos últimos 6 meses
- [x] AC-06: Exact match (amount + date + description >90%) marca como duplicate
- [x] AC-07: Fuzzy match (amount + date ±3d + description >70%) marca como duplicate
- [x] AC-08: FIT ID match (se disponível) marca como duplicate
- [x] AC-09: Sem match, status = pending
- [x] AC-10: Duplicatas têm `duplicate_reason` e `duplicate_of_id` preenchidos
- [x] AC-11: `Ai::PromptBuilder.categorize_bank_transactions` criado com system_prompt específico
- [ ] AC-12: Testes unitários com mock da OpenAI + fixtures de dedup

---

## Files

### AiCategorizationService

```ruby
# app/services/bank/ai_categorization_service.rb
module Bank
  class AiCategorizationService
    BATCH_SIZE = 20

    def self.categorize_batch(user, transactions, test_mode: false)
      return fake_categorize(transactions) if test_mode || no_ai_available?

      transactions.each_slice(BATCH_SIZE).flat_map do |batch|
        result = call_ai(user, batch)
        merge_results(batch, result)
      end
    end

    private

    def self.no_ai_available?
      ENV["AI_API_KEY"].blank? && ENV["OPENAI_API_KEY"].blank?
    end

    def self.call_ai(user, transactions)
      payload = { transactions: transactions.map { |t| t.slice(:description, :amount, :original_category) } }
      context = Ai::ContextBuilder.for_categorization(user, payload)
      prompt = Ai::PromptBuilder.categorize_bank_transactions(context)

      ai_result = Ai::Client.generate_json(
        feature: "categorize_bank_transactions",
        system_prompt: system_prompt,
        user_prompt: prompt,
        fallback: ->(feat) { {"transactions" => build_fallback_array(transactions)} },
        response_guard: method(:guard).to_proc
      )

      ai_result[:content]
    end

    def self.system_prompt
      <<~PROMPT
        Categorize banking transactions. Respond JSON:
        { "transactions": [{ "index": 0, "suggested_category": "Alimentação", "flow_type": "expense", "confidence": 0.92 }] }
        Categories: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Serviços, Compras, Salário, Investimentos, Transferências, Impostos, Assinaturas, Outros.
        Negative amounts = expense, positive = income.
      PROMPT
    end

    def self.merge_results(batch, result)
      categories = result["transactions"] || []
      batch.each_with_index.map do |txn, idx|
        cat = categories.find { |c| c["index"] == idx } || {}
        txn.merge(
          suggested_category: cat["suggested_category"].presence || "Outros",
          flow_type: cat["flow_type"].presence || txn[:flow_type],
          ai_confidence: cat["confidence"].to_f.clamp(0, 1)
        )
      end
    end

    def self.guard(response)
      parsed = JSON.parse(response) rescue { "transactions" => [] }
      parsed["transactions"]&.each do |t|
        t["suggested_category"] = t["suggested_category"].to_s.truncate(40)
        t["flow_type"] = %w[income expense].include?(t["flow_type"]) ? t["flow_type"] : "expense"
        t["confidence"] = t["confidence"].to_f.clamp(0, 1)
      end
      parsed
    end

    def self.build_fallback_array(transactions)
      transactions.each_with_index.map do |txn, idx|
        { "index" => idx, "suggested_category" => "Outros", "flow_type" => txn[:flow_type] || "expense", "confidence" => 0.4 }
      end
    end

    def self.fake_categorize(transactions)
      categories = %w[Alimentação Transporte Moradia Saúde Lazer Compras Assinaturas]
      transactions.map.with_index do |txn, idx|
        txn.merge(
          suggested_category: categories[idx % categories.size],
          flow_type: txn[:flow_type] || "expense",
          ai_confidence: 0.85
        )
      end
    end
  end
end
```

### DeduplicationService

```ruby
# app/services/bank/deduplication_service.rb
module Bank
  class DeduplicationService
    def self.detect(user, transactions)
      existing = build_existing_index(user)
      transactions.map do |txn|
        duplicate = find_duplicate(user, txn, existing)
        if duplicate
          txn.merge(
            status: "duplicate",
            duplicate_reason: duplicate[:reason],
            duplicate_of_id: duplicate[:record_id]
          )
        else
          txn.merge(status: "pending")
        end
      end
    end

    private

    def self.build_existing_index(user)
      six_months_ago = Date.current - 6.months
      user.financial_records
          .where(due_date: six_months_ago..)
          .select(:id, :title, :amount, :due_date)
          .map { |r| { id: r.id, title: normalize(r.title), amount: r.amount, date: r.due_date } }
    end

    def self.find_duplicate(user, txn, existing)
      normalized_desc = normalize(txn[:description])

      # FIT ID match (OFX)
      if txn[:fit_id].present?
        match = user.financial_records.joins(:imported_transactions)
                    .where(imported_transactions: { fit_id: txn[:fit_id] })
                    .first
        return { reason: "fit_id", record_id: match.id } if match
      end

      # Exact match
      exact = existing.find do |e|
        e[:amount] == txn[:amount] &&
          e[:date] == txn[:date] &&
          similarity(e[:title], normalized_desc) > 0.9
      end
      return { reason: "exact_match", record_id: exact[:id] } if exact

      # Fuzzy match
      fuzzy = existing.find do |e|
        e[:amount] == txn[:amount] &&
          (e[:date] - txn[:date]).abs <= 3 &&
          similarity(e[:title], normalized_desc) > 0.7
      end
      return { reason: "fuzzy_match", record_id: fuzzy[:id] } if fuzzy

      nil
    end

    def self.normalize(str)
      str.to_s.downcase.gsub(/[^a-z0-9áéíóúàâêôãõç\s]/i, "").strip
    end

    def self.similarity(a, b)
      return 0.0 if a.nil? || b.nil?
      max_len = [a.length, b.length].max
      return 1.0 if max_len.zero?
      1.0 - levenshtein(a, b).to_f / max_len
    end

    def self.levenshtein(a, b)
      n = a.length
      m = b.length
      return m if n.zero?
      return n if m.zero?
      matrix = (0..m).to_a
      (1..n).each do |i|
        prev = matrix[0]
        matrix[0] = i
        (1..m).each do |j|
          temp = matrix[j]
          matrix[j] = if a[i - 1] == b[j - 1]
                        prev
                      else
                        [matrix[j] + 1, matrix[j - 1] + 1, prev + 1].min
                      end
          prev = temp
        end
      end
      matrix[m]
    end
  end
end
```

### PromptBuilder addition

```ruby
# Em app/services/ai/prompt_builder.rb — adicionar:

def self.categorize_bank_transactions(context)
  <<~PROMPT
    Contexto do usuário: #{context.to_json}

    Categorize cada transação bancária abaixo.
    Para cada uma, responda com: suggested_category, flow_type (income/expense), confidence (0-1).

    Categorias disponíveis: Alimentação, Transporte, Moradia, Saúde, Educação,
    Lazer, Serviços, Compras, Salário, Investimentos, Transferências, Impostos, Assinaturas, Outros.
  PROMPT
end
```
