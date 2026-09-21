require "test_helper"

class TelegramProviderTest < ActiveSupport::TestCase
  setup do
    @original_token = ENV["TELEGRAM_BOT_TOKEN"]
    @original_username = ENV["TELEGRAM_BOT_USERNAME"]
  end

  teardown do
    ENV["TELEGRAM_BOT_TOKEN"] = @original_token
    ENV["TELEGRAM_BOT_USERNAME"] = @original_username
  end

  test "configured? follows TELEGRAM_BOT_TOKEN presence" do
    ENV["TELEGRAM_BOT_TOKEN"] = nil
    refute TelegramProvider.configured?

    ENV["TELEGRAM_BOT_TOKEN"] = "123:abc"
    assert TelegramProvider.configured?
  end

  test "send_message raises NotConfigured without token" do
    ENV["TELEGRAM_BOT_TOKEN"] = nil
    assert_raises(TelegramProvider::NotConfigured) do
      TelegramProvider.send_message(chat_id: "1", text: "oi")
    end
  end

  test "send_message parses a 429 into retry_after" do
    ENV["TELEGRAM_BOT_TOKEN"] = "123:abc"

    response = Net::HTTPResponse.new("1.1", "429", "Too Many Requests")
    response["Retry-After"] = "42"
    http = Minitest::Mock.new
    http.expect(:use_ssl=, nil, [ true ])
    http.expect(:open_timeout=, nil, [ 5 ])
    http.expect(:read_timeout=, nil, [ 10 ])
    http.expect(:request, response, [ Net::HTTP::Post ])

    Net::HTTP.stub(:new, http) do
      result = TelegramProvider.send_message(chat_id: "1", text: "oi")
      refute result.success?
      assert result.rate_limited?
      assert_equal 42, result.retry_after
    end

    http.verify
  end

  test "verify_credentials! treats not-configured as NotConfigured" do
    ENV["TELEGRAM_BOT_TOKEN"] = nil
    assert_raises(TelegramProvider::NotConfigured) do
      TelegramProvider.verify_credentials!
    end
  end
end
