module Api
  module V1
    class GamificationController < ApplicationController
      before_action :authenticate_access_token!

      def summary
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)
        GamificationService.sync_record_achievements!(@current_user)
        DailyAchievementsService.sync_for_user!(@current_user)
        render json: {
          summary: GamificationService.summary_for(@current_user),
          daily_achievements: DailyAchievementsService.summary_for_user(@current_user)
        }, status: :ok
      end

      def events
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)
        GamificationService.sync_record_achievements!(@current_user)
        DailyAchievementsService.sync_for_user!(@current_user)
        render json: { events: GamificationService.events_for(@current_user, limit: 80) }, status: :ok
      end

      private
      def authenticate_access_token!
        super
      end
    end
  end
end
