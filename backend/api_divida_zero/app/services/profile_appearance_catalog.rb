class ProfileAppearanceCatalog
  ICON_COUNT = 30
  FRAME_COUNT = 10

  DEFAULT_ICON_KEY = "icon_01".freeze
  DEFAULT_FRAME_KEY = "frame_01".freeze

  ICON_KEYS = (1..ICON_COUNT).map { |index| format("icon_%02d", index) }.freeze
  FRAME_KEYS = (1..FRAME_COUNT).map { |index| format("frame_%02d", index) }.freeze

  class << self
    def valid_icon_key?(key)
      ICON_KEYS.include?(key.to_s)
    end

    def valid_frame_key?(key)
      FRAME_KEYS.include?(key.to_s)
    end

    def icon_required_level(key)
      index = extract_index(key)
      return nil unless index && index.between?(1, ICON_COUNT)

      [1, index - 9].max
    end

    def frame_required_level(key)
      index = extract_index(key)
      return nil unless index && index.between?(1, FRAME_COUNT)

      index == 1 ? 1 : (index - 1) * 10
    end

    def unlocked_icons_count(level)
      normalized = normalize_level(level)
      [[10 + (normalized - 1), ICON_COUNT].min, 1].max
    end

    def unlocked_frames_count(level)
      normalized = normalize_level(level)
      [[1 + (normalized / 10), FRAME_COUNT].min, 1].max
    end

    def icon_unlocked?(key, level)
      required = icon_required_level(key)
      return false if required.nil?

      normalize_level(level) >= required
    end

    def frame_unlocked?(key, level)
      required = frame_required_level(key)
      return false if required.nil?

      normalize_level(level) >= required
    end

    private

    def normalize_level(level)
      [level.to_i, 1].max
    end

    def extract_index(key)
      /\A(?:icon|frame)_(\d{2})\z/.match(key.to_s)&.captures&.first&.to_i
    end
  end
end
