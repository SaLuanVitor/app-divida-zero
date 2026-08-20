require "test_helper"

module Bank
  class DeduplicationServiceTest < ActiveSupport::TestCase
    setup do
      @user = User.create!(
        name: "Dedup Test",
        email: "dedup_#{Time.now.to_i}@example.com",
        password: "senha1234",
        password_confirmation: "senha1234"
      )
      @record = @user.financial_records.create!(
        title: "Supermercado Extra", description: "Compras",
        record_type: "launch", flow_type: "expense",
        amount: 350.0, status: "pending",
        due_date: Date.new(2026, 7, 10),
        recurring: false, recurrence_type: "none",
        recurrence_count: 1, installments_total: 1,
        installment_number: 1
      )
    end

    test "detects exact duplicate by amount, date and description" do
      transactions = [
        { description: "Supermercado Extra", amount: 350.0, date: Date.new(2026, 7, 10), fit_id: nil }
      ]
      result = DeduplicationService.detect(@user, transactions)
      assert_equal "duplicate", result[0][:status]
      assert_equal "exact_match", result[0][:duplicate_reason]
    end

    test "detects fuzzy duplicate within 3 days" do
      transactions = [
        { description: "Supermercado Extra - Compras", amount: 350.0, date: Date.new(2026, 7, 12), fit_id: nil }
      ]
      result = DeduplicationService.detect(@user, transactions)
      assert_equal "duplicate", result[0][:status]
      assert_equal "fuzzy_match", result[0][:duplicate_reason]
    end

    test "marks as pending when no duplicate found" do
      transactions = [
        { description: "Transação Única", amount: 100.0, date: Date.new(2026, 8, 1), fit_id: nil }
      ]
      result = DeduplicationService.detect(@user, transactions)
      assert_equal "pending", result[0][:status]
    end

    test "detects fit_id duplicate" do
      @user.imported_transactions.create!(
        import_batch_id: "old", description: "Test",
        amount: 350.0, date: Date.new(2026, 7, 10),
        source: "ofx_upload", status: "accepted",
        fit_id: "OFX-001"
      )
      transactions = [
        { description: "Supermercado", amount: 350.0, date: Date.new(2026, 7, 10), fit_id: "OFX-001" }
      ]
      result = DeduplicationService.detect(@user, transactions)
      assert_equal "duplicate", result[0][:status]
    end

    test "normalize strips special chars and downcases" do
      assert_equal "supermercado extra", DeduplicationService.normalize("Supermercado Extra!")
      assert_equal "", DeduplicationService.normalize(nil)
    end

    test "levenshtein distance works" do
      assert_equal 0, DeduplicationService.levenshtein("abc", "abc")
      assert_equal 3, DeduplicationService.levenshtein("abc", "")
      assert_equal 3, DeduplicationService.levenshtein("", "abc")
    end

    test "similarity returns 1.0 for identical strings" do
      assert_equal 1.0, DeduplicationService.similarity("test", "test")
    end

    test "similarity returns 0.0 for nil" do
      assert_equal 0.0, DeduplicationService.similarity(nil, "test")
      assert_equal 0.0, DeduplicationService.similarity("test", nil)
    end
  end
end
