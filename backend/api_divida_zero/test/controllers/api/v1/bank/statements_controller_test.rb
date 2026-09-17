require "test_helper"

class Api::V1::Bank::StatementsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Import Test",
      email: "import_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "upload returns 202 and enqueues job" do
    assert_enqueued_with(job: StatementParseJob) do
      post "/api/v1/bank/statements/upload",
           params: { file: fixture_file_upload("sample.csv", "text/csv") },
           headers: auth_header
    end

    assert_response :accepted
    body = JSON.parse(response.body)
    assert body["batch_id"].present?
    assert_equal "processing", body["status"]
  end

  test "upload rejects missing file" do
    post "/api/v1/bank/statements/upload", params: {}, headers: auth_header
    assert_response :unprocessable_entity
    assert_match(/Arquivo é obrigatório/, JSON.parse(response.body)["error"])
  end

  test "upload rejects non-allowed extension" do
    file = Tempfile.new([ "fake", ".txt" ])
    file.write("hello")
    file.rewind
    uploaded = Rack::Test::UploadedFile.new(file.path, "text/plain", original_filename: "fake.txt")

    post "/api/v1/bank/statements/upload",
         params: { file: uploaded },
         headers: auth_header

    assert_response :unprocessable_entity
    assert_match(/Formato não suportado/, JSON.parse(response.body)["error"])
  ensure
    file&.close
    file&.unlink
  end

  test "status returns processing while no transactions exist" do
    Rails.cache = ActiveSupport::Cache.lookup_store(:memory_store)
    assert_enqueued_with(job: StatementParseJob) do
      post "/api/v1/bank/statements/upload",
           params: { file: fixture_file_upload("sample.csv", "text/csv") },
           headers: auth_header
    end
    batch_id = JSON.parse(response.body)["batch_id"]

    get "/api/v1/bank/statements/#{batch_id}/status", headers: auth_header
    assert_response :ok
    status_body = JSON.parse(response.body)
    assert_equal "processing", status_body["status"]
  ensure
    Rails.cache = ActiveSupport::Cache.lookup_store(:null_store)
  end

  test "status returns done with totals after transactions created" do
    batch_id = SecureRandom.uuid
    @user.imported_transactions.create!(
      import_batch_id: batch_id, description: "A", amount: 10.0,
      date: Date.current, source: "csv_upload", status: "pending"
    )
    @user.imported_transactions.create!(
      import_batch_id: batch_id, description: "B", amount: 20.0,
      date: Date.current, source: "csv_upload", status: "duplicate",
      duplicate_reason: "exact_match"
    )

    get "/api/v1/bank/statements/#{batch_id}/status", headers: auth_header
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal "done", body["status"]
    assert_equal 2, body["total"]
    assert_equal 1, body["pending"]
    assert_equal 1, body["duplicates"]
  end

  test "status returns error when batch failed" do
    Rails.cache = ActiveSupport::Cache.lookup_store(:memory_store)
    batch_id = SecureRandom.uuid
    Rails.cache.write("bank_import_batch:#{batch_id}", { status: "error", error: "boom" })

    get "/api/v1/bank/statements/#{batch_id}/status", headers: auth_header
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal "error", body["status"]
    assert_equal "boom", body["error"]
  ensure
    Rails.cache = ActiveSupport::Cache.lookup_store(:null_store)
  end

  test "status returns not found for unknown batch" do
    get "/api/v1/bank/statements/#{SecureRandom.uuid}/status", headers: auth_header
    assert_response :not_found
  end

  test "destroy deletes batch transactions" do
    batch_id = SecureRandom.uuid
    @user.imported_transactions.create!(
      import_batch_id: batch_id, description: "A", amount: 10.0,
      date: Date.current, source: "csv_upload", status: "pending"
    )

    assert_difference "ImportedTransaction.count", -1 do
      delete "/api/v1/bank/statements/#{batch_id}", headers: auth_header
    end

    assert_response :ok
    assert_equal 1, JSON.parse(response.body)["deleted"]
  end

  test "endpoints require access token" do
    post "/api/v1/bank/statements/upload"
    assert_response :unauthorized

    get "/api/v1/bank/statements/#{SecureRandom.uuid}/status"
    assert_response :unauthorized

    delete "/api/v1/bank/statements/#{SecureRandom.uuid}"
    assert_response :unauthorized
  end

  private

  def auth_header
    { "Authorization" => "Bearer #{@tokens[:access_token]}" }
  end
end
