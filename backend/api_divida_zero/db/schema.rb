# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_13_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "ai_feedbacks", force: :cascade do |t|
    t.bigint "ai_interaction_id", null: false
    t.text "comment"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "useful"
    t.bigint "user_id", null: false
    t.string "vote", null: false
    t.index ["ai_interaction_id"], name: "index_ai_feedbacks_on_ai_interaction_id"
    t.index ["user_id", "created_at"], name: "index_ai_feedbacks_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_ai_feedbacks_on_user_id"
  end

  create_table "ai_interactions", force: :cascade do |t|
    t.integer "completion_tokens", default: 0, null: false
    t.decimal "confidence", precision: 4, scale: 3
    t.datetime "created_at", null: false
    t.text "error_message"
    t.string "feature", null: false
    t.jsonb "input_payload", default: {}, null: false
    t.integer "latency_ms"
    t.string "model"
    t.jsonb "output_payload", default: {}, null: false
    t.integer "prompt_tokens", default: 0, null: false
    t.string "prompt_version", default: "v1", null: false
    t.string "provider"
    t.string "status", default: "success", null: false
    t.integer "total_tokens", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["feature", "created_at"], name: "index_ai_interactions_on_feature_and_created_at"
    t.index ["user_id", "created_at"], name: "index_ai_interactions_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_ai_interactions_on_user_id"
  end

  create_table "ai_usage_counters", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "period_start", null: false
    t.string "period_type", null: false
    t.integer "requests_count", default: 0, null: false
    t.integer "tokens_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "period_type", "period_start"], name: "idx_on_user_id_period_type_period_start_c66aec3a88", unique: true
    t.index ["user_id"], name: "index_ai_usage_counters_on_user_id"
  end

  create_table "analytics_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_name", null: false
    t.json "metadata", default: {}, null: false
    t.string "screen"
    t.string "session_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["session_id"], name: "index_analytics_events_on_session_id"
    t.index ["user_id", "created_at"], name: "index_analytics_events_on_user_id_and_created_at"
    t.index ["user_id", "event_name"], name: "index_analytics_events_on_user_id_and_event_name"
    t.index ["user_id"], name: "index_analytics_events_on_user_id"
  end

  create_table "app_ratings", force: :cascade do |t|
    t.integer "alerts_rating", null: false
    t.integer "calendar_rating", null: false
    t.datetime "created_at", null: false
    t.integer "goals_rating", null: false
    t.integer "helpfulness_rating", null: false
    t.integer "records_rating", null: false
    t.integer "reports_rating", null: false
    t.text "suggestions"
    t.datetime "updated_at", null: false
    t.integer "usability_rating", null: false
    t.bigint "user_id", null: false
    t.index ["created_at"], name: "index_app_ratings_on_created_at"
    t.index ["user_id", "created_at"], name: "index_app_ratings_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_app_ratings_on_user_id", unique: true
  end

  create_table "daily_ai_messages", force: :cascade do |t|
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.jsonb "metadata", default: {}, null: false
    t.string "model"
    t.string "provider"
    t.string "source_version", default: "v1", null: false
    t.string "theme", default: "constancia", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["date"], name: "index_daily_ai_messages_on_date", unique: true
  end

  create_table "device_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "expo_push_token", null: false
    t.datetime "last_seen_at", null: false
    t.string "platform", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["expo_push_token"], name: "index_device_tokens_on_expo_push_token", unique: true
    t.index ["user_id", "platform"], name: "index_device_tokens_on_user_id_and_platform"
    t.index ["user_id"], name: "index_device_tokens_on_user_id"
  end

  create_table "financial_goal_contributions", force: :cascade do |t|
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.datetime "created_at", null: false
    t.bigint "financial_goal_id", null: false
    t.string "kind", null: false
    t.text "notes"
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["financial_goal_id", "created_at"], name: "idx_goal_contributions_goal_created_at"
    t.index ["financial_goal_id"], name: "index_financial_goal_contributions_on_financial_goal_id"
    t.index ["kind"], name: "index_financial_goal_contributions_on_kind"
    t.index ["user_id"], name: "index_financial_goal_contributions_on_user_id"
  end

  create_table "financial_goals", force: :cascade do |t|
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.decimal "current_amount", precision: 12, scale: 2, default: "0.0", null: false
    t.text "description"
    t.string "goal_type", null: false
    t.bigint "household_id"
    t.integer "last_awarded_milestone", default: 0, null: false
    t.integer "progress_pct", default: 0, null: false
    t.date "start_date", null: false
    t.string "status", default: "active", null: false
    t.decimal "target_amount", precision: 12, scale: 2, null: false
    t.date "target_date"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["household_id"], name: "index_financial_goals_on_household_id"
    t.index ["user_id", "goal_type"], name: "index_financial_goals_on_user_id_and_goal_type"
    t.index ["user_id", "start_date"], name: "index_financial_goals_on_user_id_and_start_date"
    t.index ["user_id", "status"], name: "index_financial_goals_on_user_id_and_status"
    t.index ["user_id", "target_date"], name: "index_financial_goals_on_user_id_and_target_date"
    t.index ["user_id"], name: "index_financial_goals_on_user_id"
  end

  create_table "financial_records", force: :cascade do |t|
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "category"
    t.datetime "created_at", null: false
    t.text "description"
    t.date "due_date", null: false
    t.bigint "financial_goal_contribution_id"
    t.bigint "financial_goal_id"
    t.string "flow_type", null: false
    t.string "group_code"
    t.bigint "household_id"
    t.integer "installment_number", default: 1, null: false
    t.integer "installments_total", default: 1, null: false
    t.text "notes"
    t.datetime "paid_at"
    t.string "priority", default: "normal", null: false
    t.string "record_type", null: false
    t.integer "recurrence_count", default: 1, null: false
    t.string "recurrence_type", default: "none", null: false
    t.boolean "recurring", default: false, null: false
    t.string "status", default: "pending", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["financial_goal_contribution_id"], name: "index_financial_records_on_financial_goal_contribution_id"
    t.index ["financial_goal_contribution_id"], name: "index_financial_records_on_goal_contribution_unique", unique: true, where: "(financial_goal_contribution_id IS NOT NULL)"
    t.index ["financial_goal_id"], name: "index_financial_records_on_financial_goal_id"
    t.index ["group_code"], name: "index_financial_records_on_group_code"
    t.index ["household_id"], name: "index_financial_records_on_household_id"
    t.index ["user_id", "due_date", "category"], name: "index_financial_records_on_user_due_category"
    t.index ["user_id", "due_date", "flow_type", "status"], name: "index_financial_records_on_user_due_flow_status"
    t.index ["user_id", "due_date"], name: "index_financial_records_on_user_id_and_due_date"
    t.index ["user_id", "status"], name: "index_financial_records_on_user_id_and_status"
    t.index ["user_id"], name: "index_financial_records_on_user_id"
  end

  create_table "gamification_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.json "metadata", default: {}, null: false
    t.integer "points", default: 0, null: false
    t.integer "source_id"
    t.string "source_type"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["event_type"], name: "index_gamification_events_on_event_type"
    t.index ["source_type", "source_id"], name: "index_gamification_events_on_source_type_and_source_id"
    t.index ["user_id", "created_at"], name: "index_gamification_events_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_gamification_events_on_user_id"
  end

  create_table "household_invitations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "expires_at", null: false
    t.bigint "household_id", null: false
    t.bigint "invited_by_id", null: false
    t.string "status", default: "pending", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_household_invitations_on_household_id"
    t.index ["invited_by_id"], name: "index_household_invitations_on_invited_by_id"
    t.index ["token"], name: "index_household_invitations_on_token", unique: true
  end

  create_table "household_memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "household_id", null: false
    t.datetime "joined_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.string "role", default: "member", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["household_id", "user_id"], name: "index_household_memberships_on_household_id_and_user_id", unique: true
    t.index ["household_id"], name: "index_household_memberships_on_household_id"
    t.index ["user_id"], name: "index_household_memberships_on_user_id"
  end

  create_table "households", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "invite_code", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["invite_code"], name: "index_households_on_invite_code", unique: true
  end

  create_table "imported_transactions", force: :cascade do |t|
    t.decimal "ai_confidence", precision: 4, scale: 3
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "check_number"
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.string "description", null: false
    t.bigint "duplicate_of_id"
    t.string "duplicate_reason"
    t.bigint "financial_record_id"
    t.string "fit_id"
    t.string "flow_type"
    t.string "import_batch_id", null: false
    t.string "original_category"
    t.jsonb "original_data", default: {}
    t.string "source", null: false
    t.string "source_filename"
    t.string "status", default: "pending"
    t.string "suggested_category"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["amount", "date", "description"], name: "idx_imported_dedup"
    t.index ["duplicate_of_id"], name: "index_imported_transactions_on_duplicate_of_id"
    t.index ["financial_record_id"], name: "index_imported_transactions_on_financial_record_id"
    t.index ["import_batch_id"], name: "index_imported_transactions_on_import_batch_id"
    t.index ["user_id", "date"], name: "index_imported_transactions_on_user_id_and_date"
    t.index ["user_id", "fit_id"], name: "idx_imported_fit_id", unique: true, where: "(fit_id IS NOT NULL)"
    t.index ["user_id", "status"], name: "index_imported_transactions_on_user_id_and_status"
    t.index ["user_id"], name: "index_imported_transactions_on_user_id"
  end

  create_table "notification_alerts", force: :cascade do |t|
    t.string "alert_type", null: false
    t.datetime "created_at", null: false
    t.integer "due_count", default: 0, null: false
    t.string "message", null: false
    t.json "metadata", default: {}, null: false
    t.datetime "read_at"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "window_key", null: false
    t.index ["user_id", "alert_type", "window_key"], name: "idx_on_user_id_alert_type_window_key_6b1544e72a", unique: true
    t.index ["user_id", "created_at"], name: "index_notification_alerts_on_user_id_and_created_at"
    t.index ["user_id", "read_at"], name: "index_notification_alerts_on_user_id_and_read_at"
    t.index ["user_id"], name: "index_notification_alerts_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.jsonb "email_notification_preferences", default: {}, null: false
    t.boolean "force_password_change", default: false, null: false
    t.datetime "last_login_at"
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "phone"
    t.boolean "phone_verified", default: false, null: false
    t.string "profile_frame_key", default: "frame_01", null: false
    t.string "profile_icon_key", default: "icon_01", null: false
    t.jsonb "push_preferences", default: {}, null: false
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token_digest"
    t.string "role", default: "user", null: false
    t.datetime "updated_at", null: false
    t.integer "wa_consecutive_429_count", default: 0, null: false
    t.jsonb "wa_notification_preferences", default: {}, null: false
    t.datetime "wa_opt_in_at"
    t.index ["active"], name: "index_users_on_active"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["phone"], name: "index_users_on_phone", unique: true
    t.index ["reset_password_token_digest"], name: "index_users_on_reset_password_token_digest"
    t.index ["role"], name: "index_users_on_role"
  end

  create_table "whatsapp_messages", force: :cascade do |t|
    t.string "category", default: "utility", null: false
    t.datetime "created_at", null: false
    t.text "error_message"
    t.jsonb "metadata", default: {}
    t.bigint "notification_alert_id"
    t.string "provider_message_id"
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false
    t.string "template_name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["notification_alert_id"], name: "index_whatsapp_messages_on_notification_alert_id"
    t.index ["provider_message_id"], name: "index_whatsapp_messages_on_provider_message_id", unique: true
    t.index ["user_id", "created_at"], name: "index_whatsapp_messages_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_whatsapp_messages_on_user_id"
  end

  create_table "whatsapp_templates", force: :cascade do |t|
    t.jsonb "components", default: [], null: false
    t.datetime "created_at", null: false
    t.string "language", default: "pt_BR", null: false
    t.datetime "last_synced_at"
    t.string "name", null: false
    t.string "provider_template_id", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_whatsapp_templates_on_name", unique: true
    t.index ["provider_template_id"], name: "index_whatsapp_templates_on_provider_template_id", unique: true
  end

  add_foreign_key "ai_feedbacks", "ai_interactions"
  add_foreign_key "ai_feedbacks", "users"
  add_foreign_key "ai_interactions", "users"
  add_foreign_key "ai_usage_counters", "users"
  add_foreign_key "analytics_events", "users"
  add_foreign_key "app_ratings", "users"
  add_foreign_key "device_tokens", "users"
  add_foreign_key "financial_goal_contributions", "financial_goals"
  add_foreign_key "financial_goal_contributions", "users"
  add_foreign_key "financial_goals", "households"
  add_foreign_key "financial_goals", "users"
  add_foreign_key "financial_records", "financial_goal_contributions"
  add_foreign_key "financial_records", "financial_goals"
  add_foreign_key "financial_records", "households"
  add_foreign_key "financial_records", "users"
  add_foreign_key "gamification_events", "users"
  add_foreign_key "household_invitations", "households"
  add_foreign_key "household_invitations", "users", column: "invited_by_id"
  add_foreign_key "household_memberships", "households"
  add_foreign_key "household_memberships", "users"
  add_foreign_key "imported_transactions", "financial_records"
  add_foreign_key "imported_transactions", "financial_records", column: "duplicate_of_id"
  add_foreign_key "imported_transactions", "users"
  add_foreign_key "notification_alerts", "users"
  add_foreign_key "whatsapp_messages", "notification_alerts"
  add_foreign_key "whatsapp_messages", "users"
end
