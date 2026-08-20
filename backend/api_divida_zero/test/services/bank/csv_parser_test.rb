require "test_helper"

module Bank
  class CsvParserTest < ActiveSupport::TestCase
    test "parses CSV with comma delimiter" do
      Tempfile.create([ "extrato", ".csv" ], encoding: "UTF-8") do |f|
        f.write("data,descricao,valor\n10/07/2026,Supermercado,-150.50\n12/07/2026,Salario,5000.00\n")
        f.rewind
        result = CsvParser.new.parse(f.path)
        assert_equal 2, result.length
        assert_equal "Supermercado", result[0][:description]
        assert_equal 150.50, result[0][:amount]
        assert_equal "expense", result[0][:flow_type]
      end
    end

    test "parses CSV with semicolon delimiter" do
      Tempfile.create([ "extrato", ".csv" ], encoding: "UTF-8") do |f|
        f.write("data;descricao;valor\n10/07/2026;Supermercado;-150.50\n")
        f.rewind
        result = CsvParser.new.parse(f.path)
        assert_equal 1, result.length
        assert_equal 150.50, result[0][:amount]
      end
    end

    test "parses income transaction from CSV" do
      Tempfile.create([ "extrato", ".csv" ], encoding: "UTF-8") do |f|
        f.write("data,descricao,valor\n12/07/2026,Salario,5000.00\n")
        f.rewind
        result = CsvParser.new.parse(f.path)
        assert_equal "income", result[0][:flow_type]
        assert_equal 5000.00, result[0][:amount]
      end
    end

    test "detects flow type from type column" do
      Tempfile.create([ "extrato", ".csv" ], encoding: "UTF-8") do |f|
        f.write("data,descricao,valor,tipo\n10/07/2026,Supermercado,150.50,Débito\n12/07/2026,Salario,5000.00,Crédito\n")
        f.rewind
        result = CsvParser.new.parse(f.path)
        assert_equal "expense", result[0][:flow_type]
        assert_equal "income", result[1][:flow_type]
      end
    end

    test "raises error for invalid CSV" do
      assert_raises(Bank::UnsupportedFormatError) do
        Tempfile.create([ "invalid", ".csv" ]) do |f|
          f.write("no delimiter here at all")
          f.rewind
          CsvParser.new.parse(f.path)
        end
      end
    end
  end
end
