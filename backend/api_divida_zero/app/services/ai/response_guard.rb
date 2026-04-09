module Ai
  class ResponseGuard
    class << self
      def next_action(raw_json)
        parsed = parse_json(raw_json)
        {
          "title" => sanitize_text(parsed["title"], default: "Organize seu proximo passo", max: 70),
          "description" => sanitize_text(parsed["description"], default: "Revise pendencias e priorize uma acao de hoje.", max: 180),
          "cta" => sanitize_text(parsed["cta"], default: "Ver detalhes", max: 35),
          "confidence" => clamp_confidence(parsed["confidence"])
        }
      end

      def alerts(raw_json)
        parsed = parse_json(raw_json)
        alerts = Array(parsed["alerts"]).first(3).map do |item|
          {
            "type" => sanitize_enum(item["type"], %w[cashflow delay habit], "cashflow"),
            "severity" => sanitize_enum(item["severity"], %w[low medium high], "medium"),
            "message" => sanitize_text(item["message"], default: "Revise suas pendencias para manter o controle.", max: 140),
            "recommended_action" => sanitize_text(item["recommended_action"], default: "Ajuste uma prioridade hoje.", max: 120)
          }
        end

        { "alerts" => alerts }
      end

      def categorize_record(raw_json)
        parsed = parse_json(raw_json)
        {
          "suggested_category" => sanitize_text(parsed["suggested_category"], default: "Sem categoria", max: 40),
          "suggested_flow_type" => sanitize_enum(parsed["suggested_flow_type"], %w[income expense], "expense"),
          "confidence" => clamp_confidence(parsed["confidence"]),
          "reasoning_short" => sanitize_text(parsed["reasoning_short"], default: "Sugestao baseada no historico recente.", max: 120)
        }
      end

      def reports_briefing(raw_json)
        parsed = parse_json(raw_json)
        actions = Array(parsed["actions"]).map { |item| sanitize_text(item, default: "", max: 90) }.reject(&:blank?).first(2)
        {
          "title" => sanitize_text(parsed["title"], default: "Resumo inteligente", max: 70),
          "summary" => sanitize_text(parsed["summary"], default: "Continue registrando e fechando pendencias para evoluir no periodo.", max: 180),
          "actions" => actions.presence || ["Revise as pendencias do periodo.", "Atualize sua meta principal da semana."],
          "confidence" => clamp_confidence(parsed["confidence"])
        }
      end

      def daily_message(raw_json)
        parsed = parse_json(raw_json)
        {
          "title" => sanitize_text(parsed["title"], default: "Mensagem do dia", max: 70),
          "body" => sanitize_text(parsed["body"], default: "Cada pequeno registro hoje fortalece seu controle financeiro de amanha.", max: 220),
          "theme" => sanitize_enum(parsed["theme"], %w[constancia controle metas organizacao], "constancia")
        }
      end

      private

      def parse_json(raw_json)
        parsed = JSON.parse(raw_json.to_s)
        parsed.is_a?(Hash) ? parsed : {}
      rescue StandardError
        {}
      end

      def sanitize_text(value, default:, max:)
        text = value.to_s.strip
        text = default if text.blank?
        text.slice(0, max)
      end

      def sanitize_enum(value, allowed, default)
        candidate = value.to_s
        allowed.include?(candidate) ? candidate : default
      end

      def clamp_confidence(value)
        number = value.to_f
        return 0.5 unless number.finite?

        [[number, 0.0].max, 1.0].min.round(3)
      end
    end
  end
end
