class CreatePlanLimits < ActiveRecord::Migration[8.1]
  def change
    create_table :plan_limits do |t|
      t.references :plan, null: false, foreign_key: true
      t.string :key, null: false
      t.integer :value, null: false
      t.text :description
      t.timestamps
    end
    add_index :plan_limits, [:plan_id, :key], unique: true
  end
end