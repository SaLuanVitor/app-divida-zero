require "test_helper"

class PasswordResetMailerTest < ActionMailer::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Reset",
      email: "usuario_reset@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "reset_email renders headers and body" do
    raw_token = "abc123def456"

    email = PasswordResetMailer.reset_email(@user, raw_token)

    assert_equal [ "onboarding@resend.dev" ], email.from
    assert_equal [ @user.email ], email.to
    assert_equal "Redefinição de senha — App Dívida Zero", email.subject

    assert_match raw_token, email.html_part.body.to_s
    assert_match raw_token, email.text_part.body.to_s
    assert_match @user.name, email.html_part.body.to_s
    assert_match "30 minutos", email.html_part.body.to_s
  end

  test "reset_email delivers via deliver_now" do
    raw_token = "xyz789"

    assert_emails 1 do
      PasswordResetMailer.reset_email(@user, raw_token).deliver_now
    end
  end
end
