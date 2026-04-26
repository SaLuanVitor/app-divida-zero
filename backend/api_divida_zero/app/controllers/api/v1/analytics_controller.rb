module Api
  module V1
    class AnalyticsController < ApplicationController
      before_action :authenticate_access_token!

      METADATA_ALLOWLIST = {
        "app_opened" => %w[source],
        "onboarding_viewed" => %w[source],
        "onboarding_skipped" => %w[mode],
        "onboarding_completed" => %w[mode],
        "tutorial_reopened" => %w[source],
        "login_success" => %w[method],
        "record_created" => %w[mode recurring],
        "record_paid_or_received" => %w[flow status],
        "goal_created" => %w[goal_type],
        "reports_viewed" => %w[year month has_records]
      }.freeze

      SENSITIVE_PATTERNS = /(email|telefone|phone|cpf|rg|token|senha|password|address|endereco|biometria|name)/i

      def create
        event_name = params.require(:event_name).to_s
        screen = params[:screen].to_s.strip
        session_id = params.require(:session_id).to_s
        metadata = sanitize_metadata(event_name, params[:metadata])

        event = @current_user.analytics_events.create!(
          event_name: event_name,
          screen: screen.presence,
          session_id: session_id,
          metadata: metadata
        )

        render json: { id: event.id }, status: :created
      rescue ActionController::ParameterMissing => error
        render json: { error: error.message }, status: :unprocessable_entity
      end

      private

      def sanitize_metadata(event_name, raw_metadata)
        return {} unless raw_metadata.is_a?(Hash) || raw_metadata.is_a?(ActionController::Parameters)

        allowed_keys = METADATA_ALLOWLIST[event_name.to_s] || []
        hash =
          if raw_metadata.is_a?(ActionController::Parameters)
            raw_metadata.permit!.to_h
          else
            raw_metadata.to_h
          end

        hash.each_with_object({}) do |(key, value), acc|
          normalized_key = key.to_s
          next unless allowed_keys.include?(normalized_key)
          next if normalized_key.match?(SENSITIVE_PATTERNS)
          next if value.is_a?(Hash) || value.is_a?(Array)

          acc[normalized_key] = normalize_value(value)
        end
      end

      def normalize_value(value)
        case value
        when TrueClass, FalseClass
          value
        when Numeric
          value
        else
          value.to_s.slice(0, 120)
        end
      end
      def authenticate_access_token!
        super
      end
    end
  end
end
