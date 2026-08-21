require "test_helper"

class AuditLogTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Teste",
      email: "audit_test_user",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    AuditLog.delete_all
  end

  test "creates audit log with required fields" do
    log = AuditLog.create!(
      user: @user,
      action: "login",
      ip: "127.0.0.1",
      user_agent: "Test Agent"
    )

    assert log.persisted?
    assert_equal "login", log.action
    assert_equal @user.id, log.user_id
    assert_equal "127.0.0.1", log.ip
  end

  test "validates presence of action" do
    log = AuditLog.new(user: @user, ip: "127.0.0.1")
    assert_not log.valid?
    assert_includes log.errors[:action], "can't be blank"
  end

  test "validates action inclusion" do
    log = AuditLog.new(user: @user, action: "invalid_action", ip: "127.0.0.1")
    assert_not log.valid?
    assert_includes log.errors[:action], "is not included in the list"
  end

  test "valid action is accepted" do
    AuditLog::ACTIONS.each do |action|
      log = AuditLog.new(user: @user, action: action, ip: "127.0.0.1")
      assert log.valid?, "Action #{action} should be valid"
    end
  end

  test "user is optional" do
    log = AuditLog.create!(action: "login", ip: "127.0.0.1", metadata: { reason: "system" })
    assert log.persisted?
    assert_nil log.user_id
  end

  test "resource_type and resource_id are optional" do
    log = AuditLog.create!(user: @user, action: "login", resource_type: "User", resource_id: @user.id)
    assert_equal "User", log.resource_type
    assert_equal @user.id, log.resource_id
  end

  test "metadata stores JSON data" do
    log = AuditLog.create!(user: @user, action: "login", metadata: { browser: "Chrome", os: "macOS" })
    # SQLite with serialize :metadata, coder: JSON stores as Hash
    assert_equal "Chrome", log.metadata["browser"]
    assert_equal "macOS", log.metadata["os"]
  end

  test "recent scope orders by created_at desc and limits to 100" do
    105.times { |i| AuditLog.create!(user: @user, action: "login", ip: "127.0.0.1", created_at: i.minutes.ago) }
    assert_equal 100, AuditLog.recent.count
    assert AuditLog.recent.first.created_at >= AuditLog.recent.last.created_at
  end

  test "for_user scope filters by user" do
    other_user = User.create!(name: "Outro", email: "other_user", password: "senha1234", password_confirmation: "senha1234")
    AuditLog.create!(user: @user, action: "login", ip: "127.0.0.1")
    AuditLog.create!(user: other_user, action: "login", ip: "127.0.0.1")

    assert_equal 1, AuditLog.for_user(@user).count
    assert_equal 1, AuditLog.for_user(other_user).count
  end

  test "by_action scope filters by action" do
    AuditLog.create!(user: @user, action: "login", ip: "127.0.0.1")
    AuditLog.create!(user: @user, action: "logout", ip: "127.0.0.1")

    assert_equal 1, AuditLog.by_action("login").count
    assert_equal 1, AuditLog.by_action("logout").count
  end

  test "for_resource scope filters by resource type and id" do
    record = @user.financial_records.create!(title: "Test", amount: 100, due_date: Date.current, flow_type: "expense", record_type: "launch")
    AuditLog.create!(user: @user, action: "record_create", resource_type: "FinancialRecord", resource_id: record.id)

    assert_equal 1, AuditLog.for_resource("FinancialRecord", record.id).count
    assert_equal 0, AuditLog.for_resource("FinancialRecord", 999).count
  end

  test "cleanup_old_logs! deletes logs older than retention period" do
    AuditLog.create!(user: @user, action: "login", ip: "127.0.0.1", created_at: 91.days.ago)
    AuditLog.create!(user: @user, action: "login", ip: "127.0.0.1", created_at: 89.days.ago)
    AuditLog.create!(user: @user, action: "login", ip: "127.0.0.1", created_at: 1.day.ago)

    assert_equal 3, AuditLog.count

    AuditLog.cleanup_old_logs!(days: 90)

    assert_equal 2, AuditLog.count
  end
end