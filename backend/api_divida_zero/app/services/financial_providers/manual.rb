module FinancialProviders
  class Manual < Base
    def initialize(config = {})
      @config = config
    end

    def transactions(connection, params = {})
      file_path = connection.metadata&.dig('file_path')
      format = connection.metadata&.dig('format') || 'ofx'

      return [] unless file_path && File.exist?(file_path)

      parser = format == 'csv' ? Bank::CsvParser.new : Bank::OfxParser.new
      raw = parser.parse(file_path)

      raw.map do |txn|
        {
          description: txn[:description],
          amount: txn[:amount].to_f,
          date: txn[:date],
          flow_type: txn[:flow_type] || 'expense',
          fit_id: txn[:fit_id] || Digest::MD5.hexdigest("#{txn[:description]}#{txn[:amount]}#{txn[:date]}"),
          original_category: txn[:original_category],
          status: 'pending'
        }
      end
    rescue StandardError => e
      Rails.logger.error("Manual adapter parse error: #{e.message}")
      []
    end

    def create_connection(user)
      raise NotImplementedError, 'Manual provider does not support create_connection'
    end

    def refresh_connection(connection)
      raise NotImplementedError, 'Manual provider does not support refresh_connection'
    end

    def disconnect_connection(connection)
      # No-op for manual connections
    end

    def accounts(connection)
      []
    end

    def institutions
      []
    end

    def capabilities
      {
        accounts: false,
        transactions: true,
        credit_cards: false,
        investments: false,
        automatic_sync: false,
        manual_sync: true
      }
    end

    def ping
      true
    end
  end
end