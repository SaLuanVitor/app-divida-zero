module Api
  module V1
    class FinancialGoalContributionsController < ApplicationController
      before_action :authenticate_access_token!
      before_action :set_goal

      def index
        contributions = @goal.financial_goal_contributions.order(created_at: :desc)

        render json: {
          contributions: contributions.map(&:serialize)
        }, status: :ok
      end

      def create
        contribution = @goal.financial_goal_contributions.new(contribution_params)
        if contribution.kind == "withdraw" && contribution.amount.to_d > @goal.current_amount.to_d
          render json: { error: "Saldo insuficiente para retirada nesta meta." }, status: :unprocessable_entity
          return
        end

        contribution.save!
        FinancialGoalsProgressService.recalculate_goal!(@goal)
        DailyAchievementsService.sync_for_user!(@current_user)

        render json: {
          message: "Aporte registrado com sucesso.",
          contribution: contribution.serialize,
          goal: @goal.reload.serialize
        }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages.first || "Não foi possível registrar o aporte." }, status: :unprocessable_entity
      end

      def destroy
        contribution = @goal.financial_goal_contributions.find(params[:id])
        contribution.destroy!
        FinancialGoalsProgressService.recalculate_goal!(@goal)
        DailyAchievementsService.sync_for_user!(@current_user)

        render json: {
          message: "Aporte removido com sucesso.",
          goal: @goal.reload.serialize
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

