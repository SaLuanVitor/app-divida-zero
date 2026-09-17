class FinancialSync < ApplicationRecord
  belongs_to :financial_connection

  enum :sync_type, {
    full: 0,
    incremental: 1,
    manual_upload: 2
  }, default: :full

  enum :status, {
    processing: 0,
    completed: 1,
    failed: 2
  }, default: :processing

  validates :financial_connection, presence: true
  validates :provider, presence: true
  validates :sync_type, presence: true
  validates :status, presence: true

  scope :completed, -> { where(status: :completed) }
  scope :failed, -> { where(status: :failed) }
  scope :processing, -> { where(status: :processing) }
  scope :recent, -> { order(started_at: :desc) }
  scope :today, -> { where('started_at > ?', Time.current.beginning_of_day) }
  scope :this_week, -> { where('started_at > ?', 1.week.ago) }

  def duration_seconds
    return nil unless started_at && finished_at
    (finished_at - started_at).to_i
  end

  def success?
    status == 'completed'
  end

  def mark_completed!(records_created: 0, records_updated: 0, records_deleted: 0)
    update!(
      status: :completed,
      finished_at: Time.current,
      records_created: records_created,
      records_updated: records_updated,
      records_deleted: records_deleted
    )
  end

  def mark_failed!(error_code:, error_message:)
    update!(
      status: :failed,
      finished_at: Time.current,
      error_code: error_code,
      error_message: error_message
    )
  end
end