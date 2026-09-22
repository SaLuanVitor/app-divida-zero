class FeatureFlag < ApplicationRecord
  validates :key, presence: true, uniqueness: true
  validates :enabled, inclusion: { in: [true, false] }

  scope :enabled, -> { where(enabled: true) }
  scope :disabled, -> { where(enabled: false) }

  def self.enabled?(key)
    where(key: key, enabled: true).exists?
  end

  def self.disabled?(key)
    where(key: key, enabled: false).exists? || !exists?(key: key)
  end

  def self.enable(key, description: nil)
    flag = find_or_initialize_by(key: key)
    flag.enabled = true
    flag.description = description if description.present?
    flag.save!
    flag
  end

  def self.disable(key)
    where(key: key).update_all(enabled: false)
  end

  # Feature flags iniciais
  INITIAL_FLAGS = {
    open_finance: { enabled: false, description: 'Integração Open Finance via Pluggy' },
    bank_sync: { enabled: false, description: 'Sincronização bancária automática' },
    investments: { enabled: false, description: 'Suporte a investimentos' },
    credit_cards: { enabled: true, description: 'Suporte a cartões de crédito' },
    family: { enabled: true, description: 'Funcionalidades de família' },
    ai_analysis: { enabled: true, description: 'Análise por IA de transações' },
    manual_import: { enabled: true, description: 'Importação manual OFX/CSV' }
  }.freeze

  def self.seed_initial!
    INITIAL_FLAGS.each do |key, config|
      find_or_create_by(key: key) do |flag|
        flag.enabled = config[:enabled]
        flag.description = config[:description]
      end
    end
  end
end