require 'test_helper'

class WebhookProcessingJobTest < ActiveJob::TestCase
  setup do
    @user = users(:one)
    @connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :pending
    )
  end

  test 'should process item/created event' do
    payload = { item: { id: 'item_123', status: 'active' } }

    assert_enqueued_with(job: FinancialSyncJob, args: { financial_connection_id: @connection.id, sync_type: :full }) do
      WebhookProcessingJob.perform_now(
        event_type: 'item/created',
        event_id: 'evt_1',
        payload: payload
      )
    end

    @connection.reload
    assert_equal 'active', @connection.status
    assert ProcessedWebhookEvent.exists?(event_id: 'evt_1')
  end

  test 'should process item/updated event' do
    @connection.update!(status: :active)
    payload = { item: { id: 'item_123', status: 'error', error: 'Token expired' } }

    WebhookProcessingJob.perform_now(
      event_type: 'item/updated',
      event_id: 'evt_2',
      payload: payload
    )

    @connection.reload
    assert_equal 'error', @connection.status
    assert_equal 'Token expired', @connection.last_sync_error
  end

  test 'should process item/error event' do
    payload = { item: { id: 'item_123', status: 'error', error: 'Invalid credentials' } }

    WebhookProcessingJob.perform_now(
      event_type: 'item/error',
      event_id: 'evt_3',
      payload: payload
    )

    @connection.reload
    assert_equal 'error', @connection.status
    assert_equal 'Invalid credentials', @connection.last_sync_error
  end

  test 'should process item/deleted event' do
    payload = { item: { id: 'item_123', status: 'deleted' } }

    WebhookProcessingJob.perform_now(
      event_type: 'item/deleted',
      event_id: 'evt_4',
      payload: payload
    )

    @connection.reload
    assert_equal 'disconnected', @connection.status
  end

  test 'should process transactions/created event as incremental sync' do
    payload = { item: { id: 'item_123' } }

    assert_enqueued_with(job: FinancialSyncJob, args: { financial_connection_id: @connection.id, sync_type: :incremental }) do
      WebhookProcessingJob.perform_now(
        event_type: 'transactions/created',
        event_id: 'evt_5',
        payload: payload
      )
    end
  end

  test 'should process item/waiting_user_input as action_required' do
    payload = { item: { id: 'item_123', error: 'MFA required' } }

    WebhookProcessingJob.perform_now(
      event_type: 'item/waiting_user_input',
      event_id: 'evt_6',
      payload: payload
    )

    @connection.reload
    assert_equal 'action_required', @connection.status
    assert_equal 'MFA required', @connection.last_sync_error
  end

  test 'should not process duplicate event_id' do
    ProcessedWebhookEvent.create!(event_id: 'evt_dup', event_type: 'item/created')

    WebhookProcessingJob.perform_now(
      event_type: 'item/created',
      event_id: 'evt_dup',
      payload: { item: { id: 'item_123', status: 'active' } }
    )

    # Não deve enfileirar novo sync
    assert_no_enqueued_jobs only: FinancialSyncJob
  end

  test 'should not crash if connection not found' do
    payload = { item: { id: 'nonexistent', status: 'active' } }

    assert_nothing_raised do
      WebhookProcessingJob.perform_now(
        event_type: 'item/created',
        event_id: 'evt_7',
        payload: payload
      )
    end
  end

  test 'should not crash on unknown event type' do
    assert_nothing_raised do
      WebhookProcessingJob.perform_now(
        event_type: 'unknown/event',
        event_id: 'evt_8',
        payload: { item: { id: 'item_123' } }
      )
    end

    assert ProcessedWebhookEvent.exists?(event_id: 'evt_8')
  end
end