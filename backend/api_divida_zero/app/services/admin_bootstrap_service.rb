class AdminBootstrapService
  class BootstrapError < StandardError; end

  class << self
    def call!(require_env: Rails.env.production?)
      email = ENV.fetch("ADMIN_EMAIL", "").to_s.strip.downcase
      password = ENV.fetch("ADMIN_PASSWORD", "").to_s
      name = ENV.fetch("ADMIN_NAME", "Administrador").to_s.strip
      name = "Administrador" if name.blank?

      if require_env && (email.blank? || password.blank?)
        raise BootstrapError, "ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios para bootstrap de admin em produção."
      end

      return false if email.blank? || password.blank?

      user = User.find_or_initialize_by(email: email)
      user.name = name if user.name.blank?
      user.role = "admin"
      user.active = true
      user.password = password
      user.password_confirmation = password

      user.save! if user.new_record? || user.changed?
      true
    end
  end
end
