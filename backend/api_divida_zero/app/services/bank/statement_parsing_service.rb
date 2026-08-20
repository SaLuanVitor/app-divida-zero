module Bank
  class StatementParsingService
    def self.process(batch_id:, file_path:, user_id:)
      format = Bank::FormatDetector.detect(file_path)
      parser = case format
      when :ofx then Bank::OfxParser.new
      when :csv then Bank::CsvParser.new
      else raise Bank::UnsupportedFormatError
      end

      raw_transactions = parser.parse(file_path)
      source = format == :ofx ? "ofx_upload" : "csv_upload"

      ImportedTransaction.transaction do
        raw_transactions.map do |txn|
          ImportedTransaction.create!(
            user_id: user_id,
            import_batch_id: batch_id,
            source: source,
            source_filename: File.basename(file_path),
            description: txn[:description],
            amount: txn[:amount],
            date: txn[:date],
            flow_type: txn[:flow_type],
            original_category: txn[:original_category],
            fit_id: txn[:fit_id],
            check_number: txn[:check_number],
            original_data: txn,
            status: "pending"
          )
        end
      end

      { total: raw_transactions.size, batch_id: batch_id }
    rescue Bank::UnsupportedFormatError => e
      { error: e.message, batch_id: batch_id }
    end
  end
end
