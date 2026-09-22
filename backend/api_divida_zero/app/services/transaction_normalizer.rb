class TransactionNormalizer
  PLUGGY_TYPE_MAP = {
    'DEBIT' => 'expense',
    'CREDIT' => 'income',
    'PIX_IN' => 'income',
    'PIX_OUT' => 'expense',
    'TED_IN' => 'income',
    'TED_OUT' => 'expense',
    'DOC_IN' => 'income',
    'DOC_OUT' => 'expense',
    'BOLETO' => 'expense',
    'FEE' => 'expense',
    'INTEREST' => 'income',
    'INVESTMENT_IN' => 'income',
    'INVESTMENT_OUT' => 'expense'
  }.freeze

  def self.normalize(transactions, provider: :pluggy)
    Array(transactions).map do |txn|
      case provider
      when :pluggy then normalize_pluggy(txn)
      when :manual then normalize_manual(txn)
      else raise ArgumentError, "Unknown provider: #{provider}"
      end
    end
  end

  def self.normalize_pluggy(txn)
    {
      description: txn['description']&.strip,
      amount: txn['amount']&.to_f&.abs || 0.0,
      date: parse_date(txn['date']),
      flow_type: map_flow_type(txn['type']),
      category: txn['category'] || txn['merchant']&.dig('category'),
      fit_id: txn['id'],
      status: map_status(txn['status']),
      provider_data: txn
    }
  end

  def self.normalize_manual(txn)
    {
      description: txn[:description]&.strip,
      amount: txn[:amount].to_f,
      date: parse_date(txn[:date]),
      flow_type: txn[:flow_type] || 'expense',
      category: txn[:original_category],
      fit_id: txn[:fit_id],
      status: txn[:status] || 'pending',
      provider_data: txn
    }
  end

  def self.parse_date(date_value)
    case date_value
    when String
      Date.parse(date_value)
    when Date, Time, DateTime
      date_value.to_date
    else
      Date.current
    end
  rescue Date::Error
    Date.current
  end

  def self.map_flow_type(pluggy_type)
    PLUGGY_TYPE_MAP[pluggy_type&.upcase] || 'expense'
  end

  def self.map_status(pluggy_status)
    case pluggy_status&.downcase
    when 'pending' then 'pending'
    when 'posted', 'settled' then 'accepted'
    when 'cancelled', 'reversed' then 'rejected'
    else 'pending'
    end
  end
end