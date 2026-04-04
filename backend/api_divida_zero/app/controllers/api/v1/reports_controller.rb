module Api
  module V1
    class ReportsController < ApplicationController
      before_action :authenticate_access_token!

      def summary
        year = params[:year].present? ? params[:year].to_i : Date.current.year
        month = params[:month].present? ? params[:month].to_i : Date.current.month
        month = [[month, 1].max, 12].min
        status_filter = parse_status_filter(params[:status])
        flow_filter = parse_flow_filter(params[:flow_type])
        category_param = params[:category].to_s.strip.presence
        category_filter = parse_category_filter(category_param)

        month_records = @current_user.financial_records.from_month(year, month)
        filtered_month_records = apply_common_filters(
          month_records,
          flow_filter: flow_filter,
          category_filter: category_filter
        )
        monthly_records = apply_status_filter(filtered_month_records, status_filter)

        monthly_income_total = monthly_records.where(flow_type: "income").sum(:amount).to_d
        monthly_expense_total = monthly_records.where(flow_type: "expense").sum(:amount).to_d
        monthly_balance = monthly_income_total - monthly_expense_total

        legacy_income_total = month_records.where(flow_type: "income").sum(:amount).to_d
        legacy_expense_total = month_records.where(flow_type: "expense").sum(:amount).to_d
        legacy_balance = legacy_income_total - legacy_expense_total
        top_categories = build_legacy_top_categories(month_records)

        categories_breakdown = build_categories_breakdown(monthly_records)
        available_categories = build_available_categories(
          apply_status_filter(
            apply_common_filters(month_records, flow_filter: flow_filter, category_filter: nil),
            status_filter
          )
        )
        detailed_records = monthly_records
          .order(due_date: :desc, created_at: :desc)
          .limit(300)
          .map { |record| serialize_record(record) }

        monthly_trend = build_monthly_trend(
          year: year,
          month: month,
          status_filter: status_filter,
          flow_filter: flow_filter,
          category_filter: category_filter
        )

        period_scope = apply_common_filters(
          month_records,
          flow_filter: flow_filter,
          category_filter: category_filter
        )
        period_settled_balance_total = settled_balance_for(period_scope)
        period_pending_income_total = period_scope.where(status: "pending", flow_type: "income").sum(:amount).to_d
        period_pending_expense_total = period_scope.where(status: "pending", flow_type: "expense").sum(:amount).to_d
        period_projected_balance_total =
          period_settled_balance_total + period_pending_income_total - period_pending_expense_total

        global_scope = apply_common_filters(
          @current_user.financial_records,
          flow_filter: flow_filter,
          category_filter: category_filter
        )
        settled_balance_total = settled_balance_for(global_scope)
        pending_income_total = global_scope.where(status: "pending", flow_type: "income").sum(:amount).to_d
        pending_expense_total = global_scope.where(status: "pending", flow_type: "expense").sum(:amount).to_d
        projected_balance_total = settled_balance_total + pending_income_total - pending_expense_total

        render json: {
          global_indicators: {
            settled_balance_total: decimal_string(settled_balance_total),
            pending_income_total: decimal_string(pending_income_total),
            pending_expense_total: decimal_string(pending_expense_total),
            projected_balance_total: decimal_string(projected_balance_total)
          },
          period_indicators: {
            settled_balance_total: decimal_string(period_settled_balance_total),
            pending_income_total: decimal_string(period_pending_income_total),
            pending_expense_total: decimal_string(period_pending_expense_total),
            projected_balance_total: decimal_string(period_projected_balance_total)
          },
          monthly_summary: {
            income_total: decimal_string(monthly_income_total),
            expense_total: decimal_string(monthly_expense_total),
            balance: decimal_string(monthly_balance),
            records_count: monthly_records.count
          },
          monthly_trend: monthly_trend,
          categories_breakdown: categories_breakdown,
          detailed_records: detailed_records,
          available_categories: available_categories,
          filters: {
            status: status_filter,
            flow_type: flow_filter,
            category: category_param
          },
          period: {
            year: year,
            month: month
          },
          summary: {
            income_total: decimal_string(legacy_income_total),
            expense_total: decimal_string(legacy_expense_total),
            balance: decimal_string(legacy_balance)
          },
          top_categories: top_categories
        }, status: :ok
      end

      private

      def parse_status_filter(raw_value)
        case raw_value.to_s
        when "pending"
          "pending"
        when "completed"
          "completed"
        else
          "all"
        end
      end

      def parse_flow_filter(raw_value)
        case raw_value.to_s
        when "income"
          "income"
        when "expense"
          "expense"
        else
          "all"
        end
      end

      def parse_category_filter(raw_value)
        value = raw_value.to_s.strip
        return nil if value.blank?
        return "__uncategorized__" if value == "Sem categoria"

        value
      end

      def apply_common_filters(scope, flow_filter:, category_filter:)
        filtered = scope
        filtered = filtered.where(flow_type: flow_filter) unless flow_filter == "all"

        if category_filter.present?
          if category_filter == "__uncategorized__"
            filtered = filtered.where(category: [nil, ""])
          else
            filtered = filtered.where(category: category_filter)
          end
        end

        filtered
      end

      def apply_status_filter(scope, status_filter)
        case status_filter
        when "pending"
          scope.where(status: "pending")
        when "completed"
          scope.where.not(status: "pending")
        else
          scope
        end
      end

      def settled_balance_for(scope)
        settled_scope = scope.where.not(status: "pending")
        settled_income_total = settled_scope.where(flow_type: "income").sum(:amount).to_d
        settled_expense_total = settled_scope.where(flow_type: "expense").sum(:amount).to_d
        settled_income_total - settled_expense_total
      end

      def build_legacy_top_categories(scope)
        scope
          .where(flow_type: "expense")
          .group(:category)
          .sum(:amount)
          .map do |category, amount|
            {
              category: category.presence || "Sem categoria",
              total: decimal_string(amount.to_d)
            }
          end
          .sort_by { |item| -item[:total].to_d }
          .first(3)
      end

      def build_categories_breakdown(scope)
        grouped = scope.group(:category).sum(:amount).map do |category, amount|
          {
            category: category.presence || "Sem categoria",
            total_decimal: amount.to_d
          }
        end

        grand_total = grouped.sum { |item| item[:total_decimal] }

        grouped
          .sort_by { |item| -item[:total_decimal] }
          .map do |item|
            percentage = if grand_total.zero?
              0.0
            else
              ((item[:total_decimal] / grand_total) * 100).to_f
            end

            {
              category: item[:category],
              total: decimal_string(item[:total_decimal]),
              percentage: percentage.round(2)
            }
          end
      end

      def build_available_categories(scope)
        categories = scope
          .where.not(category: [nil, ""])
          .distinct
          .order(:category)
          .pluck(:category)

        uncategorized_exists = scope.where(category: [nil, ""]).exists?
        uncategorized_exists ? (categories + ["Sem categoria"]) : categories
      end

      def build_monthly_trend(year:, month:, status_filter:, flow_filter:, category_filter:)
        anchor = Date.new(year, month, 1)
        months = (5).downto(0).map { |offset| anchor << offset }

        months.map do |date|
          month_scope = @current_user.financial_records.from_month(date.year, date.month)
          filtered_scope = apply_status_filter(
            apply_common_filters(month_scope, flow_filter: flow_filter, category_filter: category_filter),
            status_filter
          )
          income_total = filtered_scope.where(flow_type: "income").sum(:amount).to_d
          expense_total = filtered_scope.where(flow_type: "expense").sum(:amount).to_d
          balance = income_total - expense_total

          {
            year: date.year,
            month: date.month,
            income_total: decimal_string(income_total),
            expense_total: decimal_string(expense_total),
            balance: decimal_string(balance)
          }
        end
      end

      def serialize_record(record)
        {
          id: record.id,
          title: record.title,
          record_type: record.record_type,
          flow_type: record.flow_type,
          amount: decimal_string(record.amount.to_d),
          status: record.status,
          due_date: record.due_date,
          category: record.category,
          priority: record.priority
        }
      end

      def decimal_string(value)
        value.to_d.to_s("F")
      end

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Nao autorizado." }, status: :unauthorized
      end
    end
  end
end
