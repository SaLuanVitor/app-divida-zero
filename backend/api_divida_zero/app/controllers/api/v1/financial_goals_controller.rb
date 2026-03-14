module Api
  module V1
    class FinancialGoalsController < ApplicationController
      before_action :authenticate_access_token!

      def index
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)

        goals = @current_user.financial_goals.order(Arel.sql("CASE WHEN status = 'active' THEN 0 ELSE 1 END"), :target_date, :created_at)

        render json: {
          goals: goals.map(&:serialize)
        }, status: :ok
      end

      def create
        goal = @current_user.financial_goals.create!(goal_params)

        xp_feedback = GamificationService.award!(
          user: @current_user,
          event_type: "goal_created",
          points: 50,
          source: goal,
          metadata: {
            goal_id: goal.id,
            goal_title: goal.title,
            goal_type: goal.goal_type
          }
        )

        unlock_first_goal_created!(goal)
        FinancialGoalsProgressService.recalculate_goal!(goal)

        render json: {
          message: "Meta criada com sucesso.",
          goal: goal.reload.serialize,
          xp_feedback: xp_feedback
        }, status: :created
      end

      def update
        goal = @current_user.financial_goals.find(params[:id])
        goal.update!(goal_params)
        FinancialGoalsProgressService.recalculate_goal!(goal)

        render json: {
          message: "Meta atualizada com sucesso.",
          goal: goal.reload.serialize
        }, status: :ok
      end

      def destroy
        goal = @current_user.financial_goals.find(params[:id])
        FinancialGoalsProgressService.remove_goal_tracking!(goal)
        goal.destroy!
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)

        render json: { message: "Meta removida com sucesso." }, status: :ok
      end

      private

      def goal_params
        params.fetch(:financial_goal, params).permit(:title, :description, :target_amount, :start_date, :target_date, :goal_type)
      end

      def unlock_first_goal_created!(goal)
        return unless @current_user.financial_goals.count == 1

        GamificationService.award!(
          user: @current_user,
          event_type: "achievement_unlocked",
          points: 60,
          source: goal,
          metadata: {
            achievement_key: "first_goal_created",
            achievement_label: "Primeira meta criada"
          }
        )
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
