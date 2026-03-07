class CreateGamificationEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :gamification_events do |t|
      t.references :user, null: false, foreign_key: true
      t.string :event_type, null: false
      t.integer :points, null: false, default: 0
      t.string :source_type
      t.integer :source_id
      t.json :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :gamification_events, [:user_id, :created_at]
    add_index :gamification_events, [:source_type, :source_id]
    add_index :gamification_events, :event_type
  end
end
