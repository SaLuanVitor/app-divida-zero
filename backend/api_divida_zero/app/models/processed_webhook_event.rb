class ProcessedWebhookEvent < ApplicationRecord
  validates :event_id, presence: true, uniqueness: true
  validates :event_type, presence: true

  scope :recent, -> { where('created_at > ?', 7.days.ago) }

  def self.processed?(event_id)
    exists?(event_id: event_id)
  end

  def self.mark_processed!(event_id, event_type)
    create!(event_id: event_id, event_type: event_type)
  rescue ActiveRecord::RecordNotUnique
    false
  end

  # Limpeza de eventos antigos (executar via job recorrente)
  def self.cleanup_old!
    where('created_at < ?', 30.days.ago).delete_all
  end
end