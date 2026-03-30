module Api
  module V1
    class ReportsController < ApplicationController
      before_action :authenticate_access_token!

      def summary
        year = params[:year].present? ? params[:year].to_i : Date.current.year
        month = params[:month].present? ? params[:month].to_i : Date.current.month
        month = [[month, 1].max, 12].min

        records = @current_user.financial_records.from_month(year, month)
        income_scope = records.where(flow_type: "income")
        expense_scope = records.where(flow_type: "expense")

        income_total = income_scope.sum(:amount).to_d
        expense_total = expense_scope.sum(:amount).to_d
        balance = income_total - expense_total

        top_categories = expense_scope.group(:category).sum(:amount).map do |category, amount|
          {
            category: category.presence || "Sem categoria",
            total: amount.to_d.to_s("F")
          }
        end.sort_by { |item| -item[:total].to_d }.first(3)

        render json: {
          period: {
            year: year,
            month: month
          },
          summary: {
            income_total: income_total.to_s("F"),
            expense_total: expense_total.to_s("F"),
            balance: balance.to_s("F")
          },
          top_categories: top_categories
        }, status: :ok
      end

      private

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Não autorizado." }, status: :unauthorized
      end
    end
  end
end
