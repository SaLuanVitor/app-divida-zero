require "test_helper"

require_dependency "bank/format_detector"

module Bank
  class OfxParserTest < ActiveSupport::TestCase
    SAMPLE_OFX = <<~OFX
      OFXHEADER:100
      DATA:OFXSGML
      ENCODING:UTF-8

      <OFX>
        <BANKMSGSRSV1>
          <STMTTRNRS>
            <STMTRS>
              <CURDEF>BRL</CURDEF>
              <BANKTRANLIST>
                <STMTTRN>
                  <TRNTYPE>DEBIT</TRNTYPE>
                  <DTPOSTED>20260710000000</DTPOSTED>
                  <TRNAMT>-150.50</TRNAMT>
                  <FITID>OFX-001</FITID>
                  <NAME>Supermercado</NAME>
                  <MEMO>Compras do mes</MEMO>
                </STMTTRN>
                <STMTTRN>
                  <TRNTYPE>CREDIT</TRNTYPE>
                  <DTPOSTED>20260712000000</DTPOSTED>
                  <TRNAMT>5000.00</TRNAMT>
                  <FITID>OFX-002</FITID>
                  <NAME>Salario</NAME>
                  <MEMO>Pagamento mensal</MEMO>
                </STMTTRN>
              </BANKTRANLIST>
            </STMTRS>
          </STMTTRNRS>
        </BANKMSGSRSV1>
      </OFX>
    OFX

    test "parses OFX file and returns transactions" do
      Tempfile.create([ "extrato", ".ofx" ], encoding: "UTF-8") do |f|
        f.write(SAMPLE_OFX)
        f.rewind
        result = OfxParser.new.parse(f.path)
        assert_equal 2, result.length
        assert_equal "OFX-001", result[0][:fit_id]
        assert_equal 150.50, result[0][:amount]
        assert_equal "expense", result[0][:flow_type]
        assert_equal "Supermercado - Compras do mes", result[0][:description]
      end
    end

    test "parses income transaction correctly" do
      Tempfile.create([ "extrato", ".ofx" ], encoding: "UTF-8") do |f|
        f.write(SAMPLE_OFX)
        f.rewind
        result = OfxParser.new.parse(f.path)
        assert_equal "income", result[1][:flow_type]
        assert_equal 5000.00, result[1][:amount]
      end
    end

    test "raises error for invalid file" do
      assert_raises(Bank::UnsupportedFormatError) do
        Tempfile.create([ "invalid", ".ofx" ]) do |f|
          f.write("not an ofx file")
          f.rewind
          OfxParser.new.parse(f.path)
        end
      end
    end
  end
end
