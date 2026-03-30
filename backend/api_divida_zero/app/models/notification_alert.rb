class NotificationAlert < ApplicationRecord
  ALERT_TYPES = %w[due_today near_due overdue].freeze

  belongs_to :user

  validates :alert_type, inclusion: { in: ALERT_TYPES, message: "Tipo de alerta invalido." }
  validates :title, presence: { message: "Titulo e obrigatorio." }
  validates :message, presence: { message: "Mensagem e obrigatoria." }
  validates :window_key, presence: { message: "Janela do alerta e obrigatoria." }
  validates :due_count, numericality: { only_integer: true, greater_than_or_equal_to: 0, message: "Quantidade invalida." }

  scope :recent_first, -> { order(created_at: :desc) }
  scope :unread, -> { where(read_at: nil) }

  def serialize
    {
      id: id,
      alert_type: alert_type,
      title: title,
      message: message,
      due_count: due_count,
      window_key: window_key,
      metadata: metadata || {},
      read: read_at.present?,
      created_at: created_at
    }
  end
end

