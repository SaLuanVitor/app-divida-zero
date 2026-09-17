require 'test_helper'

class Webhooks::PluggyWebhooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :pending
    )
    @secret = 'webhook_secret_123'
    Setting.set('pluggy.webhook_secret', @secret)
  end

  test 'should reject without signature' do
    post webhooks_pluggy_url, params: { event: 'item/created', eventId: 'evt_1' }
    assert_response :unauthorized
  end

  test 'should reject with invalid signature' do
    post webhooks_pluggy_url,
         params: { event: 'item/created', eventId: 'evt_1' },
         headers: { 'Pluggy-Signature' => 'sha256=invalid' }
    assert_response :unauthorized
  end

  test 'should accept valid signature and enqueue job' do
    payload = { event: 'item/created', eventId: 'evt_123', item: { id: 'item_123', status: 'active' } }
    signature = OpenSSL::HMAC.hexdigest('SHA256', @secret, payload.to_json)

    assert_enqueued_with(job: WebhookProcessingJob, args: hash_including(event_type: 'item/created', event_id: 'evt_123')) do
      post webhooks_pluggy_url,
           params: payload,
           headers: { 'Pluggy-Signature' => "sha256=#{signature}" }
    end

    assert_response :ok
  end

  test 'should not process duplicate event_id' do
    ProcessedWebhookEvent.create!(event_id: 'evt_dup', event_type: 'item/created')

    payload = { event: 'item/created', eventId: 'evt_dup' }
    signature = OpenSSL::HMAC.hexdigest('SHA256', @secret, payload.to_json)

    post webhooks_pluggy_url,
         params: payload,
         headers: { 'Pluggy-Signature' => "sha256=#{signature}" }

    assert_response :ok
    # Job não deve ser enfileirado novamente
    assert_no_enqueued_jobs only: WebhookProcessingJob
  end

  test 'should return bad_request for missing event' do
    payload = { eventId: 'evt_1' }
    signature = OpenSSL::HMAC.hexdigest('SHA256', @secret, payload.to_json)

    post webhooks_pluggy_url,
         params: payload,
         headers: { 'Pluggy-Signature' => "sha256=#{signature}" }

    assert_response :bad_request
  end
end