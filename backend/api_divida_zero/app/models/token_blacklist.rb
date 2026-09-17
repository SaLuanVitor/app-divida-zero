class TokenBlacklist < ApplicationRecord
  # TokenBlacklist stores revoked JWT tokens (both access and refresh)
  # TTL: 7 days (cleaned up by recurring job)

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where("expires_at > ?", Time.current) }
  scope :expired, -> { where("expires_at <= ?", Time.current) }

  def self.add!(token, ttl: 7.days)
    digest = digest(token)
    # Use find_or_create_by to handle race conditions
    entry = find_or_create_by(token_digest: digest) do |e|
      e.expires_at = ttl.from_now
    end
    # Update expires_at if the new TTL is longer
    if entry.expires_at < ttl.from_now
      entry.update!(expires_at: ttl.from_now)
    end
    true
  end

  def self.revoked?(token)
    digest = digest(token)
    active.exists?(token_digest: digest)
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end

  def self.cleanup_expired!
    expired.delete_all
  end
end