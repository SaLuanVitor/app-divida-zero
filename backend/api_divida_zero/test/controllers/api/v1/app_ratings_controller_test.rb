require "test_helper"

class Api::V1::AppRatingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Avaliacoes",
      email: "usuario_avaliacoes_#{Time.now.to_i}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @other_user = User.create!(
      name: "Outro Usuario",
      email: "outro_usuario_avaliacoes_#{Time.now.to_i}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "create stores app rating for authenticated user" do
    assert_difference("AppRating.count", 1) do
      post "/api/v1/app_ratings", params: valid_payload, headers: auth_header(@tokens[:access_token])
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert body["id"].present?
    assert_equal "Avaliação enviada com sucesso.", body["message"]
  end

  test "create rejects invalid payload" do
    post "/api/v1/app_ratings", params: valid_payload.merge(usability_rating: 6), headers: auth_header(@tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "me returns only ratings from authenticated user" do
    @user.app_ratings.create!(valid_payload)
    @other_user.app_ratings.create!(valid_payload.merge(suggestions: "Outro usuário"))

    get "/api/v1/app_ratings/me", headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    ratings = body["ratings"]
    assert_equal 1, ratings.length
    assert_equal "Fluxo de metas ajudou muito.", ratings.first["suggestions"]
  end

  test "summary returns aggregated metrics" do
    @user.app_ratings.create!(valid_payload.merge(usability_rating: 5, helpfulness_rating: 3))
    @other_user.app_ratings.create!(valid_payload.merge(usability_rating: 3, helpfulness_rating: 5))

    get "/api/v1/app_ratings/summary", headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 2, body["total_responses"]
    assert_equal 4.0, body.dig("averages", "usability")
    assert_equal 4.0, body.dig("averages", "helpfulness")
  end

  test "endpoints require token" do
    post "/api/v1/app_ratings", params: valid_payload
    assert_response :unauthorized

    get "/api/v1/app_ratings/me"
    assert_response :unauthorized

    get "/api/v1/app_ratings/summary"
    assert_response :unauthorized
  end

  private

  def valid_payload
    {
      usability_rating: 5,
      helpfulness_rating: 4,
      calendar_rating: 5,
      alerts_rating: 4,
      goals_rating: 5,
      reports_rating: 4,
      records_rating: 5,
      suggestions: "Fluxo de metas ajudou muito."
    }
  end

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
