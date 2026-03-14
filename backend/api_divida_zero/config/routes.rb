Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/register", to: "auth#register"
      post "auth/login", to: "auth#login"
      post "auth/refresh", to: "auth#refresh"
      post "auth/forgot_password", to: "auth#forgot_password"
      post "auth/reset_password", to: "auth#reset_password"
      get "auth/me", to: "auth#me"
      patch "auth/profile", to: "auth#update_profile"
      patch "auth/change_password", to: "auth#change_password"
      get "gamification/summary", to: "gamification#summary"
      get "gamification/events", to: "gamification#events"

      resources :financial_records, only: [:index, :create, :destroy] do
        member do
          patch :pay
        end
      end
      resources :financial_goals, only: [:index, :create, :update, :destroy]
    end
  end
end

