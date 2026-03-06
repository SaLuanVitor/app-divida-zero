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

ActiveRecord::Schema[8.1].define(version: 2026_03_06_012000) do
  create_table "financial_records", force: :cascade do |t|
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "category"
    t.datetime "created_at", null: false
    t.text "description"
    t.date "due_date", null: false
    t.string "flow_type", null: false
    t.string "group_code"
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
    t.index ["group_code"], name: "index_financial_records_on_group_code"
    t.index ["user_id", "due_date"], name: "index_financial_records_on_user_id_and_due_date"
    t.index ["user_id", "status"], name: "index_financial_records_on_user_id_and_status"
    t.index ["user_id"], name: "index_financial_records_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token_digest"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token_digest"], name: "index_users_on_reset_password_token_digest"
  end

  add_foreign_key "financial_records", "users"
end
