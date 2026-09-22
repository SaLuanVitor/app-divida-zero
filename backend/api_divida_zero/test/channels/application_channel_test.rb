require "test_helper"

class ApplicationChannelTest < ActiveSupport::TestCase
  test "channel_name raises until implemented" do
    error = assert_raises(ApplicationChannel::ChannelNotImplemented) do
      ApplicationChannel.channel_name
    end
    assert_match(/channel_name/, error.message)
  end

  test "deliver raises until implemented" do
    error = assert_raises(ApplicationChannel::ChannelNotImplemented) do
      ApplicationChannel.deliver({})
    end
    assert_match(/deliver/, error.message)
  end

  test "valid_recipient? raises until implemented" do
    error = assert_raises(ApplicationChannel::ChannelNotImplemented) do
      ApplicationChannel.valid_recipient?(User.new)
    end
    assert_match(/valid_recipient\?/, error.message)
  end

  test "rate_limiter defaults to nil" do
    assert_nil ApplicationChannel.rate_limiter
  end

  test "DeliverResult success? follows success flag" do
    ok = ApplicationChannel::DeliverResult.new(success: true, message_id: "1")
    fail_result = ApplicationChannel::DeliverResult.new(success: false, error: "boom")

    assert ok.success?
    refute fail_result.success?
  end
end
