# Story 4.1 — Model + Migration: ImportedTransaction

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing
> **Story:** 4.1 — Model + Migration
> **Prioridade:** Alta
> **Dependências:** Nenhuma

---

## Acceptance Criteria

- [x] AC-01: Migration `CreateImportedTransactions` criada com todos os campos do schema
- [x] AC-02: Model `ImportedTransaction` com `belongs_to :user`
- [x] AC-03: Scopes `pending`, `duplicate`, `accepted`, `rejected`, `from_batch`, `pending_or_duplicate`
- [x] AC-04: Validações: `description`, `amount`, `date`, `import_batch_id` obrigatórios
- [x] AC-05: Índices: `[user_id, status]`, `[user_id, date]`, `[import_batch_id]`, `[amount, date, description]`
- [x] AC-06: Índice único para `[user_id, fit_id]` (where `fit_id IS NOT NULL`)
- [x] AC-07: `db:migrate` roda sem erros em SQLite e PostgreSQL
- [x] AC-08: `db:rollback` funciona corretamente

## Files

### CreateImportedTransactions migration

```ruby
# db/migrate/20260712000001_create_imported_transactions.rb
class CreateImportedTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :imported_transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :import_batch_id, null: false
      t.string :source, null: false
      t.string :source_filename
      t.string :description, null: false
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.date :date, null: false
      t.string :flow_type
      t.string :original_category
      t.string :suggested_category
      t.decimal :ai_confidence, precision: 4, scale: 3
      t.string :status, default: "pending"
      t.string :duplicate_reason
      t.references :duplicate_of, foreign_key: { to_table: :financial_records }
      t.references :financial_record, foreign_key: true
      t.jsonb :original_data, default: {}
      t.string :fit_id
      t.string :check_number
      t.timestamps
    end

    add_index :imported_transactions, :import_batch_id
    add_index :imported_transactions, [:user_id, :status]
    add_index :imported_transactions, [:user_id, :date]
    add_index :imported_transactions, [:amount, :date, :description], name: "idx_imported_dedup"
    add_index :imported_transactions, [:user_id, :fit_id], unique: true, where: "fit_id IS NOT NULL",
              name: "idx_imported_fit_id"
  end
end
```

### Model

```ruby
# app/models/imported_transaction.rb
class ImportedTransaction < ApplicationRecord
  belongs_to :user
  belongs_to :duplicate_of, class_name: "FinancialRecord", optional: true
  belongs_to :financial_record, optional: true

  validates :import_batch_id, presence: true
  validates :description, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :date, presence: true
  validates :source, presence: true, inclusion: { in: %w[ofx_upload csv_upload] }
  validates :status, inclusion: { in: %w[pending duplicate accepted rejected] }

  scope :pending, -> { where(status: "pending") }
  scope :duplicate, -> { where(status: "duplicate") }
  scope :accepted, -> { where(status: "accepted") }
  scope :rejected, -> { where(status: "rejected") }
  scope :pending_or_duplicate, -> { where(status: %w[pending duplicate]) }
  scope :from_batch, ->(batch_id) { where(import_batch_id: batch_id) }
end
```

### User association

```ruby
# Em app/models/user.rb — adicionar:
has_many :imported_transactions, dependent: :destroy
```

### Schema update

Rodar `bin/rails db:migrate` e atualizar `db/schema.rb`.
