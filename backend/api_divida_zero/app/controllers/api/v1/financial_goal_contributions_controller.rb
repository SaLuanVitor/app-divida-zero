module Api
  module V1
    class FinancialGoalContributionsController < ApplicationController
      before_action :authenticate_access_token!
      before_action :set_goal

      def index
        contributions = @goal.financial_goal_contributions.order(created_at: :desc)
        funding = FinancialGoalsProgressService.funding_snapshot_for_user(@current_user)

        render json: {
          contributions: contributions.map(&:serialize),
          settled_global_balance: funding[:settled_global_balance].to_s("F"),
          allocated_to_goals: funding[:allocated_to_goals].to_s("F"),
          available_for_goal_funding: funding[:available_for_goal_funding].to_s("F")
        }, status: :ok
      end

      def create
        contribution = @goal.financial_goal_contributions.new(contribution_params)
        funding_before = FinancialGoalsProgressService.funding_snapshot_for_user(@current_user)

        if contribution.kind == "deposit" && contribution.amount.to_d > funding_before[:available_for_goal_funding].to_d
          render json: { error: "Valor acima do saldo disponivel para metas." }, status: :unprocessable_entity
          return
        end

        if contribution.kind == "withdraw" && contribution.amount.to_d > @goal.current_amount.to_d
          render json: { error: "Saldo insuficiente para retirada nesta meta." }, status: :unprocessable_entity
          return
        end

        linked_record = nil
        ActiveRecord::Base.transaction do
          contribution.save!
          linked_record = create_linked_financial_record!(contribution)
          create_goal_funding_alert!(contribution, linked_record)
          FinancialGoalsProgressService.recalculate_goal!(@goal)
          DailyAchievementsService.sync_for_user!(@current_user)
        end

        funding_after = FinancialGoalsProgressService.funding_snapshot_for_user(@current_user)

        render json: {
          message: contribution_message(contribution.kind),
          contribution: contribution.reload.serialize,
          linked_record_id: linked_record.id,
          goal: @goal.reload.serialize,
          settled_global_balance: funding_after[:settled_global_balance].to_s("F"),
          allocated_to_goals: funding_after[:allocated_to_goals].to_s("F"),
          available_for_goal_funding: funding_after[:available_for_goal_funding].to_s("F")
        }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages.first || "Nao foi possivel registrar a contribuicao." }, status: :unprocessable_entity
      end

      def destroy
        render json: {
          error: "Historico de contribuicoes e imutavel. Use aporte/retirada para compensar valores."
        }, status: :unprocessable_entity
      end

      private

      def set_goal
        @goal = @current_user.financial_goals.find(params[:financial_goal_id])
      end

      def contribution_params
        params.fetch(:contribution, params).permit(:kind, :amount, :notes)
      end

      def create_linked_financial_record!(contribution)
        is_withdraw = contribution.kind == "withdraw"

        @current_user.financial_records.create!(
          title: is_withdraw ? "Retirada da meta: #{@goal.title}" : "Aporte na meta: #{@goal.title}",
          description: contribution.notes.presence,
          record_type: "launch",
          flow_type: is_withdraw ? "income" : "expense",
          amount: contribution.amount,
          status: is_withdraw ? "received" : "paid",
          paid_at: Time.current,
          due_date: Date.current,
          recurring: false,
          recurrence_type: "none",
          recurrence_count: 1,
          installments_total: 1,
          installment_number: 1,
          category: "Meta",
          priority: "normal",
          notes: contribution.notes,
          financial_goal_id: @goal.id,
          financial_goal_contribution_id: contribution.id
        )
      end

      def create_goal_funding_alert!(contribution, linked_record)
        action_label = contribution.kind == "withdraw" ? "retirada" : "aporte"

        NotificationAlert.create_or_find_by!(
          user: @current_user,
          alert_type: "goal_funding",
          window_key: "goal-funding-#{contribution.id}"
        ) do |alert|
          alert.title = contribution.kind == "withdraw" ? "Retirada registrada na meta" : "Aporte registrado na meta"
          alert.message = "Um #{action_label} de #{money(contribution.amount)} foi registrado em #{@goal.title}."
          alert.due_count = 1
          alert.metadata = {
            goal_id: @goal.id,
            goal_title: @goal.title,
            contribution_id: contribution.id,
            kind: contribution.kind,
            amount: contribution.amount.to_d.to_s("F"),
            linked_record_id: linked_record.id
          }
        end
      end

      def contribution_message(kind)
        return "Retirada registrada com sucesso." if kind == "withdraw"

        "Aporte registrado com sucesso."
      end

      def money(value)
        ActionController::Base.helpers.number_to_currency(value.to_d, unit: "R$ ", separator: ",", delimiter: ".")
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

