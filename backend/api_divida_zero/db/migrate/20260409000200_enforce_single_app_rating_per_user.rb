class EnforceSingleAppRatingPerUser < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      DELETE FROM app_ratings a
      USING app_ratings b
      WHERE a.user_id = b.user_id
        AND (a.created_at < b.created_at OR (a.created_at = b.created_at AND a.id < b.id))
    SQL

    remove_index :app_ratings, :user_id if index_exists?(:app_ratings, :user_id)
    add_index :app_ratings, :user_id, unique: true
  end

  def down
    remove_index :app_ratings, :user_id if index_exists?(:app_ratings, :user_id)
    add_index :app_ratings, :user_id
  end
end
