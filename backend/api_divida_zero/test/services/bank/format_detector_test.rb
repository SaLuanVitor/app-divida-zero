require "test_helper"

module Bank
  class FormatDetectorTest < ActiveSupport::TestCase
    test "detects ofx from OFXHEADER" do
      Tempfile.create(["test", ".ofx"]) do |f|
        f.write("OFXHEADER:100\nDATA:OFXSGML\n")
        f.rewind
        assert_equal :ofx, FormatDetector.detect(f.path)
      end
    end

    test "detects ofx from OFX tag" do
      Tempfile.create(["test", ".ofx"]) do |f|
        f.write("<OFX>\n<BANKMSGSRSV1>\n")
        f.rewind
        assert_equal :ofx, FormatDetector.detect(f.path)
      end
    end

    test "detects csv from comma delimiter" do
      Tempfile.create(["test", ".csv"]) do |f|
        f.write("data,descricao,valor\n2026-01-01,Teste,100.50\n")
        f.rewind
        assert_equal :csv, FormatDetector.detect(f.path)
      end
    end

    test "detects csv from semicolon delimiter" do
      Tempfile.create(["test", ".csv"]) do |f|
        f.write("data;descricao;valor\n2026-01-01;Teste;100.50\n")
        f.rewind
        assert_equal :csv, FormatDetector.detect(f.path)
      end
    end

    test "raises for unknown format" do
      Tempfile.create(["test", ".txt"]) do |f|
        f.write("formato desconhecido sem virgulas")
        f.rewind
        assert_raises(UnsupportedFormatError) { FormatDetector.detect(f.path) }
      end
    end
  end
end
