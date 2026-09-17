# Be sure to restart your server when you modify this file.

# Configure parameters to be filtered from the log file. Use this to prevent
# sensitive information like passwords and API keys from being written to the log.
Rails.application.config.filter_parameters += [
  :password, :password_confirmation, :current_password,
  :client_secret, :clientSecret, :client_id, :clientId,
  :api_key, :apiKey, :api_secret, :apiSecret,
  :access_token, :accessToken, :refresh_token, :refreshToken,
  :secret, :token, :authorization, :auth_token, :authToken
]