require 'test_helper'

class FinancialSyncTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )
  end

  test 'should be valid with required attributes' do
    sync = FinancialSync.new(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :processing
    )
    assert sync.valid?
  end

  test 'should require financial_connection' do
    sync = FinancialSync.new(
      provider: 'pluggy',
      sync_type: :full,
      status: :processing
    )
    assert_not sync.valid?
    assert_includes sync.errors[:financial_connection], 'must exist'
  end

  test 'should require provider' do
    sync = FinancialSync.new(
      financial_connection: @connection,
      sync_type: :full,
      status: :processing
    )
    assert_not sync.valid?
    assert_includes sync.errors[:provider], "can't be blank"
  end

  test 'should require sync_type' do
    sync = FinancialSync.new(
      financial_connection: @connection,
      provider: 'pluggy',
      status: :processing
    )
    assert_not sync.valid?
    assert_includes sync.errors[:sync_type], "can't be blank"
  end

  test 'should require status' do
    sync = FinancialSync.new(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full
    )
    assert_not sync.valid?
    assert_includes sync.errors[:status], "can't be blank"
  end

  test 'should have default sync_type full' do
    sync = FinancialSync.new(
      financial_connection: @connection,
      provider: 'pluggy',
      status: :processing
    )
    assert_equal 'full', sync.sync_type
  end

  test 'should have default status processing' do
    sync = FinancialSync.new(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full
    )
    assert_equal 'processing', sync.status
  end

  test 'completed scope returns only completed syncs' do
    completed = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :completed
    )
    FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :processing
    )

    assert_includes FinancialSync.completed, completed
    assert_equal 1, FinancialSync.completed.count
  end

  test 'failed scope returns only failed syncs' do
    failed = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :failed,
      error_code: 'TEST_ERROR',
      error_message: 'Test error'
    )

    assert_includes FinancialSync.failed, failed
    assert_equal 1, FinancialSync.failed.count
  end

  test 'recent scope orders by started_at desc' do
    older = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :completed,
      started_at: 2.days.ago,
      finished_at: 1.day.ago
    )
    newer = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :completed,
      started_at: 1.hour.ago,
      finished_at: 30.minutes.ago
    )

    assert_equal newer, FinancialSync.recent.first
  end

  test 'duration_seconds calculates correctly' do
    sync = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :completed,
      started_at: Time.current,
      finished_at: 30.seconds.from_now
    )

    assert_in_delta 30, sync.duration_seconds, 2
  end

  test 'duration_seconds returns nil when not finished' do
    sync = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :processing,
      started_at: Time.current
    )

    assert_nil sync.duration_seconds
  end

  test 'success? returns true for completed' do
    sync = FinancialSync.new(status: :completed)
    assert sync.success?

    sync.status = :failed
    assert_not sync.success?
  end

  test 'mark_completed! updates status and counters' do
    sync = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :processing
    )

    sync.mark_completed!(records_created: 5, records_updated: 2, records_deleted: 1)

    assert_equal 'completed', sync.status
    assert_not_nil sync.finished_at
    assert_equal 5, sync.records_created
    assert_equal 2, sync.records_updated
    assert_equal 1, sync.records_deleted
  end

  test 'mark_failed! updates status and error info' do
    sync = FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :processing
    )

    sync.mark_failed!(error_code: 'CONNECTION_ERROR', error_message: 'Failed to connect')

    assert_equal 'failed', sync.status
    assert_not_nil sync.finished_at
    assert_equal 'CONNECTION_ERROR', sync.error_code
    assert_equal 'Failed to connect', sync.error_message
  end
end