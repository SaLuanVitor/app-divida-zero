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
