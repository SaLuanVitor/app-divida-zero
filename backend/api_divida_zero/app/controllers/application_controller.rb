class ApplicationController < ActionController::API
  wrap_parameters false

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
end
