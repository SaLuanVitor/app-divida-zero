module Ai
  class DailyMessageGenerator
    class << self
      def generate_for(date: Date.current)
        existing = DailyAiMessage.find_by(date: date)
        return existing if existing.present?

        prompt = PromptBuilder.daily_message(global_context(date))
        ai_result = Client.generate_json(
          feature: "daily_message",
          system_prompt: PromptBuilder::SYSTEM_PROMPT,
          user_prompt: prompt,
          fallback: fallback_payload,
          response_guard: ResponseGuard.method(:daily_message)
        )

        content = ai_result[:content]
        DailyAiMessage.create!(
          date: date,
          title: content.fetch("title"),
          body: content.fetch("body"),
          theme: content.fetch("theme"),
          source_version: "v1",
          provider: ai_result[:provider],
          model: ai_result[:model],
          metadata: {
            source: ai_result[:source],
            generated_at: Time.zone.now.iso8601,
            latency_ms: ai_result[:latency_ms]
          }
        )
      end

      private

      def fallback_payload(_feature = nil)
        {
          "title" => "Um passo de cada vez",
          "body" => "Registrar hoje, mesmo que pouco, deixa seu controle financeiro muito mais forte no fim do mes.",
          "theme" => "constancia"
        }
      end

      def global_context(date)
        {
          date: date.iso8601,
          app_name: "Divida Zero",
          focus: %w[controle metas constancia organizacao]
        }
      end
    end
  end
end
