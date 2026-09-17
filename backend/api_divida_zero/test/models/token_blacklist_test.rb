require "test_helper"

class TokenBlacklistTest < ActiveSupport::TestCase
  setup do
    TokenBlacklist.delete_all
  end

  test "add! creates a blacklist entry with token digest" do
    token = "test_token_123"
    TokenBlacklist.add!(token)

    entry = TokenBlacklist.last
    assert entry.present?
    assert_equal Digest::SHA256.hexdigest(token), entry.token_digest
    assert entry.expires_at > Time.current
  end

  test "add! with custom TTL" do
    token = "custom_ttl_token"
    TokenBlacklist.add!(token, ttl: 1.day)

    entry = TokenBlacklist.last
    assert_in_delta 1.day.from_now.to_i, entry.expires_at.to_i, 5
  end

  test "add! returns true if token already blacklisted" do
    token = "duplicate_token"
    TokenBlacklist.add!(token)
    result = TokenBlacklist.add!(token)

    assert_equal true, result
    assert_equal 1, TokenBlacklist.count
  end

  test "revoked? returns true for blacklisted token" do
    token = "revoked_token"
    TokenBlacklist.add!(token)

    assert TokenBlacklist.revoked?(token)
  end

  test "revoked? returns false for non-blacklisted token" do
    assert_not TokenBlacklist.revoked?("non_existent_token")
  end

  test "revoked? returns false for expired token" do
    token = "expired_token"
    TokenBlacklist.create!(token_digest: Digest::SHA256.hexdigest(token), expires_at: 1.day.ago)

    assert_not TokenBlacklist.revoked?(token)
  end

  test "cleanup_expired! removes expired entries" do
    TokenBlacklist.create!(token_digest: Digest::SHA256.hexdigest("old_token"), expires_at: 1.day.ago)
    TokenBlacklist.add!("fresh_token")

    assert_equal 2, TokenBlacklist.count

    TokenBlacklist.cleanup_expired!

    assert_equal 1, TokenBlacklist.count
    fresh_digest = Digest::SHA256.hexdigest("fresh_token")
    assert_equal fresh_digest, TokenBlacklist.last.token_digest
  end

  test "active scope returns only non-expired entries" do
    TokenBlacklist.create!(token_digest: Digest::SHA256.hexdigest("old_token"), expires_at: 1.day.ago)
    TokenBlacklist.add!("fresh_token")

    assert_equal 1, TokenBlacklist.active.count
  end

  test "expired scope returns only expired entries" do
    TokenBlacklist.create!(token_digest: Digest::SHA256.hexdigest("old_token"), expires_at: 1.day.ago)
    TokenBlacklist.add!("fresh_token")

    assert_equal 1, TokenBlacklist.expired.count
  end

  test "validates presence of token_digest" do
    entry = TokenBlacklist.new(expires_at: 1.day.from_now)
    assert_not entry.valid?
    assert_includes entry.errors[:token_digest], "can't be blank"
  end

  test "validates presence of expires_at" do
    entry = TokenBlacklist.new(token_digest: "digest")
    assert_not entry.valid?
    assert_includes entry.errors[:expires_at], "can't be blank"
  end

  test "validates uniqueness of token_digest" do
    TokenBlacklist.add!("unique_token")
    entry = TokenBlacklist.new(token_digest: Digest::SHA256.hexdigest("unique_token"), expires_at: 1.day.from_now)
    assert_not entry.valid?
    assert_includes entry.errors[:token_digest], "has already been taken"
  end
end