class DailyAiMessage < ApplicationRecord
  validates :date, presence: true, uniqueness: { message: "Ja existe mensagem para esta data." }
  validates :title, presence: { message: "Titulo e obrigatorio." }, length: { maximum: 120 }
  validates :body, presence: { message: "Mensagem e obrigatoria." }, length: { maximum: 500 }
  validates :theme, presence: true, length: { maximum: 40 }
  validates :source_version, presence: true
end
