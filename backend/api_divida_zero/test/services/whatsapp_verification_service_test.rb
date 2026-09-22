require "test_helper"

class WhatsappVerificationServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "WA Verify Test",
      email: "wa_verify_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @phone = "+5511988887777"
    Rails.cache.clear
  end

  test "send_code rejects invalid phone" do
    result = WhatsappVerificationService.send_code(@user, phone: "abc")
    refute result[:success]
    assert_match(/inválido/i, result[:error])
  end

  test "send_code rate limits by phone after three sends in the window" do
    WhatsappProvider.stub(:configured?, false) do
      3.times do
        result = WhatsappVerificationService.send_code(@user, phone: @phone)
        assert result[:success], result[:error]
      end

      limited = WhatsappVerificationService.send_code(@user, phone: @phone)
      refute limited[:success]
      assert_match(/Limite de envios/i, limited[:error])
    end
  end

  test "verify_code confirms phone and enables opt-in" do
    WhatsappProvider.stub(:configured?, false) do
      sent = WhatsappVerificationService.send_code(@user, phone: @phone)
      assert sent[:success]
    end

    stored = Rails.cache.read("wa_verification:#{@phone}")
    assert stored.present?

    result = WhatsappVerificationService.verify_code(@user, phone: @phone, code: stored[:code])
    assert result[:success], result[:error]

    @user.reload
    assert @user.phone_verified?
    assert @user.wa_enabled_for_alert?("due_today")
  end

  test "verify_code rejects wrong code" do
    WhatsappProvider.stub(:configured?, false) do
      WhatsappVerificationService.send_code(@user, phone: @phone)
    end

    result = WhatsappVerificationService.verify_code(@user, phone: @phone, code: "000000")
    refute result[:success]
    assert_match(/inválido|expirado/i, result[:error])
  end
end
