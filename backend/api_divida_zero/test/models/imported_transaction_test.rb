require "test_helper"

class ImportedTransactionTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Imported Txn",
      email: "imported_#{Time.now.to_i}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "creates valid imported transaction" do
    txn = @user.imported_transactions.create!(
      import_batch_id: "batch-1",
      description: "Supermercado",
      amount: 150.50,
      date: Date.new(2026, 7, 10),
      source: "ofx_upload",
      status: "pending"
    )
    assert txn.persisted?
    assert_equal "pending", txn.status
    assert_equal @user, txn.user
  end

  test "validates presence of required fields" do
    txn = @user.imported_transactions.new
    refute txn.valid?
    assert_includes txn.errors[:import_batch_id], "can't be blank"
    assert_includes txn.errors[:description], "can't be blank"
    assert_includes txn.errors[:amount], "can't be blank"
    assert_includes txn.errors[:date], "can't be blank"
    assert_includes txn.errors[:source], "can't be blank"
  end

  test "validates amount is positive" do
    txn = @user.imported_transactions.new(
      import_batch_id: "b1", description: "Test",
      amount: 0, date: Date.today, source: "csv_upload",
      status: "pending"
    )
    refute txn.valid?
    assert_includes txn.errors[:amount], "must be greater than 0"
  end

  test "validates source inclusion" do
    txn = @user.imported_transactions.new(
      import_batch_id: "b1", description: "Test",
      amount: 10, date: Date.today, source: "manual",
      status: "pending"
    )
    refute txn.valid?
    assert_includes txn.errors[:source], "is not included in the list"
  end

  test "validates status inclusion" do
    txn = @user.imported_transactions.new(
      import_batch_id: "b1", description: "Test",
      amount: 10, date: Date.today, source: "ofx_upload",
      status: "invalid"
    )
    refute txn.valid?
    assert_includes txn.errors[:status], "is not included in the list"
  end

  test "accept! transitions status to accepted" do
    txn = @user.imported_transactions.create!(
      import_batch_id: "b1", description: "Test",
      amount: 10, date: Date.today, source: "csv_upload",
      status: "pending"
    )
    txn.accept!
    assert_equal "accepted", txn.status
  end

  test "pending scope returns only pending" do
    @user.imported_transactions.create!(
      import_batch_id: "b1", description: "A",
      amount: 10, date: Date.today, source: "ofx_upload",
      status: "pending"
    )
    @user.imported_transactions.create!(
      import_batch_id: "b2", description: "B",
      amount: 20, date: Date.today, source: "ofx_upload",
      status: "accepted"
    )
    assert_equal 1, @user.imported_transactions.pending.count
  end

  test "from_batch scope filters by batch" do
    @user.imported_transactions.create!(
      import_batch_id: "batch-x", description: "A",
      amount: 10, date: Date.today, source: "ofx_upload",
      status: "pending"
    )
    @user.imported_transactions.create!(
      import_batch_id: "batch-y", description: "B",
      amount: 20, date: Date.today, source: "ofx_upload",
      status: "pending"
    )
    assert_equal 1, ImportedTransaction.from_batch("batch-x").count
  end
end
