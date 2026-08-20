# Story 4.2 — OFX/CSV Parser Services

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing
> **Story:** 4.2 — OFX/CSV Parser Services
> **Prioridade:** Alta
> **Dependências:** Story 4.1 (model + migration)

---

## Acceptance Criteria

- [ ] AC-01: `Bank::FormatDetector` identifica corretamente OFX vs CSV vs unknown
- [ ] AC-02: `Bank::OfxParser` parseia OFX 1.x (SGML) e retorna transações normalizadas
- [ ] AC-03: `Bank::OfxParser` parseia OFX 2.x (XML/QFX) e retorna transações normalizadas
- [ ] AC-04: `Bank::CsvParser` detecta encoding (UTF-8, ISO-8859-1, Windows-1252)
- [ ] AC-05: `Bank::CsvParser` detecta delimitador (, ; tab)
- [ ] AC-06: `Bank::CsvParser` detecta colunas por padrões de header (data, valor, descrição)
- [ ] AC-07: `Bank::CsvParser` parseia CSV de Nubank, Inter, Itaú, Bradesco
- [ ] AC-08: `Bank::StatementParsingService` orquestra detector + parser + retorno
- [ ] AC-09: Formato inválido levanta `Bank::UnsupportedFormatError`
- [ ] AC-10: Transações sem descrição viram "Transação sem descrição"
- [ ] AC-11: `gem "ofx"` adicionada ao Gemfile e instalada
- [ ] AC-12: Testes unitários para cada parser com fixtures reais

## Files

### Gemfile

```ruby
gem "ofx", "~> 2.2"
```

### FormatDetector

```ruby
# app/services/bank/format_detector.rb
module Bank
  class UnsupportedFormatError < StandardError; end

  class FormatDetector
    def self.detect(file_path)
      content = File.read(file_path, 1024)
      if content.include?("OFXHEADER") || content.include?("<OFX>")
        :ofx
      elsif content.match?(/[;,|\t]/)
        :csv
      else
        raise UnsupportedFormatError, "Formato não reconhecido. Use OFX ou CSV."
      end
    end
  end
end
```

### OfxParser

```ruby
# app/services/bank/ofx_parser.rb
module Bank
  class OfxParser
    def parse(file_path)
      ofx = OFX::Parser.parse_file(file_path)
      ofx.accounts.flat_map { |account| parse_account(account) }
    rescue => e
      raise Bank::UnsupportedFormatError, "Erro ao processar OFX: #{e.message}"
    end

    private

    def parse_account(account)
      account.transactions.map do |txn|
        {
          fit_id: txn.fit_id,
          description: normalize_description(txn.name, txn.memo),
          amount: txn.amount.abs,
          date: txn.date,
          flow_type: txn.amount.negative? ? "expense" : "income",
          original_category: txn.category.presence,
          check_number: txn.check_number
        }
      end
    end

    def normalize_description(name, memo)
      desc = [name, memo].compact.map(&:strip).reject(&:empty?)
      desc.any? ? desc.join(" - ") : "Transação sem descrição"
    end
  end
end
```

### CsvParser

```ruby
# app/services/bank/csv_parser.rb
require "csv"

module Bank
  class CsvParser
    COLUMN_PATTERNS = {
      date: [/data|date|vencimento|lançamento|lança/i],
      description: [/descriç|historico|histórico|nome|titulo|título|identificação|estabelecimento/i],
      amount: [/valor|value|amount|montante/i],
      type: [/tipo|type|crédito|débito|entrada|saída|flow|natureza/i],
      category: [/categoria|category|grupo/i]
    }.freeze

    def parse(file_path)
      raw = File.read(file_path)
      encoding = detect_encoding(raw)
      content = raw.encode("UTF-8", encoding, invalid: :replace, undef: :replace)
      delimiter = detect_delimiter(content)
      rows = CSV.parse(content, col_sep: delimiter, headers: true)
      column_map = detect_columns(rows.headers)

      rows.map { |row| build_transaction(row, column_map) }
    rescue => e
      raise Bank::UnsupportedFormatError, "Erro ao processar CSV: #{e.message}"
    end

    private

    def detect_encoding(content)
      if content.force_encoding("UTF-8").valid_encoding?
        "UTF-8"
      elsif content.force_encoding("ISO-8859-1").valid_encoding?
        "ISO-8859-1"
      else
        "Windows-1252"
      end
    end

    def detect_delimiter(content)
      lines = content.lines[0..4].join
      { "," => lines.count(","), ";" => lines.count(";"), "\t" => lines.count("\t") }
        .max_by { |_, count| count }
        .first
    end

    def detect_columns(headers)
      map = {}
      headers.each do |header|
        COLUMN_PATTERNS.each do |key, patterns|
          map[key] = header if patterns.any? { |p| header.to_s.match?(p) }
        end
      end
      map
    end

    def build_transaction(row, col_map)
      raw_amount = row[col_map[:amount]].to_s.strip.gsub(/[R$\s.]/, "").gsub(",", ".")
      amount = raw_amount.to_f.abs
      flow_type = if col_map[:type]
                    type_val = row[col_map[:type]].to_s.downcase
                    type_val.match?(/(crédito|credito|entrada|receita|income)/i) ? "income" : "expense"
                  else
                    raw_amount.start_with?("-") ? "expense" : "income"
                  end

      {
        description: row[col_map[:description]].to_s.strip.presence || "Transação sem descrição",
        amount: amount,
        date: parse_date(row[col_map[:date]].to_s.strip),
        flow_type: flow_type,
        original_category: col_map[:category] ? row[col_map[:category]].to_s.strip.presence : nil
      }
    end

    def parse_date(str)
      # Tenta DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
      if str.match?(%r{\d{2}/\d{2}/\d{4}})
        Date.strptime(str, "%d/%m/%Y")
      elsif str.match?(/\d{4}-\d{2}-\d{2}/)
        Date.parse(str)
      elsif str.match?(%r{\d{2}/\d{2}/\d{2}})
        Date.strptime(str, "%d/%m/%y")
      else
        Date.parse(str)
      end
    rescue
      Date.current
    end
  end
end
```

### StatementParsingService

```ruby
# app/services/bank/statement_parsing_service.rb
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
```

## Test Fixtures

Criar fixtures de teste em `test/fixtures/files/`:
- `sample.ofx` — OFX 1.x com 3 transações
- `sample.qfx` — OFX 2.x (QFX) com 2 transações
- `sample.csv` — CSV Nubank-style (UTF-8, vírgula)
- `sample_semicolon.csv` — CSV Itaú-style (ISO-8859-1, ponto-e-vírgula)
