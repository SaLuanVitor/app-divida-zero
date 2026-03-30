class ApplicationController < ActionController::API
  wrap_parameters false
  before_action :set_current_user_local_date!
  before_action :enforce_utf8_response!

  rescue_from ActionController::ParameterMissing do |error|
    render json: { error: error.message }, status: :unprocessable_entity
  end

  rescue_from ActiveRecord::RecordInvalid do |error|
    full_messages = error.record.errors.full_messages
    details = error.record.errors.details[:email] || []
    email_taken = details.any? { |d| d[:error] == :taken } ||
                  full_messages.any? { |msg| msg.downcase.include?("already been taken") }

    payload = {
      error: full_messages.to_sentence,
      field_errors: error.record.errors.to_hash(true)
    }

    if email_taken
      payload[:error_code] = "email_taken"
      payload[:error] = "Este usuário já está cadastrado. Faça login ou recupere sua senha."
    end

    render json: payload, status: :unprocessable_entity
  end

  private

  def set_current_user_local_date!
    Current.user_local_date = parse_user_local_date_header || Date.current
  end

  def parse_user_local_date_header
    raw = request.headers["X-User-Local-Date"].to_s.strip
    return nil if raw.blank?
    return nil unless /\A\d{4}-\d{2}-\d{2}\z/.match?(raw)

    Date.iso8601(raw)
  rescue ArgumentError
    nil
  end

  def enforce_utf8_response!
    response.set_header("Content-Type", "application/json; charset=utf-8")
  end
end
