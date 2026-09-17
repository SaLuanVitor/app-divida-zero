class CreateWhatsAppTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :whatsapp_templates do |t|
      t.string :provider_template_id, null: false
      t.string :name, null: false
      t.string :language, default: "pt_BR", null: false
      t.string :status, default: "pending", null: false
      t.jsonb :components, default: [], null: false
      t.datetime :last_synced_at
      t.timestamps
    end

    add_index :whatsapp_templates, :name, unique: true
    add_index :whatsapp_templates, :provider_template_id, unique: true
  end
end
