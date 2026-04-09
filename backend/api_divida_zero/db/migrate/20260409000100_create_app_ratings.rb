class CreateAppRatings < ActiveRecord::Migration[8.1]
  def change
    create_table :app_ratings do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :usability_rating, null: false
      t.integer :helpfulness_rating, null: false
      t.integer :calendar_rating, null: false
      t.integer :alerts_rating, null: false
      t.integer :goals_rating, null: false
      t.integer :reports_rating, null: false
      t.integer :records_rating, null: false
      t.text :suggestions

      t.timestamps
    end

    add_index :app_ratings, [:user_id, :created_at]
    add_index :app_ratings, :created_at
  end
end
