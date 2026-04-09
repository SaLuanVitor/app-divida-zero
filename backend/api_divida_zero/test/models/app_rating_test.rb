require "test_helper"

class AppRatingTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Avaliacao",
      email: "usuario_avaliacao_#{Time.now.to_i}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "is valid with all required ratings and optional suggestions" do
    rating = AppRating.new(
      user: @user,
      usability_rating: 5,
      helpfulness_rating: 4,
      calendar_rating: 5,
      alerts_rating: 4,
      goals_rating: 5,
      reports_rating: 4,
      records_rating: 5,
      suggestions: "Muito útil para acompanhar metas e lançamentos."
    )

    assert rating.valid?
  end

  test "is invalid when rating is out of range" do
    rating = AppRating.new(
      user: @user,
      usability_rating: 0,
      helpfulness_rating: 4,
      calendar_rating: 5,
      alerts_rating: 4,
      goals_rating: 5,
      reports_rating: 4,
      records_rating: 5
    )

    assert_not rating.valid?
    assert_includes rating.errors[:usability_rating], "deve ser uma nota entre 1 e 5."
  end

  test "is invalid when a required rating is missing" do
    rating = AppRating.new(
      user: @user,
      usability_rating: 5,
      helpfulness_rating: nil,
      calendar_rating: 5,
      alerts_rating: 4,
      goals_rating: 5,
      reports_rating: 4,
      records_rating: 5
    )

    assert_not rating.valid?
    assert_includes rating.errors[:helpfulness_rating], "deve ser uma nota entre 1 e 5."
  end

  test "is invalid when suggestions exceed max length" do
    rating = AppRating.new(
      user: @user,
      usability_rating: 5,
      helpfulness_rating: 4,
      calendar_rating: 5,
      alerts_rating: 4,
      goals_rating: 5,
      reports_rating: 4,
      records_rating: 5,
      suggestions: "a" * 1001
    )

    assert_not rating.valid?
    assert_includes rating.errors[:suggestions], "deve ter no máximo 1000 caracteres."
  end
end
