class CreatePlans < ActiveRecord::Migration[8.1]
  def change
    create_table :plans do |t|
      t.string :name, null: false
      t.boolean :active, null: false, default: true
      t.text :description
      t.timestamps
    end
    add_index :plans, :name, unique: true
    add_index :plans, :active
  end
end