require 'test_helper'

class Api::V1::Bank::StatementsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @token = JsonWebToken.encode(user_id: @user.id)
    @headers = { 'Authorization' => "Bearer #{@token}" }
    @ofx_file = fixture_file_upload('test/fixtures/files/sample.ofx', 'application/ofx')
    @csv_file = fixture_file_upload('test/fixtures/files/sample.csv', 'text/csv')
  end

  test 'should return 403 when manual_import disabled' do
    FeatureFlag.disable('manual_import')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: @ofx_file }
    assert_response :forbidden
  end

  test 'should upload OFX and return batch_id' do
    FeatureFlag.enable('manual_import')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: @ofx_file }
    assert_response :accepted

    json = JSON.parse(response.body)
    assert json['batch_id']
    assert json['connection_id']
    assert_equal 'processing', json['status']
  end

  test 'should upload CSV and return batch_id' do
    FeatureFlag.enable('manual_import')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: @csv_file }
    assert_response :accepted

    json = JSON.parse(response.body)
    assert json['batch_id']
  end

  test 'should reject unsupported file format' do
    FeatureFlag.enable('manual_import')
    txt_file = fixture_file_upload('test/fixtures/files/sample.txt', 'text/plain')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: txt_file }
    assert_response :unprocessable_entity
  end

  test 'should reject file too large' do
    FeatureFlag.enable('manual_import')
    large_file = fixture_file_upload('test/fixtures/files/large.ofx', 'application/ofx')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: large_file }
    assert_response :unprocessable_entity
  end

  test 'should return status for valid batch_id' do
    FeatureFlag.enable('manual_import')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: @ofx_file }
    json = JSON.parse(response.body)
    batch_id = json['batch_id']

    get api_v1_bank_statements_status_url(batch_id: batch_id), headers: @headers
    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal batch_id, json['batch_id']
  end

  test 'should return 404 for invalid batch_id' do
    get api_v1_bank_statements_status_url(batch_id: 'invalid'), headers: @headers
    assert_response :not_found
  end

  test 'should delete import batch' do
    FeatureFlag.enable('manual_import')

    post api_v1_bank_statements_upload_url, headers: @headers, params: { file: @ofx_file }
    json = JSON.parse(response.body)
    batch_id = json['batch_id']

    delete api_v1_bank_statements_destroy_url(batch_id: batch_id), headers: @headers
    assert_response :ok
  end
end