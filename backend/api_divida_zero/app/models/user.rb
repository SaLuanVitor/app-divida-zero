class User < ApplicationRecord
  has_secure_password

  has_many :financial_records, dependent: :destroy

  before_validation :normalize_email

  validates :name,
            presence: { message: "Nome é obrigatório." },
            length: {
              minimum: 2,
              maximum: 120,
              too_short: "Nome deve ter no mínimo %{count} caracteres.",
              too_long: "Nome deve ter no máximo %{count} caracteres."
            }

  validates :email,
            presence: { message: "E-mail é obrigatório." },
            uniqueness: { case_sensitive: false, message: "E-mail já está em uso." },
            format: { with: URI::MailTo::EMAIL_REGEXP, message: "E-mail inválido." }

  validates :password,
            presence: { message: "Senha é obrigatória." },
            length: { minimum: 8, too_short: "Senha deve ter no mínimo %{count} caracteres." },
            allow_nil: true

  def public_payload
    {
      id: id,
      name: name,
      email: email
    }
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
