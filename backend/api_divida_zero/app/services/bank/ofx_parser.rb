module Bank
  class OfxParser
    def parse(file_path)
      raw = File.read(file_path, encoding: "BOM|UTF-8")
      raise Bank::UnsupportedFormatError, "Arquivo OFX inválido" unless raw.match?(/<OFX>/i)

      sgml = strip_headers(raw)
      xml = sgml_to_xml(sgml)
      doc = Nokogiri::XML(xml)

      doc.css("STMTTRN").map { |trn| parse_transaction(trn) }
    rescue Bank::UnsupportedFormatError
      raise
    rescue => e
      raise Bank::UnsupportedFormatError, "Erro ao processar OFX: #{e.message}"
    end

    private

    def strip_headers(raw)
      raw.sub(/\A.*?(?=<OFX>|<ofx>)/m, "")
    end

    def sgml_to_xml(sgml)
      sgml
        .gsub(/(<\w+[^>]*)>(?=\s*<)/) { |m| "#{$1}>" }
        .gsub(/&(?!(amp|lt|gt|quot|apos);)/, "&")
    end

    def parse_transaction(trn)
      trn_amt_str = extract_text(trn, "TRNAMT")
      trn_amt = BigDecimal(trn_amt_str) rescue BigDecimal("0")
      trn_type = extract_text(trn, "TRNTYPE")

      {
        description: normalize_description(
          extract_text(trn, "NAME"),
          extract_text(trn, "MEMO")
        ),
        amount: trn_amt.abs.to_f,
        date: parse_date(extract_text(trn, "DTPOSTED")),
        flow_type: determine_flow_type(trn_type, trn_amt_str),
        fit_id: extract_text(trn, "FITID"),
        original_category: trn_type.presence,
        check_number: extract_text(trn, "CHECKNUM").presence || extract_text(trn, "CHKNUM").presence,
        status: "pending"
      }
    end

    def extract_text(node, tag)
      node.at_xpath(tag)&.text&.strip || ""
    end

    def parse_date(date_str)
      Date.strptime(date_str, "%Y%m%d")
    rescue
      Date.current
    end

    def determine_flow_type(trn_type, trn_amt_str)
      return "expense" if %w[DEBIT DEB].include?(trn_type)
      return "income" if %w[CREDIT CRED DEP].include?(trn_type)

      trn_amt_str.start_with?("-") || trn_amt_str.to_f.negative? ? "expense" : "income"
    end

    def normalize_description(name, memo)
      desc = [ name, memo ].compact.map(&:strip).reject(&:empty?)
      desc.any? ? desc.join(" - ") : "Transação sem descrição"
    end
  end
end