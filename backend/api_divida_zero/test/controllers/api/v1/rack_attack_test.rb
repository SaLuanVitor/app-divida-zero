# frozen_string_literal: true

require "test_helper"

class Api::V1::RackAttackTest < ActionDispatch::IntegrationTest
  setup do
    @password = "senha1234"
    @user = User.create!(
      name: "Usuario Teste",
      email: "usuario_teste_rate_limit",
      password: @password,
      password_confirmation: @password
    )

    # Enable Rack::Attack for tests
    Rack::Attack.enabled = true
    Rack::Attack.cache.store.clear
  end

  teardown do
    Rack::Attack.enabled = false
    Rack::Attack.cache.store.clear
  end

  # LOGIN: 5 requests per minute per IP
  test "login allows up to 5 requests per minute" do
    5.times do |i|
      post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_password_#{i}" }
      assert_response :unauthorized, "Request #{i + 1} should be allowed"
    end
  end

  test "login blocks 6th request within 1 minute" do
    5.times do |i|
      post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_password_#{i}" }
      assert_response :unauthorized
    end

    # 6th request should be throttled
    post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_password_6" }
    assert_response :too_many_requests
    body = JSON.parse(response.body)
    assert_equal "Muitas requisições. Tente novamente em alguns minutos.", body["error"]
    assert response.headers["Retry-After"].present?, "Should include Retry-After header"
  end

  test "login rate limit is per IP" do
    # Simulate different IPs by using different request contexts
    # We can't easily change IP in integration tests, so we test the logic via the throttle block
    throttle = Rack::Attack.throttles["auth/login"]

    # Same IP should be throttled
    req1 = Rack::MockRequest.env_for("/api/v1/auth/login", method: "POST", "REMOTE_ADDR" => "192.168.1.1")
    req2 = Rack::MockRequest.env_for("/api/v1/auth/login", method: "POST", "REMOTE_ADDR" => "192.168.1.1")
    req3 = Rack::MockRequest.env_for("/api/v1/auth/login", method: "POST", "REMOTE_ADDR" => "192.168.1.2")

    # Reset store for this test
    Rack::Attack.cache.store.clear

    # First 5 requests from IP 1 should be allowed
    5.times { throttle.matched?(req1) }
    assert throttle.matched?(req1), "5th request should be allowed"

    # 6th request from same IP should be throttled
    assert throttle.matched?(req1), "6th request from same IP should be throttled"

    # Request from different IP should be allowed (separate counter)
    refute throttle.matched?(req3), "Request from different IP should have separate counter"
  end

  # REGISTER: 3 requests per hour per IP
  test "register allows up to 3 requests per hour" do
    3.times do |i|
      post "/api/v1/auth/register", params: {
        name: "Novo Usuario #{i}",
        email: "novo_usuario_#{i}",
        password: "nova_senha_123"
      }
      assert_response :created, "Request #{i + 1} should be allowed"
    end
  end

  test "register blocks 4th request within 1 hour" do
    3.times do |i|
      post "/api/v1/auth/register", params: {
        name: "Novo Usuario #{i}",
        email: "novo_usuario_block_#{i}",
        password: "nova_senha_123"
      }
      assert_response :created
    end

    # 4th request should be throttled
    post "/api/v1/auth/register", params: {
      name: "Novo Usuario 4",
      email: "novo_usuario_block_4",
      password: "nova_senha_123"
    }
    assert_response :too_many_requests
    body = JSON.parse(response.body)
    assert_equal "Muitas requisições. Tente novamente em alguns minutos.", body["error"]
    assert response.headers["Retry-After"].present?, "Should include Retry-After header"
  end

  test "register rate limit is per IP" do
    throttle = Rack::Attack.throttles["auth/register"]

    req1 = Rack::MockRequest.env_for("/api/v1/auth/register", method: "POST", "REMOTE_ADDR" => "10.0.0.1")
    req2 = Rack::MockRequest.env_for("/api/v1/auth/register", method: "POST", "REMOTE_ADDR" => "10.0.0.1")
    req3 = Rack::MockRequest.env_for("/api/v1/auth/register", method: "POST", "REMOTE_ADDR" => "10.0.0.2")

    Rack::Attack.cache.store.clear

    3.times { throttle.matched?(req1) }
    assert throttle.matched?(req1), "3rd request should be allowed"

    assert throttle.matched?(req1), "4th request from same IP should be throttled"
    refute throttle.matched?(req3), "Request from different IP should have separate counter"
  end

  # FORGOT_PASSWORD: 3 requests per hour per IP
  test "forgot_password allows up to 3 requests per hour" do
    3.times do |i|
      post "/api/v1/auth/forgot_password", params: { email: "user_#{i}@example.com" }
      assert_response :ok, "Request #{i + 1} should be allowed"
    end
  end

  test "forgot_password blocks 4th request within 1 hour" do
    3.times do |i|
      post "/api/v1/auth/forgot_password", params: { email: "forgot_user_#{i}@example.com" }
      assert_response :ok
    end

    # 4th request should be throttled
    post "/api/v1/auth/forgot_password", params: { email: "forgot_user_4@example.com" }
    assert_response :too_many_requests
    body = JSON.parse(response.body)
    assert_equal "Muitas requisições. Tente novamente em alguns minutos.", body["error"]
    assert response.headers["Retry-After"].present?, "Should include Retry-After header"
  end

  test "forgot_password rate limit is per IP" do
    throttle = Rack::Attack.throttles["auth/forgot_password"]

    req1 = Rack::MockRequest.env_for("/api/v1/auth/forgot_password", method: "POST", "REMOTE_ADDR" => "172.16.0.1")
    req2 = Rack::MockRequest.env_for("/api/v1/auth/forgot_password", method: "POST", "REMOTE_ADDR" => "172.16.0.1")
    req3 = Rack::MockRequest.env_for("/api/v1/auth/forgot_password", method: "POST", "REMOTE_ADDR" => "172.16.0.2")

    Rack::Attack.cache.store.clear

    3.times { throttle.matched?(req1) }
    assert throttle.matched?(req1), "3rd request should be allowed"

    assert throttle.matched?(req1), "4th request from same IP should be throttled"
    refute throttle.matched?(req3), "Request from different IP should have separate counter"
  end

  # HEALTH CHECK: should bypass rate limiting
  test "health check endpoint bypasses rate limiting" do
    # Health check should always work
    get "/up"
    assert_response :ok

    # Even many requests should work
    100.times { get "/up" }
    assert_response :ok
  end

  # THROTTLED RESPONSE FORMAT
  test "throttled response has correct format" do
    5.times do |i|
      post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_#{i}" }
    end

    post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_6" }

    assert_response :too_many_requests
    assert_equal "application/json", response.headers["Content-Type"]
    assert response.headers["Retry-After"].present?

    body = JSON.parse(response.body)
    assert_equal "Muitas requisições. Tente novamente em alguns minutos.", body["error"]
    assert_match /\A\d+\z/, response.headers["Retry-After"]
  end

  # NON-AUTH ENDPOINTS: should not be affected
  test "other endpoints are not affected by auth rate limits" do
    # Make many requests to a non-auth endpoint
    tokens = JsonWebToken.issue_pair(user_id: @user.id)
    headers = { "Authorization" => "Bearer #{tokens[:access_token]}" }

    20.times do
      get "/api/v1/auth/me", headers: headers
      assert_response :ok
    end
  end

  # LOGGING
  test "throttled requests are logged" do
    # Capture log output
    logs = []
    logger = ActiveSupport::Logger.new(StringIO.new)
    original_logger = Rails.logger
    Rails.logger = logger

    begin
      5.times do |i|
        post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_#{i}" }
      end

      post "/api/v1/auth/login", params: { email: @user.email, password: "wrong_6" }

      # Check that warning was logged
      log_output = logger.instance_variable_get(:@logdev).dev.string
      assert_match(/\[Rack::Attack\] Throttled/, log_output)
      assert_match(/auth\/login/, log_output)
      assert_match(/192\.168/, log_output) # IP in test environment
    ensure
      Rails.logger = original_logger
    end
  end
end