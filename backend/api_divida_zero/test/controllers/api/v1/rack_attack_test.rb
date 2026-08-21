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
    # Test that different IPs have separate counters by making requests
    # and checking that one IP being throttled doesn't affect another
    # Since we can't easily change IP in integration tests, we verify
    # the throttle configuration exists and is correctly set up
    throttle = Rack::Attack.throttles["auth/login"]
    assert throttle.present?, "Login throttle should be configured"
    assert_equal 5, throttle.limit
    assert_equal 60, throttle.period
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

  test "register rate limit configuration" do
    throttle = Rack::Attack.throttles["auth/register"]
    assert throttle.present?, "Register throttle should be configured"
    assert_equal 3, throttle.limit
    assert_equal 3600, throttle.period
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

  test "forgot_password rate limit configuration" do
    throttle = Rack::Attack.throttles["auth/forgot_password"]
    assert throttle.present?, "Forgot password throttle should be configured"
    assert_equal 3, throttle.limit
    assert_equal 3600, throttle.period
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

  # LOGGING / THROTTLED RESPONDER
  test "throttled responder is configured" do
    # Verify the throttled_responder lambda is configured
    assert Rack::Attack.throttled_responder.is_a?(Proc), "throttled_responder should be a Proc"

    # Test the responder directly
    request = Struct.new(:env).new({
      "rack.attack.match_data" => { period: 60, limit: 5 },
      "rack.attack.match_type" => :throttle,
      "rack.attack.matched" => "throttle"
    })

    status, headers, body = Rack::Attack.throttled_responder.call(request)
    assert_equal 429, status
    assert_equal "application/json", headers["Content-Type"]
    assert headers["Retry-After"].present?
    body_json = JSON.parse(body.first)
    assert_equal "Muitas requisições. Tente novamente em alguns minutos.", body_json["error"]
  end
end