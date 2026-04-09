class AppRating < ApplicationRecord
  belongs_to :user

  validates :usability_rating, :helpfulness_rating, :calendar_rating, :alerts_rating,
            :goals_rating, :reports_rating, :records_rating,
            numericality: {
              only_integer: true,
              greater_than_or_equal_to: 1,
              less_than_or_equal_to: 5,
              message: "deve ser uma nota entre 1 e 5."
            }

  validates :suggestions, length: { maximum: 1000, message: "deve ter no máximo %{count} caracteres." }, allow_blank: true

  scope :recent_first, -> { order(created_at: :desc) }

  def serialize
    {
      id: id,
      usability_rating: usability_rating,
      helpfulness_rating: helpfulness_rating,
      calendar_rating: calendar_rating,
      alerts_rating: alerts_rating,
      goals_rating: goals_rating,
      reports_rating: reports_rating,
      records_rating: records_rating,
      suggestions: suggestions,
      created_at: created_at
    }
  end
end
