module Api
  module V1
    class AiController < ApplicationController
      before_action :authenticate_access_token!

      def next_action
        context = Ai::ContextBuilder.for_user(@current_user)
        prompt = Ai::PromptBuilder.next_action(context)
        result = run_ai!(
          feature: "next_action",
          prompt_version: "v1",
          input_payload: context,
          response_guard: Ai::ResponseGuard.method(:next_action),
          prompt: prompt,
          fallback: lambda do
            {
              "title" => "Priorize o que vence primeiro",
              "description" => "Revise os itens pendentes e conclua pelo menos um hoje para manter o controle.",
              "cta" => "Ver pendentes",
              "confidence" => 0.55
            }
          end
        )
        return if performed?

        render json: {
          interaction_id: result[:interaction_id],
          next_action: result[:content],
          source: result[:source]
        }, status: :ok
      end

      def alerts
        context = Ai::ContextBuilder.for_user(@current_user)
        prompt = Ai::PromptBuilder.alerts(context)
        result = run_ai!(
          feature: "alerts",
          prompt_version: "v1",
          input_payload: context,
          response_guard: Ai::ResponseGuard.method(:alerts),
          prompt: prompt,
          fallback: lambda do
            {
              "alerts" => [
                {
                  "type" => "cashflow",
                  "severity" => "medium",
                  "message" => "Existem pendencias que podem pressionar seu saldo.",
                  "recommended_action" => "Priorize os vencimentos dos proximos dias."
                }
              ]
            }
          end
        )
        return if performed?

        render json: {
          interaction_id: result[:interaction_id],
          alerts: result[:content]["alerts"] || [],
          source: result[:source]
        }, status: :ok
      end

      def categorize_record
        payload = categorize_params
        context = Ai::ContextBuilder.for_categorization(@current_user, payload)
        prompt = Ai::PromptBuilder.categorize_record(context)
        result = run_ai!(
          feature: "categorize_record",
          prompt_version: "v1",
          input_payload: context,
          response_guard: Ai::ResponseGuard.method(:categorize_record),
          prompt: prompt,
          fallback: lambda do
            {
              "suggested_category" => "Sem categoria",
              "suggested_flow_type" => "expense",
              "confidence" => 0.45,
              "reasoning_short" => "Sem dados suficientes para uma classificacao precisa."
            }
          end
        )
        return if performed?

        render json: {
          interaction_id: result[:interaction_id],
          suggestion: result[:content],
          source: result[:source]
        }, status: :ok
      rescue ActionController::ParameterMissing => error
        render json: { error: error.message }, status: :unprocessable_entity
      end

      def reports_briefing
        context = Ai::ContextBuilder.for_user(@current_user)
        prompt = Ai::PromptBuilder.reports_briefing(context)
        result = run_ai!(
          feature: "reports_briefing",
          prompt_version: "v1",
          input_payload: context,
          response_guard: Ai::ResponseGuard.method(:reports_briefing),
          prompt: prompt,
          fallback: lambda do
            {
              "title" => "Resumo inteligente",
              "summary" => "Seu periodo tem sinais de equilibrio. Foque em fechar pendencias e manter constancia.",
              "actions" => [
                "Feche ao menos um pendente hoje.",
                "Revise sua principal categoria de saida."
              ],
              "confidence" => 0.58
            }
          end
        )
        return if performed?

        render json: {
          interaction_id: result[:interaction_id],
          briefing: result[:content],
          source: result[:source]
        }, status: :ok
      end

      def feedback
        interaction = @current_user.ai_interactions.find(params.require(:interaction_id))
        feedback = @current_user.ai_feedbacks.create!(
          ai_interaction: interaction,
          vote: params.require(:vote).to_s,
          useful: params.key?(:useful) ? ActiveModel::Type::Boolean.new.cast(params[:useful]) : nil,
          comment: params[:comment].to_s.presence
        )

        render json: {
          id: feedback.id,
          message: "Feedback registrado com sucesso."
        }, status: :created
      rescue ActionController::ParameterMissing => error
        render json: { error: error.message }, status: :unprocessable_entity
      rescue ActiveRecord::RecordInvalid => error
        render json: { error: error.record.errors.full_messages.first || "Feedback invalido." }, status: :unprocessable_entity
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Interacao nao encontrada." }, status: :not_found
      end

      private

      def categorize_params
        params.permit(:title, :amount, :note).tap do |permitted|
          raise ActionController::ParameterMissing, "title is required" if permitted[:title].to_s.strip.blank?
          raise ActionController::ParameterMissing, "amount is required" if permitted[:amount].to_s.strip.blank?
        end
      end

      def run_ai!(feature:, prompt_version:, input_payload:, response_guard:, prompt:, fallback:)
        quota = Ai::UsageGuard.check(user: @current_user)
        unless quota[:allowed]
          render json: {
            error: "Limite de IA atingido para este periodo.",
            daily_remaining: quota[:daily_remaining],
            monthly_remaining: quota[:monthly_remaining]
          }, status: :too_many_requests
          return
        end

        ai_result = Ai::Client.generate_json(
          feature: feature,
          system_prompt: Ai::PromptBuilder::SYSTEM_PROMPT,
          user_prompt: prompt,
          fallback: fallback,
          response_guard: response_guard
        )

        consumed = Ai::UsageGuard.consume!(user: @current_user, tokens: ai_result[:total_tokens].to_i)
        unless consumed[:allowed]
          render json: {
            error: "Limite de IA atingido para este periodo.",
            daily_remaining: consumed[:daily_remaining],
            monthly_remaining: consumed[:monthly_remaining]
          }, status: :too_many_requests
          return
        end

        interaction = @current_user.ai_interactions.create!(
          feature: feature,
          prompt_version: prompt_version,
          input_payload: input_payload,
          output_payload: ai_result[:content],
          confidence: ai_result[:content]["confidence"],
          status: ai_result[:ok] ? "success" : "fallback",
          latency_ms: ai_result[:latency_ms],
          prompt_tokens: ai_result[:prompt_tokens].to_i,
          completion_tokens: ai_result[:completion_tokens].to_i,
          total_tokens: ai_result[:total_tokens].to_i,
          provider: ai_result[:provider].to_s,
          model: ai_result[:model].to_s,
          error_message: ai_result[:error_message]
        )

        {
          interaction_id: interaction.id,
          content: ai_result[:content],
          source: ai_result[:source]
        }
      end

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Nao autorizado." }, status: :unauthorized
      end
    end
  end
end
