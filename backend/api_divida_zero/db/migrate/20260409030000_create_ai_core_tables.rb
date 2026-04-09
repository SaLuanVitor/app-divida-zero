class CreateAiCoreTables < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_interactions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :feature, null: false
      t.string :prompt_version, null: false, default: "v1"
      t.jsonb :input_payload, null: false, default: {}
      t.jsonb :output_payload, null: false, default: {}
      t.decimal :confidence, precision: 4, scale: 3
      t.string :status, null: false, default: "success"
      t.integer :latency_ms
      t.integer :prompt_tokens, null: false, default: 0
      t.integer :completion_tokens, null: false, default: 0
      t.integer :total_tokens, null: false, default: 0
      t.string :provider
      t.string :model
      t.text :error_message
      t.timestamps
    end
    add_index :ai_interactions, [:user_id, :created_at]
    add_index :ai_interactions, [:feature, :created_at]

    create_table :ai_feedbacks do |t|
      t.references :user, null: false, foreign_key: true
      t.references :ai_interaction, null: false, foreign_key: true
      t.string :vote, null: false
      t.boolean :useful
      t.text :comment
      t.timestamps
    end
    add_index :ai_feedbacks, [:user_id, :created_at]

    create_table :ai_usage_counters do |t|
      t.references :user, null: false, foreign_key: true
      t.string :period_type, null: false
      t.date :period_start, null: false
      t.integer :requests_count, null: false, default: 0
      t.integer :tokens_count, null: false, default: 0
      t.timestamps
    end
    add_index :ai_usage_counters, [:user_id, :period_type, :period_start], unique: true

    create_table :daily_ai_messages do |t|
      t.date :date, null: false
      t.string :title, null: false
      t.text :body, null: false
      t.string :theme, null: false, default: "constancia"
      t.string :source_version, null: false, default: "v1"
      t.string :provider
      t.string :model
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end
    add_index :daily_ai_messages, :date, unique: true
  end
end
