module Ai
  class ContextBuilder
    class << self
      def for_user(user)
        today = Date.current
        month_scope = user.financial_records.from_month(today.year, today.month)
        all_scope = user.financial_records
        pending_scope = all_scope.where(status: "pending")
        pending_count = pending_scope.count
        pending_expense = pending_scope.where(flow_type: "expense").sum(:amount).to_d
        pending_income = pending_scope.where(flow_type: "income").sum(:amount).to_d
        settled_scope = all_scope.where.not(status: "pending")
        settled_income = settled_scope.where(flow_type: "income").sum(:amount).to_d
        settled_expense = settled_scope.where(flow_type: "expense").sum(:amount).to_d
        monthly_count = month_scope.count

        {
          today: today.iso8601,
          monthly_records_count: monthly_count,
          pending_records_count: pending_count,
          pending_expense_total: pending_expense.to_s("F"),
          pending_income_total: pending_income.to_s("F"),
          settled_balance_total: (settled_income - settled_expense).to_s("F"),
          top_expense_categories: top_expense_categories(all_scope),
          recent_categories: recent_categories(user)
        }
      end

      def for_categorization(user, payload)
        {
          title: payload[:title].to_s.slice(0, 120),
          amount: payload[:amount].to_s,
          note: payload[:note].to_s.slice(0, 140),
          recent_categories: recent_categories(user)
        }
      end

      private

      def recent_categories(user)
        user.financial_records
            .where.not(category: [nil, ""])
            .order(created_at: :desc)
            .limit(25)
            .pluck(:category)
            .map { |category| category.to_s.slice(0, 40) }
            .uniq
            .first(10)
      end

      def top_expense_categories(scope)
        scope.where(flow_type: "expense")
             .group(:category)
             .sum(:amount)
             .sort_by { |(_category, amount)| -amount.to_d }
             .first(5)
             .map do |category, amount|
               {
                 category: category.presence || "Sem categoria",
                 total: amount.to_d.to_s("F")
               }
             end
      end
    end
  end
end
