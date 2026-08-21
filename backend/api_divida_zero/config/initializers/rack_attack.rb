# frozen_string_literal: true

# Rack::Attack rate limiting configuration
# Protects authentication endpoints from brute force attacks

class Rack::Attack
  # Throttle login attempts: 5 requests per minute per IP
  throttle("auth/login", limit: 5, period: 60) do |req|
    req.path == "/api/v1/auth/login" && req.post? ? req.ip : nil
  end

  # Throttle registration attempts: 3 requests per hour per IP
  throttle("auth/register", limit: 3, period: 3600) do |req|
    req.path == "/api/v1/auth/register" && req.post? ? req.ip : nil
  end

  # Throttle forgot password attempts: 3 requests per hour per IP
  throttle("auth/forgot_password", limit: 3, period: 3600) do |req|
    req.path == "/api/v1/auth/forgot_password" && req.post? ? req.ip : nil
  end

  # Custom response for throttled requests
  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"]
    now = Time.current

    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => (match_data[:period] - (now.to_i % match_data[:period])).to_s
    }

    body = { error: "Muitas requisições. Tente novamente em alguns minutos." }

    [429, headers, [body.to_json]]
  end

  # Log throttled requests for monitoring
  ActiveSupport::Notifications.subscribe("rack.attack") do |name, start, finish, request_id, payload|
    req = payload[:request]
    if req.env["rack.attack.matched"] == "throttle"
      matched = req.env["rack.attack.match_type"]
      match_data = req.env["rack.attack.match_data"]

      Rails.logger.warn(
        "[Rack::Attack] Throttled: #{matched} | " \
        "IP: #{req.ip} | " \
        "Path: #{req.path} | " \
        "Period: #{match_data[:period]}s | " \
        "Limit: #{match_data[:limit]} | " \
        "Request ID: #{request_id}"
      )
    end
  end

  # Allow health check endpoint to bypass rate limiting
  safelist("health_check") do |req|
    req.path == "/up" && req.get?
  end

  # Allow internal IPs (e.g., load balancer health checks) if needed
  # safelist("internal_ips") do |req|
  #   req.ip.start_with?("10.0.") || req.ip.start_with?("172.16.")
  # end
end