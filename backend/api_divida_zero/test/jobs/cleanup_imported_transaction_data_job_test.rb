require "test_helper"

class CleanupImportedTransactionDataJobTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Cleanup Test",
      email: "cleanup_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  def create_txn(original_data:, updated_at:)
    txn = @user.imported_transactions.create!(
      import_batch_id: SecureRandom.uuid,
      description: "Transação",
      amount: 100.0,
      date: Date.current,
      source: "csv_upload",
      status: "pending",
      original_data: original_data
    )
    ImportedTransaction.where(id: txn.id).update_all(updated_at: updated_at)
    txn
  end

  test "clears original_data older than 30 days" do
    create_txn(original_data: { "description" => "antigo" }, updated_at: 40.days.ago)

    CleanupImportedTransactionDataJob.perform_now

    assert_equal({}, ImportedTransaction.last.reload.original_data)
  end

  test "keeps original_data younger than 30 days" do
    txn = create_txn(original_data: { "description" => "recente" }, updated_at: 10.days.ago)

    CleanupImportedTransactionDataJob.perform_now

    assert_equal({ "description" => "recente" }, txn.reload.original_data)
  end

  test "respects custom retention days argument" do
    create_txn(original_data: { "description" => "antigo" }, updated_at: 10.days.ago)

    CleanupImportedTransactionDataJob.perform_now(5)

    assert_equal({}, ImportedTransaction.last.reload.original_data)
  end
end
