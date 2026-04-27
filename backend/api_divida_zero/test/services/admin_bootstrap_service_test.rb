require "test_helper"

class AdminBootstrapServiceTest < ActiveSupport::TestCase
  setup do
    @original_email = ENV["ADMIN_EMAIL"]
    @original_password = ENV["ADMIN_PASSWORD"]
    @original_name = ENV["ADMIN_NAME"]
  end

  teardown do
    ENV["ADMIN_EMAIL"] = @original_email
    ENV["ADMIN_PASSWORD"] = @original_password
    ENV["ADMIN_NAME"] = @original_name
  end

  test "creates admin when credentials are present" do
    ENV["ADMIN_EMAIL"] = "bootstrap_admin"
    ENV["ADMIN_PASSWORD"] = "senha_bootstrap_123"
    ENV["ADMIN_NAME"] = "Admin Bootstrap"

    assert_difference("User.count", 1) do
      AdminBootstrapService.call!(require_env: false)
    end

    user = User.find_by(email: "bootstrap_admin")
    assert_equal "admin", user.role
    assert_equal true, user.active
    assert user.authenticate("senha_bootstrap_123")
  end

  test "is idempotent for existing admin and synchronizes password from env" do
    user = User.create!(
      name: "Admin Existente",
      email: "bootstrap_existente",
      password: "senha_antiga_123",
      password_confirmation: "senha_antiga_123"
    )

    ENV["ADMIN_EMAIL"] = user.email
    ENV["ADMIN_PASSWORD"] = "senha_nova_456"

    assert_no_difference("User.count") do
      AdminBootstrapService.call!(require_env: false)
    end

    user.reload
    assert_equal "admin", user.role
    assert_equal true, user.active
    assert user.authenticate("senha_nova_456")
  end

  test "raises when required env is missing" do
    ENV["ADMIN_EMAIL"] = nil
    ENV["ADMIN_PASSWORD"] = nil

    assert_raises(AdminBootstrapService::BootstrapError) do
      AdminBootstrapService.call!(require_env: true)
    end
  end
end
