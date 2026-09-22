require 'test_helper'

class Api::V1::Webhooks::PluggyWebhooksControllerTest < ActionDispatch::IntegrationTest
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

  test 'should accept without signature header' do
    payload = { event: 'item/created', eventId: 'evt_no_sig', itemId: 'item_123' }

    assert_enqueued_with(job: WebhookProcessingJob) do
      post api_v1_webhooks_pluggy_url, params: payload, as: :json
    end

    assert_response :ok
  end

  test 'should reject signature header without configured secret' do
    payload = { event: 'item/created', eventId: 'evt_1' }

    Setting.stub(:pluggy_webhook_secret, nil) do
      post api_v1_webhooks_pluggy_url,
           params: payload,
           headers: { 'Pluggy-Signature' => 'sha256=abc' },
           as: :json
    end

    assert_response :unauthorized
  end

  test 'should reject with invalid signature' do
    payload = { event: 'item/created', eventId: 'evt_1' }
    post api_v1_webhooks_pluggy_url,
         params: payload,
         headers: { 'Pluggy-Signature' => 'sha256=invalid' },
         as: :json
    assert_response :unauthorized
  end

  test 'should accept valid signature and enqueue job' do
    payload = { event: 'item/created', eventId: 'evt_123', item: { id: 'item_123', status: 'active' } }
    signature = OpenSSL::HMAC.hexdigest('SHA256', @secret, payload.to_json)

    assert_enqueued_with(job: WebhookProcessingJob) do
      post api_v1_webhooks_pluggy_url,
           params: payload,
           headers: { 'Pluggy-Signature' => "sha256=#{signature}" },
           as: :json
    end

    assert_response :ok
  end

  test 'should not process duplicate event_id' do
    ProcessedWebhookEvent.create!(event_id: 'evt_dup', event_type: 'item/created')

    payload = { event: 'item/created', eventId: 'evt_dup' }
    signature = OpenSSL::HMAC.hexdigest('SHA256', @secret, payload.to_json)

    post api_v1_webhooks_pluggy_url,
         params: payload,
         headers: { 'Pluggy-Signature' => "sha256=#{signature}" },
         as: :json

    assert_response :ok
    # Job não deve ser enfileirado novamente
    assert_no_enqueued_jobs only: WebhookProcessingJob
  end

  test 'should acknowledge missing event with ok' do
    payload = { eventId: 'evt_1' }
    signature = OpenSSL::HMAC.hexdigest('SHA256', @secret, payload.to_json)

    post api_v1_webhooks_pluggy_url,
         params: payload,
         headers: { 'Pluggy-Signature' => "sha256=#{signature}" },
         as: :json

    assert_response :ok
    assert_no_enqueued_jobs only: WebhookProcessingJob
  end
end
