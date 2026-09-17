require "active_support/cache"
require "singleton"

class WhatsappRateLimiter
  include Singleton

  PREFIX = "wa_rate_limiter"
  GLOBAL_BUCKET_KEY = "#{PREFIX}:global"
  BUCKET_TTL = 1.hour

  def initialize
    # Rails.cache usa Solid Cache (compartilhado entre workers) em produção;
    # em desenvolvimento/teste cai para memory/null store.
    @cache = Rails.cache
    @mutex = Mutex.new
  end

  def allow?(phone = nil)
    @mutex.synchronize do
      global_allowed = bucket_allowed?(GLOBAL_BUCKET_KEY, burst_size, refill_rate)
      phone_allowed = phone.nil? || bucket_allowed?(phone_key(phone), phone_burst_size, phone_refill_rate)

      {
        allowed: global_allowed && phone_allowed,
        retry_after: retry_after(global_allowed, phone_allowed)
      }
    end
  end

  def reset!
    @mutex.synchronize do
      if @cache.respond_to?(:delete_matched)
        @cache.delete_matched("#{PREFIX}:*")
      else
        @cache.delete(GLOBAL_BUCKET_KEY)
      end
    end
  end

  def stats
    {
      global_tokens: read_tokens(GLOBAL_BUCKET_KEY),
      cache_entries: cache_entries_count
    }
  end

  private

  def cache_entries_count
    return unless @cache.respond_to?(:instance_variable_get)

    data = @cache.instance_variable_get(:@data)
    data&.size
  end

  def bucket_allowed?(key, max_size, refill_rate)
    now = Time.current.to_f
    entry = @cache.read(key)

    if entry.nil?
      @cache.write(key, { tokens: max_size - 1, last_refill: now }, expires_in: BUCKET_TTL)
      return true
    end

    elapsed = now - entry[:last_refill]
    tokens = [ entry[:tokens] + (elapsed * refill_rate), max_size ].min

    if tokens >= 1
      @cache.write(key, { tokens: tokens - 1, last_refill: now }, expires_in: BUCKET_TTL)
      true
    else
      @cache.write(key, { tokens: tokens, last_refill: entry[:last_refill] }, expires_in: BUCKET_TTL)
      false
    end
  end

  def read_tokens(key)
    entry = @cache.read(key)
    return nil unless entry

    elapsed = Time.current.to_f - entry[:last_refill]
    tokens = entry[:tokens] + (elapsed * refill_rate)
    [ tokens, burst_size ].min.round(2)
  end

  def retry_after(global_allowed, phone_allowed)
    return 0 if global_allowed && phone_allowed

    entry = @cache.read(GLOBAL_BUCKET_KEY)
    return 1 unless entry

    tokens_needed = [ 1 - (entry[:tokens] + (Time.current.to_f - entry[:last_refill]) * refill_rate), 0 ].max
    (tokens_needed / refill_rate).ceil
  end

  def phone_key(phone)
    "#{PREFIX}:phone:#{phone.to_s.strip}"
  end

  def burst_size
    ENV.fetch("WHATSAPP_BURST_SIZE", 10).to_i
  end

  def refill_rate
    ENV.fetch("WHATSAPP_REFILL_RATE", 1).to_f
  end

  def phone_burst_size
    3
  end

  def phone_refill_rate
    0.2
  end
end
