class FinancialRecord < ApplicationRecord
  belongs_to :user

  RECORD_TYPES = %w[launch debt].freeze
  FLOW_TYPES = %w[income expense].freeze
  STATUS_TYPES = %w[pending paid received].freeze
  RECURRENCE_TYPES = %w[none daily weekly monthly yearly].freeze
  PRIORITIES = %w[low normal high].freeze

  validates :title, presence: { message: "Título é obrigatório." }
  validates :record_type, inclusion: { in: RECORD_TYPES, message: "Tipo de registro inválido." }
  validates :flow_type, inclusion: { in: FLOW_TYPES, message: "Tipo de fluxo inválido." }
  validates :status, inclusion: { in: STATUS_TYPES, message: "Status inválido." }
  validates :recurrence_type, inclusion: { in: RECURRENCE_TYPES, message: "Tipo de recorrência inválido." }
  validates :priority, inclusion: { in: PRIORITIES, message: "Prioridade inválida." }
  validates :amount, numericality: { greater_than: 0, message: "Valor deve ser maior que zero." }
  validates :due_date, presence: { message: "Data é obrigatória." }
  validates :installments_total, numericality: { greater_than: 0, message: "Número de parcelas inválido." }
  validates :installment_number, numericality: { greater_than: 0, message: "Número da parcela inválido." }
  validates :recurrence_count, numericality: { greater_than: 0, message: "Quantidade de recorrências inválida." }

  scope :from_month, ->(year, month) {
    start_date = Date.new(year, month, 1)
    where(due_date: start_date..start_date.end_of_month)
  }
end


