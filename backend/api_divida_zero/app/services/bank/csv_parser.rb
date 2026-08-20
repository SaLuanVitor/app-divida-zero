require "csv"

module Bank
  class CsvParser
    COLUMN_PATTERNS = {
      date: [/data|date|vencimento|lançamento|lança/i],
      description: [/descriç|descricao|historico|histórico|nome|titulo|título|identificação|estabelecimento/i],
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
      counts = { "," => lines.count(","), ";" => lines.count(";"), "\t" => lines.count("\t") }
      top_delim, top_count = counts.max_by { |_, count| count }
      raise Bank::UnsupportedFormatError, "Delimitador não reconhecido" if top_count.zero?
      top_delim
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
      raw = row[col_map[:amount]].to_s.strip.gsub(/[R$\s]/, "")
      raw_amount = raw.include?(",") ? raw.gsub(".", "").gsub(",", ".") : raw
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
