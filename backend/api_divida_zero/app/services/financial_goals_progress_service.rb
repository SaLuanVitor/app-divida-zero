class FinancialGoalsProgressService
  MILESTONES = [25, 50, 75, 100].freeze
  MILESTONE_POINTS = {
    25 => 40,
    50 => 60,
    75 => 90,
    100 => 140
  }.freeze

  class << self
    def recalculate_for_user!(user)
      user.financial_goals.order(:created_at).flat_map { |goal| recalculate_goal!(goal) }
    end

    def recalculate_goal!(goal)
      current_amount = relevant_amount_for(goal)
      progress_pct = progress_for(goal.target_amount, current_amount)
      previous_status = goal.status
      previous_milestone = goal.last_awarded_milestone.to_i
      completed_now = progress_pct >= 100

      goal.update!(
        current_amount: current_amount,
        progress_pct: progress_pct,
        status: completed_now ? "completed" : "active",
        completed_at: completed_now ? (goal.completed_at || Time.current) : nil
      )

      xp_feedbacks = []

      reached_milestones = MILESTONES.select { |milestone| progress_pct >= milestone && previous_milestone < milestone }
      max_milestone = reached_milestones.max || previous_milestone

      reached_milestones.each do |milestone|
        event_type = milestone == 100 ? "goal_completed" : "goal_progress_milestone"
        xp_feedback = GamificationService.award!(
          user: goal.user,
          event_type: event_type,
          points: MILESTONE_POINTS[milestone],
          source: goal,
          metadata: {
            goal_id: goal.id,
            goal_title: goal.title,
            goal_type: goal.goal_type,
            milestone: milestone
          }
        )
        xp_feedbacks << xp_feedback if xp_feedback
      end

      goal.update!(last_awarded_milestone: max_milestone) if max_milestone != previous_milestone

      if previous_status != "completed" && completed_now
        unlock_achievement_once!(
          user: goal.user,
          achievement_key: "first_goal_completed",
          achievement_label: "Primeira meta concluída",
          points: 80,
          source: goal
        ) do
          goal.user.gamification_events.where(event_type: "goal_completed").where.not(source_id: goal.id).exists?
        end

        if goal.target_date.present? && goal.completed_at.present? && goal.completed_at.to_date <= goal.target_date
          unlock_achievement_once!(
            user: goal.user,
            achievement_key: "goal_before_deadline",
            achievement_label: "Meta concluída antes do prazo",
            points: 100,
            source: goal
          )
        end
      end

      xp_feedbacks.compact
    end

    private

    def relevant_amount_for(goal)
      scope = goal.user.financial_records

      total = case goal.goal_type
              when "debt"
                scope.where(record_type: "debt", status: "paid").sum(:amount)
              else
                scope.where(flow_type: "income", status: "received").sum(:amount)
              end

      total.to_d
    end

    def progress_for(target_amount, current_amount)
      return 0 if target_amount.to_d <= 0

      return 0 if current_amount.to_d <= 0

      pct = ((current_amount.to_d / target_amount.to_d) * 100).floor
      pct = 1 if pct.zero?
      [pct, 100].min
    end

    def unlock_achievement_once!(user:, achievement_key:, achievement_label:, points:, source:, &already_unlocked)
      existing = user.gamification_events
                     .where(event_type: "achievement_unlocked")
                     .order(:id)
                     .any? { |event| event.metadata["achievement_key"] == achievement_key }

      return if existing
      return if block_given? && yield

      GamificationService.award!(
        user: user,
        event_type: "achievement_unlocked",
        points: points,
        source: source,
        metadata: {
          achievement_key: achievement_key,
          achievement_label: achievement_label
        }
      )
    end
  end
end
