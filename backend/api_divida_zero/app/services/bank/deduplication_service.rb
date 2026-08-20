module Bank
  class DeduplicationService
    def self.detect(user, transactions)
      existing = build_existing_index(user)
      transactions.map do |txn|
        duplicate = find_duplicate(user, txn, existing)
        if duplicate
          txn.merge(
            status: "duplicate",
            duplicate_reason: duplicate[:reason],
            duplicate_of_id: duplicate[:record_id]
          )
        else
          txn.merge(status: "pending")
        end
      end
    end

    private

    def self.build_existing_index(user)
      six_months_ago = Date.current - 6.months
      user.financial_records
          .where(due_date: six_months_ago..)
          .select(:id, :title, :amount, :due_date)
          .map { |r| { id: r.id, title: normalize(r.title), amount: r.amount, date: r.due_date } }
    end

    def self.find_duplicate(user, txn, existing)
      normalized_desc = normalize(txn[:description])

      if txn[:fit_id].present?
        match = user.imported_transactions.where(fit_id: txn[:fit_id]).first
        return { reason: "fit_id", record_id: match.id } if match
      end

      exact = existing.find do |e|
        e[:amount] == txn[:amount] &&
          e[:date] == txn[:date] &&
          similarity(e[:title], normalized_desc) > 0.9
      end
      return { reason: "exact_match", record_id: exact[:id] } if exact

      fuzzy = existing.find do |e|
        e[:amount] == txn[:amount] &&
          (e[:date] - txn[:date]).abs <= 3 &&
          similarity(e[:title], normalized_desc) > 0.65
      end
      return { reason: "fuzzy_match", record_id: fuzzy[:id] } if fuzzy

      nil
    end

    def self.normalize(str)
      str.to_s.downcase.gsub(/[^a-z0-9áéíóúàâêôãõç\s]/i, "").gsub(/\s+/, " ").strip
    end

    def self.similarity(a, b)
      return 0.0 if a.nil? || b.nil?

      max_len = [a.length, b.length].max
      return 1.0 if max_len.zero?

      1.0 - levenshtein(a, b).to_f / max_len
    end

    def self.levenshtein(a, b)
      n = a.length
      m = b.length
      return m if n.zero?
      return n if m.zero?

      matrix = (0..m).to_a
      (1..n).each do |i|
        prev = matrix[0]
        matrix[0] = i
        (1..m).each do |j|
          temp = matrix[j]
          matrix[j] = if a[i - 1] == b[j - 1]
                        prev
                      else
                        [matrix[j] + 1, matrix[j - 1] + 1, prev + 1].min
                      end
          prev = temp
        end
      end
      matrix[m]
    end
  end
end
