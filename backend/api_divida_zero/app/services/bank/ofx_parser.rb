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
        .gsub(/&(?!(amp|lt|gt|quot|apos);)/, "&amp;")
    end

    def parse_transaction(trn)
      {
        fit_id: extract_text(trn, "FITID"),
        description: normalize_description(
          extract_text(trn, "NAME"),
          extract_text(trn, "MEMO")
        ),
        amount: extract_amount(trn),
        date: parse_date(extract_text(trn, "DTPOSTED")),
        flow_type: determine_flow_type(trn, extract_text(trn, "TRNAMT")),
        original_category: extract_text(trn, "TRNTYPE").presence,
        check_number: extract_text(trn, "CHECKNUM").presence || extract_text(trn, "CHKNUM").presence
      }
    end

    def extract_text(node, tag)
      node.at_xpath(tag)&.text&.strip || ""
    end

    def extract_amount(trn)
      amt_str = extract_text(trn, "TRNAMT")
      BigDecimal(amt_str).abs.to_f
    rescue
      0.0
    end

    def parse_date(date_str)
      Date.strptime(date_str, "%Y%m%d")
    rescue
      Date.current
    end

    def determine_flow_type(trn, trn_amt)
      trn_type = extract_text(trn, "TRNTYPE")
      return "expense" if %w[DEBIT DEB].include?(trn_type)
      return "income" if %w[CREDIT CRED DEP].include?(trn_type)

      trn_amt.start_with?("-") || trn_amt.to_f.negative? ? "expense" : "income"
    end

    def normalize_description(name, memo)
      desc = [name, memo].compact.map(&:strip).reject(&:empty?)
      desc.any? ? desc.join(" - ") : "Transação sem descrição"
    end
  end
end
