class GamificationService
  LEVEL_XP = 500
  ACHIEVEMENT_REWARD_POINTS = {
    first_record: 80,
    first_settlement: 90,
    ten_records: 180,
    five_settled: 210,
    first_goal_created: 90,
    first_goal_completed: 130,
    goal_before_deadline: 160
  }.freeze

  LEVEL_TIERS = [
    { min: 1, max: 2, title: "Iniciante", icon: "sprout" },
    { min: 3, max: 5, title: "Organizado", icon: "target" },
    { min: 6, max: 9, title: "Estrategista", icon: "shield" },
    { min: 10, max: 999, title: "Mestre", icon: "crown" }
  ].freeze

  class << self
    def achievement_points(key)
      ACHIEVEMENT_REWARD_POINTS.fetch(key.to_sym)
    end

    def award!(user:, event_type:, points:, source: nil, metadata: {})
      points_value = points.to_i
      return nil if points_value.zero?

      event_metadata = normalize_metadata(metadata)

      event = user.gamification_events.create!(
        event_type: event_type,
        points: points_value,
        source_type: source&.class&.name,
        source_id: source&.id,
        metadata: event_metadata
      )

      summary = summary_for(user)

      {
        event: serialize_event(event),
        summary: summary,
        points: points_value,
        leveled_up: leveled_up?(summary[:level], points_value, summary[:total_xp])
      }
    end

    def summary_for(user)
      total_xp = [user.gamification_events.sum(:points), 0].max
      level = (total_xp / LEVEL_XP) + 1
      xp_in_level = total_xp % LEVEL_XP
      xp_to_next_level = LEVEL_XP - xp_in_level
      level_progress_pct = ((xp_in_level.to_f / LEVEL_XP) * 100).round

      tier = tier_for(level)

      {
        total_xp: total_xp,
        level: level,
        level_title: tier[:title],
        level_icon: tier[:icon],
        xp_in_level: xp_in_level,
        xp_to_next_level: xp_to_next_level,
        level_progress_pct: level_progress_pct
      }
    end

    def events_for(user, limit: 50)
      user.gamification_events.order(created_at: :desc).limit(limit).map { |event| serialize_event(event) }
    end

    def sync_record_achievements!(user, source: nil)
      record_count = user.financial_records.count
      settled_count = user.financial_records.where.not(status: "pending").count

      unlock_record_achievement_once!(
        user: user,
        achievement_key: "first_record",
        achievement_label: "Primeiro passo",
        points: achievement_points(:first_record),
        source: source,
        unlocked: record_count >= 1
      )

      unlock_record_achievement_once!(
        user: user,
        achievement_key: "first_settlement",
        achievement_label: "Conta resolvida",
        points: achievement_points(:first_settlement),
        source: source,
        unlocked: settled_count >= 1
      )

      unlock_record_achievement_once!(
        user: user,
        achievement_key: "ten_records",
        achievement_label: "Organização ativa",
        points: achievement_points(:ten_records),
        source: source,
        unlocked: record_count >= 10
      )

      unlock_record_achievement_once!(
        user: user,
        achievement_key: "five_settled",
        achievement_label: "Ritmo constante",
        points: achievement_points(:five_settled),
        source: source,
        unlocked: settled_count >= 5
      )
    end

    private

    def tier_for(level)
      LEVEL_TIERS.find { |tier| level >= tier[:min] && level <= tier[:max] } || LEVEL_TIERS.last
    end

    def leveled_up?(current_level, points_added, total_xp)
      previous_total = total_xp - points_added
      previous_level = (previous_total / LEVEL_XP) + 1
      current_level > previous_level
    end

    def serialize_event(event)
      {
        id: event.id,
        event_type: event.event_type,
        points: event.points,
        source_type: event.source_type,
        source_id: event.source_id,
        metadata: event.metadata,
        created_at: event.created_at
      }
    end

    def unlock_record_achievement_once!(user:, achievement_key:, achievement_label:, points:, source:, unlocked:)
      return unless unlocked

      existing = user.gamification_events
                     .where(event_type: "achievement_unlocked")
                     .order(:id)
                     .any? { |event| event.metadata["achievement_key"] == achievement_key }

      return if existing

      award!(
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

    def normalize_metadata(metadata)
      event_metadata = metadata.to_h.deep_stringify_keys
      event_metadata["local_date"] = normalize_local_date_value(event_metadata["local_date"])
      event_metadata
    end

    def normalize_local_date_value(raw)
      return raw.iso8601 if raw.is_a?(Date)
      return (Current.user_local_date || Date.current).iso8601 if raw.blank?
      return raw if /\A\d{4}-\d{2}-\d{2}\z/.match?(raw)

      (Current.user_local_date || Date.current).iso8601
    end
  end
end
