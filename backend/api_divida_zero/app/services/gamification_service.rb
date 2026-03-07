class GamificationService
  LEVEL_XP = 500

  LEVEL_TIERS = [
    { min: 1, max: 2, title: "Iniciante", icon: "sprout" },
    { min: 3, max: 5, title: "Organizado", icon: "target" },
    { min: 6, max: 9, title: "Estrategista", icon: "shield" },
    { min: 10, max: 999, title: "Mestre", icon: "crown" }
  ].freeze

  class << self
    def award!(user:, event_type:, points:, source: nil, metadata: {})
      points_value = points.to_i
      return nil if points_value.zero?

      event = user.gamification_events.create!(
        event_type: event_type,
        points: points_value,
        source_type: source&.class&.name,
        source_id: source&.id,
        metadata: metadata || {}
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
  end
end
