require "test_helper"

class WelcomeMailerTest < ActionMailer::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Bem Vindo",
      email: "usuario_bem_vindo@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "welcome renders headers and body" do
    email = WelcomeMailer.welcome(@user)

    assert_equal [ "onboarding@resend.dev" ], email.from
    assert_equal [ @user.email ], email.to
    assert_equal "Bem-vindo(a) ao App Dívida Zero!", email.subject

    assert_match @user.name, email.html_part.body.to_s
    assert_match @user.name, email.text_part.body.to_s
  end

  test "welcome delivers via deliver_now" do
    assert_emails 1 do
      WelcomeMailer.welcome(@user).deliver_now
    end
  end
end
