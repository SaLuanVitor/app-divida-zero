require "test_helper"

class ExpoPushServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Push",
      email: "usuario_push_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )

    @alive_token = "ExponentPushToken[alive]"
    @dead_token = "ExponentPushToken[dead]"

    @user.device_tokens.create!(
      expo_push_token: @alive_token,
      platform: "android",
      last_seen_at: Time.current
    )
    @user.device_tokens.create!(
      expo_push_token: @dead_token,
      platform: "android",
      last_seen_at: Time.current
    )
  end

  test "deliver removes DeviceNotRegistered tokens and counts successful deliveries" do
    response_body = {
      data: [
        { status: "ok", id: "ticket-1" },
        { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } }
      ]
    }.to_json

    Net::HTTP.stub(:new, ->(_host, _port) {
      http = Minitest::Mock.new
      http.expect(:use_ssl=, nil, [true])
      http.expect(:open_timeout=, nil, [4])
      http.expect(:read_timeout=, nil, [9])
      http.expect(:request, OpenStruct.new(body: response_body)) do |request|
        payload = JSON.parse(request.body)
        assert_equal 2, payload.size
        true
      end
      http
    }) do
      result = ExpoPushService.deliver(
        tokens: [@alive_token, @dead_token],
        title: "Titulo",
        body: "Corpo",
        data: { source: "test" }
      )

      assert_equal 1, result[:delivered]
      assert_equal [@dead_token], result[:removed_tokens]
      assert @user.device_tokens.exists?(expo_push_token: @alive_token)
      refute @user.device_tokens.exists?(expo_push_token: @dead_token)
    end
  end
end
