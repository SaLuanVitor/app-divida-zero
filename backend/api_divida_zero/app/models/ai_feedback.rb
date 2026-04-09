class AiFeedback < ApplicationRecord
  VOTES = %w[like dislike].freeze

  belongs_to :user
  belongs_to :ai_interaction

  validates :vote, inclusion: { in: VOTES, message: "Voto invalido." }
  validates :comment, length: { maximum: 500, message: "Comentario deve ter no maximo %{count} caracteres." }, allow_blank: true
end
