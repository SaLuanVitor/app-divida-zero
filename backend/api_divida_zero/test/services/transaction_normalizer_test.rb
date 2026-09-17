require 'test_helper'

class TransactionNormalizerTest < ActiveSupport::TestCase
  test 'normalize_pluggy maps DEBIT to expense' do
    txn = {
      'id' => 'txn_123',
      'description' => 'SUPERMERCADO',
      'amount' => 150.00,
      'date' => '2026-09-15',
      'type' => 'DEBIT',
      'status' => 'POSTED',
      'category' => 'Alimentação'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal 'SUPERMERCADO', result[:description]
    assert_equal 150.00, result[:amount]
    assert_equal Date.new(2026, 9, 15), result[:date]
    assert_equal 'expense', result[:flow_type]
    assert_equal 'Alimentação', result[:category]
    assert_equal 'txn_123', result[:fit_id]
    assert_equal 'accepted', result[:status]
  end

  test 'normalize_pluggy maps CREDIT to income' do
    txn = {
      'id' => 'txn_456',
      'description' => 'SALARIO',
      'amount' => 5000.00,
      'date' => '2026-09-01',
      'type' => 'CREDIT',
      'status' => 'POSTED'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal 'income', result[:flow_type]
  end

  test 'normalize_pluggy maps PIX_IN to income' do
    txn = {
      'id' => 'txn_789',
      'description' => 'PIX RECEBIDO',
      'amount' => 100.00,
      'date' => '2026-09-10',
      'type' => 'PIX_IN',
      'status' => 'PENDING'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal 'income', result[:flow_type]
    assert_equal 'pending', result[:status]
  end

  test 'normalize_pluggy maps PIX_OUT to expense' do
    txn = {
      'id' => 'txn_999',
      'description' => 'PIX ENVIADO',
      'amount' => 50.00,
      'date' => '2026-09-12',
      'type' => 'PIX_OUT',
      'status' => 'POSTED'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal 'expense', result[:flow_type]
  end

  test 'normalize_pluggy handles unknown type as expense' do
    txn = {
      'id' => 'txn_111',
      'description' => 'DESCONHECIDO',
      'amount' => 10.00,
      'date' => '2026-09-13',
      'type' => 'UNKNOWN_TYPE',
      'status' => 'POSTED'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal 'expense', result[:flow_type]
  end

  test 'normalize_pluggy maps cancelled status to rejected' do
    txn = {
      'id' => 'txn_222',
      'description' => 'CANCELADO',
      'amount' => 100.00,
      'date' => '2026-09-14',
      'type' => 'DEBIT',
      'status' => 'CANCELLED'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal 'rejected', result[:status]
  end

  test 'normalize_pluggy parses various date formats' do
    txn1 = { 'id' => '1', 'description' => 'A', 'amount' => 10, 'date' => '2026-09-15', 'type' => 'DEBIT', 'status' => 'POSTED' }
    txn2 = { 'id' => '2', 'description' => 'B', 'amount' => 20, 'date' => Date.new(2026, 9, 16), 'type' => 'DEBIT', 'status' => 'POSTED' }
    txn3 = { 'id' => '3', 'description' => 'C', 'amount' => 30, 'date' => Time.new(2026, 9, 17), 'type' => 'DEBIT', 'status' => 'POSTED' }

    results = TransactionNormalizer.normalize([txn1, txn2, txn3], provider: :pluggy)

    assert_equal Date.new(2026, 9, 15), results[0][:date]
    assert_equal Date.new(2026, 9, 16), results[1][:date]
    assert_equal Date.new(2026, 9, 17), results[2][:date]
  end

  test 'normalize_pluggy handles invalid date gracefully' do
    txn = {
      'id' => 'txn_333',
      'description' => 'INVALID DATE',
      'amount' => 10.00,
      'date' => 'invalid-date',
      'type' => 'DEBIT',
      'status' => 'POSTED'
    }

    result = TransactionNormalizer.normalize([txn], provider: :pluggy).first

    assert_equal Date.current, result[:date]
  end

  test 'normalize_manual works with manual adapter format' do
    txn = {
      description: 'COMPRA MANUAL',
      amount: 75.50,
      date: '2026-09-15',
      flow_type: 'expense',
      fit_id: 'manual_fit_123',
      original_category: 'Compras',
      status: 'pending'
    }

    result = TransactionNormalizer.normalize([txn], provider: :manual).first

    assert_equal 'COMPRA MANUAL', result[:description]
    assert_equal 75.50, result[:amount]
    assert_equal Date.new(2026, 9, 15), result[:date]
    assert_equal 'expense', result[:flow_type]
    assert_equal 'Compras', result[:category]
    assert_equal 'manual_fit_123', result[:fit_id]
    assert_equal 'pending', result[:status]
  end

  test 'normalize_manual defaults flow_type to expense' do
    txn = {
      description: 'SEM TIPO',
      amount: 10.00,
      date: '2026-09-15'
    }

    result = TransactionNormalizer.normalize([txn], provider: :manual).first

    assert_equal 'expense', result[:flow_type]
  end

  test 'normalize with empty array returns empty array' do
    result = TransactionNormalizer.normalize([], provider: :pluggy)
    assert_empty result
  end

  test 'normalize with nil returns empty array' do
    result = TransactionNormalizer.normalize(nil, provider: :pluggy)
    assert_empty result
  end

  test 'raises error for unknown provider' do
    assert_raises(ArgumentError) do
      TransactionNormalizer.normalize([], provider: :unknown)
    end
  end
end