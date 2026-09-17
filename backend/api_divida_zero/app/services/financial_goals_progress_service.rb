class FinancialGoalsProgressService
  MILESTONES = [25, 50, 75, 100].freeze
  MILESTONE_BASE_POINTS = {
    25 => 40,
    50 => 60,
    75 => 90,
    100 => 140
  }.freeze

  class << self
    def recalculate_for_user!(user)
      household = user.households.first
      goals = if household
        FinancialGoal.where(user: user).or(FinancialGoal.where(household: household)).order(:created_at)
      else
        user.financial_goals.order(:created_at)
      end
      feedbacks = goals.flat_map { |goal| recalculate_goal!(goal) }
      sync_goal_achievements!(user)
      feedbacks
    end

    def funding_snapshot_for_user(user)
      current_balance = current_balance_for_user(user)
      allocated_to_goals = allocated_to_goals_for_user(user)
      available_for_goal_funding = [current_balance - allocated_to_goals, 0].max

      {
        current_balance: current_balance,
        settled_global_balance: current_balance, # retrocompatibilidade
        allocated_to_goals: allocated_to_goals,
        available_for_goal_funding: available_for_goal_funding
      }
    end

    def recalculate_goal!(goal)
      current_amount = relevant_amount_for(goal)
      progress_pct = progress_for(goal.target_amount, current_amount)
      previous_status = goal.status
      completed_now = progress_pct >= 100

      goal.update!(
        current_amount: current_amount,
        progress_pct: progress_pct,
        status: completed_now ? "completed" : "active",
        completed_at: completed_now ? (goal.completed_at || Time.current) : nil
      )

      xp_feedbacks = []
      previous_milestone = goal.last_awarded_milestone.to_i
      reached_milestones = MILESTONES.select { |milestone| progress_pct >= milestone }
      new_milestones = reached_milestones.select { |m| m > previous_milestone }
      already_completed = goal.completed_at.present? && previous_status == "completed"
      xp_feedbacks.concat(sync_progress_events!(goal, reached_milestones)) unless already_completed
      notify_household_milestones!(goal, new_milestones) if new_milestones.any?
      goal.update!(last_awarded_milestone: reached_milestones.max.to_i)

      if previous_status != "completed" && completed_now
        unlock_achievement_once!(
          user: goal.user,
          achievement_key: "first_goal_completed",
          achievement_label: "Primeira meta concluída",
          points: GamificationService.achievement_points(:first_goal_completed),
          source: goal
        ) do
          goal.user.gamification_events.where(event_type: "goal_completed").where.not(source_id: goal.id).exists?
        end

        if goal.target_date.present? && goal.completed_at.present? && goal.completed_at.to_date <= goal.target_date
          unlock_achievement_once!(
            user: goal.user,
            achievement_key: "goal_before_deadline",
            achievement_label: "Meta concluída antes do prazo",
            points: GamificationService.achievement_points(:goal_before_deadline),
            source: goal
          )
        end
      end

      sync_goal_achievements!(goal.user)

      xp_feedbacks.compact
    end

    def remove_goal_tracking!(goal)
      owner = goal.user
      related_events = owner.gamification_events
                            .where(source_type: goal.class.name, source_id: goal.id, event_type: %w[goal_created goal_progress_milestone goal_completed])
                            .order(:created_at)

      reverted_points = related_events.sum(:points)
      removed_milestones = related_events
                             .where(event_type: %w[goal_progress_milestone goal_completed])
                             .map { |event| event.metadata["milestone"].to_i }
                             .uniq
                             .sort

      if reverted_points.positive?
        GamificationService.award!(
          user: goal.user,
          event_type: "goal_deleted",
          points: -reverted_points,
          source: goal,
          metadata: {
            goal_id: goal.id,
            goal_title: goal.title,
            goal_type: goal.goal_type,
            removed_milestones: removed_milestones
          }
        )
      end

      sync_goal_achievements!(goal.user)
    end

    private

    def current_balance_for_user(user)
      totals = user.financial_records
                   .where("due_date <= ?", Date.today)
                   .group(:flow_type)
                   .sum(:amount)

      income = totals.fetch("income", 0).to_d
      expense = totals.fetch("expense", 0).to_d
      income - expense
    end

    def settled_global_balance_for_user(user)
      current_balance_for_user(user)
    end

    def milestone_points_for(milestone, target_amount)
      base = MILESTONE_BASE_POINTS[milestone]
      multiplier = case target_amount.to_d
                   when (0...500)     then 1.0
                   when (500...2000)  then 1.5
                   when (2000...5000) then 2.0
                   when (5000...10_000) then 3.0
                   else 4.0
                   end
      (base * multiplier).round
    end

    def allocated_to_goals_for_user(user)
      user.financial_goals.sum(:current_amount).to_d
    end

    def sync_progress_events!(goal, reached_milestones)
      xp_feedbacks = []
      desired_progress_milestones = reached_milestones.reject { |milestone| milestone == 100 }

      progress_events = goal.user.gamification_events
                           .where(source_type: goal.class.name, source_id: goal.id, event_type: "goal_progress_milestone")

      progress_events.find_each do |event|
        milestone = event.metadata["milestone"].to_i
        unless desired_progress_milestones.include?(milestone)
          event.destroy!
          next
        end

        event.update!(
          metadata: event.metadata.merge(
            "goal_id" => goal.id,
            "goal_title" => goal.title,
            "goal_type" => goal.goal_type,
            "milestone" => milestone
          )
        )
      end

      desired_progress_milestones.each do |milestone|
        next if progress_events.any? { |event| event.metadata["milestone"].to_i == milestone }

        xp_feedback = GamificationService.award!(
          user: goal.user,
          event_type: "goal_progress_milestone",
          points: milestone_points_for(milestone, goal.target_amount),
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

      completion_events = goal.user.gamification_events.where(source_type: goal.class.name, source_id: goal.id, event_type: "goal_completed")
      completion_reached = reached_milestones.include?(100)

      if completion_reached
        if completion_events.empty?
          xp_feedback = GamificationService.award!(
            user: goal.user,
            event_type: "goal_completed",
            points: milestone_points_for(100, goal.target_amount),
            source: goal,
            metadata: {
              goal_id: goal.id,
              goal_title: goal.title,
              goal_type: goal.goal_type,
              milestone: 100
            }
          )
          xp_feedbacks << xp_feedback if xp_feedback
        end
        completion_events.each do |event|
          event.update!(
            metadata: event.metadata.merge(
              "goal_id" => goal.id,
              "goal_title" => goal.title,
              "goal_type" => goal.goal_type,
              "milestone" => 100
            )
          )
        end
      else
        completion_events.destroy_all
      end

      xp_feedbacks
    end

    def notify_household_milestones!(goal, milestones)
      return unless goal.household_id.present?

      goal.household.users.find_each do |member|
        next if member == goal.user

        milestones.each do |milestone|
          NotificationAlert.create!(
            user: member,
            alert_type: "goal_funding",
            window_key: "goal-milestone-#{goal.id}-#{milestone}-#{goal.updated_at.to_i}",
            title: "🎉 Meta da família avançou!",
            message: "#{goal.title} atingiu #{milestone}%!",
            due_count: 1,
            metadata: {
              goal_id: goal.id,
              goal_title: goal.title,
              milestone: milestone,
              progress_pct: goal.progress_pct
            }
          )
        end
      end
    end

    def relevant_amount_for(goal)
      if goal.household_id.present?
        total = goal.financial_goal_contributions.sum(&:signed_amount)
        total.positive? ? total : 0.to_d
      else
        case goal.goal_type
        when "debt"
          settled_scope_for_goal(goal)
            .where(record_type: "debt", flow_type: "expense")
            .sum(:amount)
            .to_d
        when "save", "specific"
          total = goal.financial_goal_contributions.sum(&:signed_amount)
          total.positive? ? total : 0.to_d
        else
          total = goal.financial_goal_contributions.sum(&:signed_amount)
          total.positive? ? total : 0.to_d
        end
      end
    end

    def settled_scope_for_goal(goal)
      scope = goal.user.financial_records.where.not(status: "pending")
      scope = scope.where("due_date >= ?", goal.start_date)
      scope = scope.where("due_date <= ?", goal.target_date) if goal.target_date.present?
      scope
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

    def sync_goal_achievements!(user)
      completed_goals = user.financial_goals.select { |goal| goal.status == "completed" }

      sync_achievement_event!(
        user: user,
        achievement_key: "first_goal_completed",
        achievement_label: "Primeira meta concluída",
        points: GamificationService.achievement_points(:first_goal_completed),
        unlocked: completed_goals.any?,
        source: completed_goals.first
      )

      before_deadline_goal = completed_goals.find do |goal|
        goal.target_date.present? && goal.completed_at.present? && goal.completed_at.to_date <= goal.target_date
      end

      sync_achievement_event!(
        user: user,
        achievement_key: "goal_before_deadline",
        achievement_label: "Meta concluída antes do prazo",
        points: GamificationService.achievement_points(:goal_before_deadline),
        unlocked: before_deadline_goal.present?,
        source: before_deadline_goal
      )
    end

    def sync_achievement_event!(user:, achievement_key:, achievement_label:, points:, unlocked:, source:)
      events = user.gamification_events
                   .where(event_type: "achievement_unlocked")
                   .select { |event| event.metadata["achievement_key"] == achievement_key }

      if unlocked
        return if events.any?

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
      else
        events.each(&:destroy!)
      end
    end
  end
end

