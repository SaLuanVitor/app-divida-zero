module Ai
  class PromptBuilder
    SYSTEM_PROMPT = <<~TEXT.freeze
      Voce e um assistente financeiro do app Divida Zero.
      Responda sempre em portugues do Brasil, com tom curto, claro e acionavel.
      Nao use conselhos sensiveis nem dados pessoais.
      Saida sempre em JSON valido.
    TEXT

    class << self
      def next_action(context)
        <<~TEXT
          Contexto agregado:
          #{context.to_json}

          Gere a melhor proxima acao para o usuario hoje.
          Responda neste formato JSON:
          {
            "title": "string ate 70 chars",
            "description": "string ate 180 chars",
            "cta": "string ate 35 chars",
            "confidence": number entre 0 e 1
          }
        TEXT
      end

      def alerts(context)
        <<~TEXT
          Contexto agregado:
          #{context.to_json}

          Gere ate 3 alertas curtos de risco financeiro e acao preventiva.
          Responda em JSON:
          {
            "alerts": [
              {
                "type": "cashflow|delay|habit",
                "severity": "low|medium|high",
                "message": "string curta",
                "recommended_action": "string curta"
              }
            ]
          }
        TEXT
      end

      def categorize_record(context)
        <<~TEXT
          Dados do lancamento:
          #{context.to_json}

          Sugira categoria e tipo de fluxo.
          Responda em JSON:
          {
            "suggested_category": "string",
            "suggested_flow_type": "income|expense",
            "confidence": number entre 0 e 1,
            "reasoning_short": "string ate 120 chars"
          }
        TEXT
      end

      def reports_briefing(context)
        <<~TEXT
          Contexto de relatorios:
          #{context.to_json}

          Gere um resumo curto e orientado a acao.
          Responda em JSON:
          {
            "title": "string curta",
            "summary": "string ate 180 chars",
            "actions": ["string", "string"],
            "confidence": number entre 0 e 1
          }
        TEXT
      end

      def daily_message(global_context)
        <<~TEXT
          Contexto do sistema:
          #{global_context.to_json}

          Gere uma mensagem global diaria de incentivo financeiro para todos os usuarios.
          Sem personalizacao individual.
          Responda em JSON:
          {
            "title": "string ate 70 chars",
            "body": "string ate 220 chars",
            "theme": "constancia|controle|metas|organizacao"
          }
        TEXT
      end
    end
  end
end
