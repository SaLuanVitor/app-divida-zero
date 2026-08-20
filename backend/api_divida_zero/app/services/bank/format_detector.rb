module Bank
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
