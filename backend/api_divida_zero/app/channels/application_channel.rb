class ApplicationChannel
  ChannelNotImplemented = Class.new(StandardError)

  DeliverResult = Struct.new(:success, :message_id, :error, keyword_init: true) do
    def success?
      success == true
    end
  end

  class << self
    def channel_name
      raise ChannelNotImplemented, "#{name} must implement .channel_name"
    end

    def deliver(message_payload)
      raise ChannelNotImplemented, "#{name} must implement .deliver"
    end

    def valid_recipient?(user)
      raise ChannelNotImplemented, "#{name} must implement .valid_recipient?"
    end

    def rate_limiter
      nil
    end
  end
end
