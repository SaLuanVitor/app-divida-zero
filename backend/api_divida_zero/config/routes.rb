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
      patch "auth/email_notifications", to: "auth#update_email_notifications"
      patch "auth/whatsapp_notifications", to: "auth#update_wa_notifications"
      patch "auth/phone", to: "auth#send_phone_code"
      post "auth/phone/verify", to: "auth#verify_phone"
      patch "auth/change_password", to: "auth#change_password"

      resource :household, only: %i[show create update destroy], controller: "households" do
        resources :invitations, only: %i[index create destroy], controller: "household_invitations"
      end
      resources :invitations, only: [], param: :token do
        member do
          post :accept
          post :decline
        end
      end
      get "invitations/pending", to: "invitations#pending"
      get "gamification/summary", to: "gamification#summary"
      get "gamification/events", to: "gamification#events"
      get "notifications/history", to: "notifications#history"
      patch "notifications/read_all", to: "notifications#read_all"
      post "devices", to: "devices#create"
      delete "devices", to: "devices#destroy"
      post "app_ratings", to: "app_ratings#create"
      get "app_ratings/me", to: "app_ratings#me"
      get "app_ratings/summary", to: "app_ratings#summary"
      namespace :admin do
        get "users", to: "users#index"
        patch "users/:id/status", to: "users#update_status"
        patch "users/:id/reset_password", to: "users#reset_password"
        get "analytics/overview", to: "analytics#overview"
      end
      get "reports/summary", to: "reports#summary"
      post "analytics/events", to: "analytics#create"
      post "ai/next_action", to: "ai#next_action"
      post "ai/alerts", to: "ai#alerts"
      post "ai/categorize_record", to: "ai#categorize_record"
      post "ai/reports_briefing", to: "ai#reports_briefing"
      post "ai/feedback", to: "ai#feedback"
      get "daily_message/today", to: "daily_messages#today"
      post "daily_message/dispatch", to: "daily_messages#dispatch_daily"

      resources :financial_records, only: [:index, :create, :destroy] do
        member do
          patch :pay
          patch :status, action: :update_status
        end
      end
      get "whatsapp/webhook", to: "whatsapp#verify"
      post "whatsapp/webhook", to: "whatsapp#webhook"

      namespace :bank do
        resources :statements, only: [], param: :batch_id do
          collection do
            post :upload
          end
          member do
            get :status
            delete :destroy
          end
        end
        resources :transactions, only: [] do
          collection do
            get :pending
            post :accept
            post :reject
          end
          member do
            post :merge
          end
        end
      end

      resources :financial_goals, only: [:index, :create, :update, :destroy] do
        resources :contributions,
                  only: [:index, :create, :destroy],
                  controller: "financial_goal_contributions"
      end
    end
  end
end

