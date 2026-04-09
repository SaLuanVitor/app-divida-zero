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
          render json: { error: "Valor acima do saldo disponível para metas." }, status: :unprocessable_entity
          return
        end

        if contribution.kind == "withdraw" && contribution.amount.to_d > @goal.current_amount.to_d
          render json: { error: "Saldo insuficiente para retirada nesta meta." }, status: :unprocessable_entity
          return
        end

        contribution.save!
        FinancialGoalsProgressService.recalculate_goal!(@goal)
        DailyAchievementsService.sync_for_user!(@current_user)
        funding_after = FinancialGoalsProgressService.funding_snapshot_for_user(@current_user)

        render json: {
          message: "Aporte registrado com sucesso.",
          contribution: contribution.serialize,
          goal: @goal.reload.serialize,
          settled_global_balance: funding_after[:settled_global_balance].to_s("F"),
          allocated_to_goals: funding_after[:allocated_to_goals].to_s("F"),
          available_for_goal_funding: funding_after[:available_for_goal_funding].to_s("F")
        }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages.first || "Não foi possível registrar o aporte." }, status: :unprocessable_entity
      end

      def destroy
        contribution = @goal.financial_goal_contributions.find(params[:id])
        contribution.destroy!
        FinancialGoalsProgressService.recalculate_goal!(@goal)
        DailyAchievementsService.sync_for_user!(@current_user)
        funding_after = FinancialGoalsProgressService.funding_snapshot_for_user(@current_user)

        render json: {
          message: "Aporte removido com sucesso.",
          goal: @goal.reload.serialize,
          settled_global_balance: funding_after[:settled_global_balance].to_s("F"),
          allocated_to_goals: funding_after[:allocated_to_goals].to_s("F"),
          available_for_goal_funding: funding_after[:available_for_goal_funding].to_s("F")
        }, status: :ok
      end

      private

      def set_goal
        @goal = @current_user.financial_goals.find(params[:financial_goal_id])
      end

      def contribution_params
        params.fetch(:contribution, params).permit(:kind, :amount, :notes)
      end

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
