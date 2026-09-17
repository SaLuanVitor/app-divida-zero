class ImportedTransaction < ApplicationRecord
  belongs_to :user
  belongs_to :duplicate_of, class_name: "FinancialRecord", optional: true
  belongs_to :financial_record, optional: true

  validates :import_batch_id, presence: true
  validates :description, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validates :source, presence: true, inclusion: { in: %w[ofx_upload csv_upload] }
  validates :status, inclusion: { in: %w[pending duplicate accepted rejected] }

  scope :pending, -> { where(status: "pending") }
  scope :duplicate, -> { where(status: "duplicate") }
  scope :accepted, -> { where(status: "accepted") }
  scope :rejected, -> { where(status: "rejected") }
  scope :pending_or_duplicate, -> { where(status: %w[pending duplicate]) }
  scope :from_batch, ->(batch_id) { where(import_batch_id: batch_id) }

  def accept!
    update!(status: "accepted")
  end
end
