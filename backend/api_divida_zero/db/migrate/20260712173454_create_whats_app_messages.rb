class CreateWhatsAppMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :whatsapp_messages do |t|
      t.references :user, null: false, foreign_key: true
      t.references :notification_alert, foreign_key: true
      t.string :provider_message_id
      t.string :template_name, null: false
      t.string :status, null: false, default: "pending"
      t.string :category, null: false, default: "utility"
      t.text :error_message
      t.jsonb :metadata, default: {}
      t.datetime :sent_at
      t.timestamps
    end

    add_index :whatsapp_messages, [:user_id, :created_at]
    add_index :whatsapp_messages, :provider_message_id, unique: true
  end
end
