class DailyAchievementsService
  DAILY_TASKS = [
    {
      key: "daily_record_created",
      title: "Registrar 1 lançamento",
      description: "Crie pelo menos um lançamento no dia.",
      reward_xp: 12,
      target: 1,
      event_types: %w[record_created]
    },
    {
      key: "daily_settlement",
      title: "Concluir 1 lançamento",
      description: "Marque um lançamento como pago ou recebido.",
      reward_xp: 14,
      target: 1,
      event_types: %w[income_received expense_paid]
    },
    {
      key: "daily_goal_action",
      title: "Criar ou avançar 1 meta",
      description: "Crie uma meta ou avance um marco de progresso.",
      reward_xp: 16,
      target: 1,
      event_types: %w[goal_created goal_progress_milestone goal_completed]
    }
  ].freeze

  class << self
    def sync_for_user!(user, date_key: current_date_key)
      task_progress = task_progress_for(user, date_key)
      completed_task_keys = completed_task_keys_for(user, date_key)

      DAILY_TASKS.each do |task|
        next if task_progress[task[:key]] < task[:target]
        next if completed_task_keys.include?(task[:key])

        GamificationService.award!(
          user: user,
          event_type: "daily_achievement_completed",
          points: task[:reward_xp],
          metadata: {
            daily_key: task[:key],
            daily_title: task[:title],
            date_key: date_key,
            task_group: "daily_v1"
          }
        )
      end
    end

    def summary_for_user(user, date_key: current_date_key)
      task_progress = task_progress_for(user, date_key)
      completed_task_keys = completed_task_keys_for(user, date_key)

      DAILY_TASKS.map do |task|
        progress = [task_progress[task[:key]], task[:target]].min

        {
          key: task[:key],
          title: task[:title],
          description: task[:description],
          reward_xp: task[:reward_xp],
          progress: progress,
          target: task[:target],
          completed: completed_task_keys.include?(task[:key]) || progress >= task[:target],
          date_key: date_key
        }
      end
    end

    private

    def task_progress_for(user, date_key)
      events_by_type = user.gamification_events
                           .where("metadata ->> 'local_date' = ?", date_key)
                           .group_by(&:event_type)

      DAILY_TASKS.each_with_object({}) do |task, acc|
        count = task[:event_types].sum { |event_type| events_by_type[event_type]&.size.to_i }
        acc[task[:key]] = count
      end
    end

    def completed_task_keys_for(user, date_key)
      user.gamification_events
          .where(event_type: "daily_achievement_completed")
          .where("metadata ->> 'date_key' = ?", date_key)
          .map { |event| event.metadata["daily_key"].to_s }
          .uniq
    end

    def current_date_key
      (Current.user_local_date || Date.current).iso8601
    end
  end
end
