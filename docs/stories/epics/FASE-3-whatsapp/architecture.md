# FASE 3 — WhatsApp Business API: Architecture Document

> **Arquiteta:** Aria (Architect)
> **Data:** 2026-07-12
> **Status:** Aprovado
> **Owner:** SaLuanVitor

---

## Table of Contents

1. [NotificationChannel Abstraction](#1-notificationchannel-abstraction)
2. [Message Queue Architecture](#2-message-queue-architecture)
3. [Rate Limiting — Token Bucket](#3-rate-limiting--token-bucket)
4. [Daily Limits](#4-daily-limits)
5. [Blocking Prevention](#5-blocking-prevention)
6. [Data Model](#6-data-model)
7. [API Design](#7-api-design)
8. [Mobile Integration](#8-mobile-integration)
9. [ADRs](#9-adrs-architecture-decision-records)
10. [Migration Plan](#10-migration-plan)

---

## 1. NotificationChannel Abstraction

### 1.1 Class Hierarchy

```
app/channels/
  application_channel.rb        # Base abstract class
  email_channel.rb              # Resend/API email delivery
  push_channel.rb               # Expo Push API delivery
  whatsapp_channel.rb           # Provider SDK delivery
  concerns/
    rate_limitable.rb           # Optional rate limiter mixin
```

### 1.2 `ApplicationChannel` (Base)

```ruby
# app/channels/application_channel.rb
class ApplicationChannel
  def deliver(message_payload)
    raise NotImplementedError, "#{self.class} must implement #deliver"
  end

  def valid_recipient?(user)
    raise NotImplementedError, "#{self.class} must implement #valid_recipient?"
  end

  def rate_limiter
    nil
  end

  def channel_name
    self.class.name.underscore.delete_suffix("_channel")
  end

  # Shared helper: check if user has a given alert type enabled
  def alert_type_enabled?(user, alert_type, preference_key)
    prefs = user.send(preference_key)
    ActiveModel::Type::Boolean.new.cast(prefs["#{channel_name}_notifications_enabled"]) &&
      ActiveModel::Type::Boolean.new.cast(prefs["#{channel_name}_#{alert_type}"])
  end
end
```

### 1.3 Channel Interface

| Method | Returns | Description |
|--------|---------|-------------|
| `deliver(message_payload)` | `Hash` | Sends the notification synchronously. Returns `{ success: true/false, message_id: String or nil, error: String or nil }` |
| `valid_recipient?(user)` | `Boolean` | Checks opt-in and prerequisites for the user |
| `rate_limiter` | `Object or nil` | Returns a rate limiter instance or nil |
| `channel_name` | `String` | Machine-readable channel identifier ("push", "email", "whatsapp") |

### 1.4 Refactored Channels

**EmailChannel** (replaces inline logic in `EmailDispatchJob`):

```ruby
# app/channels/email_channel.rb
class EmailChannel < ApplicationChannel
  def deliver(message_payload)
    user = message_payload[:user]
    alert = message_payload[:alert]
    case alert.alert_type
    when "due_today", "near_due", "overdue"
      NotificationMailer.due_reminder(user, alert).deliver_now
    when "weekly_summary"
      NotificationMailer.weekly_summary(user, alert).deliver_now
    end
    { success: true }
  end

  def valid_recipient?(user)
    user.email_enabled_for_alert?(alert_type)
  end
end
```

**PushChannel** (replaces inline logic in `PushDispatchJob`):

```ruby
# app/channels/push_channel.rb
class PushChannel < ApplicationChannel
  def deliver(message_payload)
    user = message_payload[:user]
    alert = message_payload[:alert]
    tokens = user.device_tokens.pluck(:expo_push_token)
    return { success: false, error: "no_tokens" } if tokens.empty?

    ExpoPushService.deliver(
      tokens: tokens,
      title: alert.title,
      body: alert.message,
      data: { alert_type: alert.alert_type, notification_alert_id: alert.id, source: "server_push" }
    )
    { success: true }
  end

  def valid_recipient?(user)
    user.push_enabled_for_alert?(alert_type)
  end
end
```

**WhatsAppChannel** (stub in 3a, full in 3b/3c):

```ruby
# app/channels/whatsapp_channel.rb
class WhatsAppChannel < ApplicationChannel
  def deliver(message_payload)
    user = message_payload[:user]
    alert = message_payload[:alert]
    template = resolve_template(alert.alert_type)
    provider = WhatsAppProvider.client

    response = provider.send_template(
      to: user.phone,
      template_name: template.name,
      language: "pt_BR",
      components: build_components(alert, template)
    )

    { success: true, message_id: response["messages"]&.first&.dig("id") }
  rescue WhatsAppProvider::RateLimitedError => e
    { success: false, error: "rate_limited", retry_after: e.retry_after }
  rescue WhatsAppProvider::ApiError => e
    { success: false, error: e.message }
  end

  def valid_recipient?(user)
    user.phone.present? &&
      user.phone_verified? &&
      user.wa_opt_in_at.present? &&
      user.wa_enabled_for_alert?(alert_type)
  end

  def rate_limiter
    @rate_limiter ||= WhatsAppRateLimiter.instance
  end

  private

  def resolve_template(alert_type)
    template_map = {
      "due_today" => "due_reminder",
      "near_due" => "due_reminder",
      "overdue" => "overdue_alert",
      "weekly_summary" => "weekly_summary"
    }
    template_name = template_map[alert_type] || alert_type
    WhatsAppTemplate.find_by!(name: template_name, status: "approved")
  end

  def build_components(alert, template)
    # Renders template body with alert data
    # Delegates to WhatsAppTemplateRenderer
  end
end
```

### 1.5 Refactored Dispatch Jobs

Jobs become thin wrappers that delegate to channels:

```ruby
# app/jobs/push_dispatch_job.rb (refactored)
class PushDispatchJob < ApplicationJob
  queue_as :default

  def perform(notification_alert_id)
    alert = NotificationAlert.find_by(id: notification_alert_id)
    return unless alert

    channel = PushChannel.new
    return unless channel.valid_recipient?(alert.user)

    channel.deliver(user: alert.user, alert: alert)
  end
end
```

Same pattern for `EmailDispatchJob`.

### 1.6 `NotificationAlertsService` Changes

```ruby
# Inside create_alert_once! — add WhatsApp dispatch
def create_alert_once!(user:, alert_type:, due_count:, window_key:, title:, message:, metadata: {})
  return if due_count <= 0
  return if user.notification_alerts.exists?(alert_type: alert_type, window_key: window_key)

  alert = user.notification_alerts.create!(...)

  PushDispatchJob.perform_later(alert.id)
  EmailDispatchJob.perform_later(alert.id)
  WhatsAppDispatchJob.perform_later(alert.id)  # NEW
  alert
end
```

---

## 2. Message Queue Architecture

### 2.1 Queue Topology

```
                    ┌───────────────────┐
                    │  Recurring Jobs    │
                    │  (cron)            │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ NotificationAlerts │
                    │ Service            │
                    └──┬────┬────┬──────┘
                       │    │    │
              ┌────────┘    │    └──────────┐
              ▼             ▼               ▼
      ┌────────────┐ ┌────────────┐ ┌────────────┐
      │  default   │ │  default   │ │  whatsapp  │ ← DEDICATED QUEUE
      │    queue   │ │    queue   │ │    queue   │
      ├────────────┤ ├────────────┤ ├────────────┤
      │ PushDispatch│ │EmailDispatch│ │WhatsApp   │
      │ Job        │ │Job         │ │DispatchJob │
      └────────────┘ └────────────┘ └─────┬──────┘
                                          │
                                          ▼
                                 ┌────────────────┐
                                 │ WhatsAppChannel │
                                 │  (deliver)     │
                                 ├────────────────┤
                                 │ WhatsAppRate   │
                                 │ Limiter        │
                                 ├────────────────┤
                                 │ Provider SDK   │
                                 │ (Z-API/Twilio/ │
                                 │  Meta Cloud)   │
                                 └────────────────┘
```

### 2.2 Queue Configuration (`config/solid_queue.yml`)

```yaml
default:
  workers:
    - queues: [default]
      threads: 5
      processes: 1
  dispatcher:
    - polling_interval: 1

whatsapp:
  workers:
    - queues: [whatsapp]
      threads: 3
      processes: 1
  dispatcher:
    - polling_interval: 2  # Poll less aggressively to reduce rate limit pressure
```

### 2.3 Retry Strategy

```ruby
# app/jobs/whatsapp_dispatch_job.rb
class WhatsAppDispatchJob < ApplicationJob
  queue_as :whatsapp

  retry_on WhatsAppProvider::RateLimitedError, wait: ->(executions) {
    # Exponential backoff: 5s, 10s, 20s — max 3 retries
    [5, 10, 20][executions - 1] || 20
  }, attempts: 3

  discard_on WhatsAppProvider::PermanentError do |job, error|
    # Dead letter: mark message as failed
    alert = NotificationAlert.find_by(id: job.arguments.first)
    if alert&.user
      record = WhatsAppMessage.create!(
        user: alert.user,
        notification_alert: alert,
        template_name: resolve_template_name(alert.alert_type),
        status: "failed",
        error_message: error.message,
        category: "utility"
      )
      Rails.logger.error("[WhatsApp] Dead letter alert=#{alert.id} error=#{error.message}")
    end
  end

  def perform(notification_alert_id)
    alert = NotificationAlert.find_by(id: notification_alert_id)
    return unless alert

    user = alert.user
    channel = WhatsAppChannel.new

    # 1. Validate recipient
    return unless channel.valid_recipient?(user)

    # 2. Check DND
    return if dnd_active?(user)

    # 3. Check daily cap per user
    return if daily_cap_reached?(user)

    # 4. Check global daily cap
    return if global_daily_cap_reached?

    # 5. Apply rate limiter (Token Bucket)
    limiter = channel.rate_limiter
    if limiter && !limiter.consume
      raise WhatsAppProvider::RateLimitedError.new("Token bucket exhausted", retry_after: 1)
    end

    # 6. Send via channel
    result = channel.deliver(user: user, alert: alert)

    if result[:success]
      # 7. Track success
      WhatsAppMessage.create!(
        user: user,
        notification_alert: alert,
        provider_message_id: result[:message_id],
        template_name: resolve_template_name(alert.alert_type),
        status: "sent",
        category: "utility",
        sent_at: Time.current
      )
    end
  end

  private

  def dnd_active?(user)
    return false unless user.wa_notification_preferences["wa_dnd_start"]

    now = Time.current
    dnd_start = parse_time(user.wa_notification_preferences["wa_dnd_start"])
    dnd_end = parse_time(user.wa_notification_preferences["wa_dnd_end"])
    current_seconds = now.seconds_since_midnight

    if dnd_start <= dnd_end
      # Same-day window: e.g. 22:00-08:00 next day
      (dnd_start..dnd_end).cover?(current_seconds) ||
        (current_seconds >= dnd_start || current_seconds <= dnd_end)
    else
      # Cross-midnight: e.g. 22:00-08:00
      current_seconds >= dnd_start || current_seconds <= dnd_end
    end
  end

  def parse_time(str)
    hour, min = str.split(":").map(&:to_i)
    hour * 3600 + min * 60
  end

  def daily_cap_reached?(user)
    today_start = Time.current.beginning_of_day
    sent_today = WhatsAppMessage.where(user: user, status: "sent")
                                .where("created_at >= ?", today_start)
                                .count
    daily_cap = user.wa_notification_preferences["wa_daily_cap"] || 10
    sent_today >= daily_cap.to_i
  end

  def global_daily_cap_reached?
    today_start = Time.current.beginning_of_day
    sent_today = WhatsAppMessage.where(status: "sent")
                                .where("created_at >= ?", today_start)
                                .count
    global_cap = ENV.fetch("WHATSAPP_DAILY_CAP", 500).to_i
    sent_today >= global_cap
  end

  def resolve_template_name(alert_type)
    map = { "due_today" => "due_reminder", "near_due" => "due_reminder",
            "overdue" => "overdue_alert", "weekly_summary" => "weekly_summary" }
    map[alert_type] || alert_type
  end
end
```

### 2.4 Provider Errors Classification

```ruby
module WhatsAppProvider
  # Transient — retry with backoff
  class RateLimitedError < StandardError
    attr_reader :retry_after

    def initialize(msg = "rate_limited", retry_after: 5)
      @retry_after = retry_after
      super(msg)
    end
  end

  class ServerError < StandardError; end

  # Permanent — discard to dead letter
  class PermanentError < StandardError; end
  class AuthenticationError < PermanentError; end
  class TemplateNotFoundError < PermanentError; end
  class InvalidPhoneError < PermanentError; end
end
```

---

## 3. Rate Limiting — Token Bucket

### 3.1 Algorithm

```
Token Bucket:
  bucket_size:    10 tokens (max burst)
  refill_rate:    1 token/second (global)
  refill_per_phone: 1 token/5 seconds (per phone)
  consume:        removes 1 token if available, returns true/false
```

### 3.2 Implementation

```ruby
# app/services/whatsapp_rate_limiter.rb
class WhatsAppRateLimiter
  include Singleton

  def initialize
    @bucket_size = ENV.fetch("WHATSAPP_BURST_SIZE", 10).to_i
    @refill_rate = ENV.fetch("WHATSAP_REFILL_RATE", 1).to_f  # tokens/second
    @mutex = Mutex.new
    @tokens = @bucket_size
    @last_refill = monotonic_time
  end

  def consume(phone: nil)
    @mutex.synchronize do
      refill

      if @tokens >= 1
        @tokens -= 1
        true
      else
        false
      end
    end
  end

  def remaining
    @mutex.synchronize do
      refill
      @tokens.floor
    end
  end

  private

  def refill
    now = monotonic_time
    elapsed = now - @last_refill
    added = elapsed * @refill_rate
    @tokens = [@tokens + added, @bucket_size].min
    @last_refill = now
  end

  def monotonic_time
    Process.clock_gettime(Process::CLOCK_MONOTONIC)
  end
end
```

### 3.3 Per-Phone Rate Limiting

A secondary `InMemoryRateLimiter` for phone-level limits using a Hash with TTL:

```ruby
# app/services/phone_rate_limiter.rb
class PhoneRateLimiter
  include Singleton

  def initialize
    @store = {}
    @mutex = Mutex.new
  end

  def allowed?(phone, min_interval: 5)
    @mutex.synchronize do
      last_sent = @store[phone]
      return true if last_sent.nil?

      elapsed = Time.current - last_sent
      if elapsed >= min_interval
        @store[phone] = Time.current
        true
      else
        false
      end
    end
  end

  def record_send(phone)
    @mutex.synchronize { @store[phone] = Time.current }
  end
end
```

### 3.4 Pipeline Placement

```
Job dequeue
  → DND check
  → User daily cap check
  → Global daily cap check
  → Phone rate limiter check
  → Token bucket consume  ← HERE
  → WhatsAppChannel.deliver
  → If 429 from provider → retry with backoff (skip token bucket on retry)
```

For provider-level 429 responses, tokens are NOT consumed (returned to bucket or retry path skips token consumption).

---

## 4. Daily Limits

### 4.1 Per-User Cap

| Field | Default | Configurable Via |
|-------|---------|------------------|
| `wa_daily_cap` | 10 | `wa_notification_preferences["wa_daily_cap"]` per user tier |

Enforcement in `WhatsAppDispatchJob#daily_cap_reached?` via `WhatsAppMessage` aggregation:

```sql
SELECT COUNT(*) FROM whatsapp_messages
WHERE user_id = ?
  AND status = 'sent'
  AND created_at >= CURRENT_DATE
```

### 4.2 Global App Cap

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `WHATSAPP_DAILY_CAP` | 500 | Hard limit across all users |

Enforcement in `WhatsAppDispatchJob#global_daily_cap_reached?` via:

```sql
SELECT COUNT(*) FROM whatsapp_messages
WHERE status = 'sent'
  AND created_at >= CURRENT_DATE
```

### 4.3 Reset Mechanism

Cap resets naturally at midnight because queries use `CURRENT_DATE` / `Time.current.beginning_of_day`.

No explicit reset job needed — but for observability, a recurring job logs daily stats:

```yaml
# config/recurring.yml additions
development:
  # ...existing jobs...
  whatsapp_reset_daily_counters:
    class: WhatsAppDailyMetricsJob
    schedule: "0 0 * * *"   # midnight

production:
  # ...existing jobs...
  whatsapp_reset_daily_counters:
    class: WhatsAppDailyMetricsJob
    schedule: "0 0 * * *"
```

```ruby
# app/jobs/whatsapp_daily_metrics_job.rb
class WhatsAppDailyMetricsJob < ApplicationJob
  queue_as :whatsapp

  def perform(*)
    yesterday = 1.day.ago.beginning_of_day..Time.current.beginning_of_day
    sent = WhatsAppMessage.where(status: "sent", created_at: yesterday).count
    failed = WhatsAppMessage.where(status: "failed", created_at: yesterday).count
    Rails.logger.info "[WhatsApp] Daily metrics: sent=#{sent} failed=#{failed}"
  end
end
```

---

## 5. Blocking Prevention

### 5.1 DND Enforcement

- **Default window:** 22:00 – 08:00 (configurable per user via `wa_preferences`)
- **Enforcement layer:** `WhatsAppDispatchJob#dnd_active?`
- **Behavior:** Silently skip (do not queue retry) — the alert will be picked up in the next generation cycle (every 6h)
- **Edge case:** If `dnd_start == dnd_end`, treat as no DND restriction

### 5.2 Opt-In Validation

| Check | Location | Behavior |
|-------|----------|----------|
| `phone.present?` | `WhatsAppChannel#valid_recipient?` | Skip if no phone |
| `phone_verified?` | Same | Skip if unverified |
| `wa_opt_in_at.present?` | Same | Skip if never opted in |
| `wa_notifications_enabled == true` | `User#wa_enabled_for_alert?` | Skip if toggled off |

```ruby
# In User model — follows email/push pattern
WA_PREFERENCE_DEFAULTS = {
  "wa_notifications_enabled" => false,
  "wa_due_reminders" => true,
  "wa_weekly_summary" => true,
  "wa_dnd_start" => "22:00",
  "wa_dnd_end" => "08:00",
  "wa_daily_cap" => 10
}.freeze

def wa_preferences_with_defaults
  WA_PREFERENCE_DEFAULTS.merge(wa_notification_preferences.stringify_keys)
end

def update_wa_preferences!(raw_preferences)
  return if raw_preferences.blank?
  allowed = WA_PREFERENCE_DEFAULTS.keys
  incoming = raw_preferences.to_h.stringify_keys.slice(*allowed)
  return if incoming.empty?
  update!(wa_notification_preferences: wa_preferences_with_defaults.merge(incoming))
end

def wa_enabled_for_alert?(alert_type)
  prefs = wa_preferences_with_defaults
  return false unless ActiveModel::Type::Boolean.new.cast(prefs["wa_notifications_enabled"])
  return false if phone.blank? || !phone_verified || wa_opt_in_at.nil?

  case alert_type.to_s
  when "due_today", "near_due", "overdue"
    ActiveModel::Type::Boolean.new.cast(prefs["wa_due_reminders"])
  when "weekly_summary"
    ActiveModel::Type::Boolean.new.cast(prefs["wa_weekly_summary"])
  else
    true
  end
end
```

### 5.3 Quality Score Monitoring

```ruby
# app/jobs/whatsapp_quality_monitor_job.rb
class WhatsAppQualityMonitorJob < ApplicationJob
  queue_as :whatsapp

  def perform(*)
    provider = WhatsAppProvider.client
    score = provider.account_quality
    Rails.logger.info "[WhatsApp] Quality score: #{score}"

    if score < 50
      AdminNotificationService.alert(
        title: "WhatsApp Quality Score Crítico",
        message: "Score atual: #{score}. Risco de bloqueio iminente."
      )
    elsif score < 60
      Rails.logger.warn "[WhatsApp] Quality score baixo: #{score}"
    end
  end
end
```

```yaml
# config/recurring.yml addition
  whatsapp_quality_monitor:
    class: WhatsAppQualityMonitorJob
    schedule: "0 8 * * *"   # daily at 8 AM
```

### 5.4 Template Compliance

- Only send using templates with `status == "approved"` in `WhatsAppTemplate`
- `WhatsAppChannel#resolve_template` raises `WhatsAppProvider::TemplateNotFoundError` if missing/not approved
- Category restricted to `"utility"` — no marketing templates in FASE 3

---

## 6. Data Model

### 6.1 Migration Order

```
Migration 1: AddWhatsAppFieldsToUsers
Migration 2: CreateWhatsAppMessages
Migration 3: CreateWhatsAppTemplates
```

### 6.2 `AddWhatsAppFieldsToUsers`

```ruby
class AddWhatsAppFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :phone, :string
    add_column :users, :phone_verified, :boolean, default: false, null: false
    add_column :users, :wa_opt_in_at, :datetime
    add_column :users, :wa_notification_preferences, :jsonb, default: {}, null: false

    add_index :users, :phone, unique: true
    add_index :users, :wa_opt_in_at, where: "wa_opt_in_at IS NOT NULL",
              name: "idx_users_wa_opted_in"
  end
end
```

### 6.3 `CreateWhatsAppMessages`

```ruby
class CreateWhatsAppMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :whatsapp_messages do |t|
      t.references :user, null: false, foreign_key: true
      t.references :notification_alert, null: true, foreign_key: true
      t.string :provider_message_id
      t.string :template_name, null: false
      t.string :status, default: "pending", null: false
      # Status lifecycle: pending → sent → delivered → read → failed
      # Skipped states: rejected (template not approved)
      t.text :error_message
      t.string :category, null: false, default: "utility"
      t.jsonb :metadata, default: {}
      t.datetime :sent_at
      t.timestamps
    end

    add_index :whatsapp_messages, [:user_id, :created_at]
    add_index :whatsapp_messages, :provider_message_id, unique: true
    add_index :whatsapp_messages, [:status, :created_at],
              name: "idx_whatsapp_messages_daily_cap",
              where: "status = 'sent'"
    add_index :whatsapp_messages, :notification_alert_id
  end
end
```

### 6.4 `CreateWhatsAppTemplates`

```ruby
class CreateWhatsAppTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :whatsapp_templates do |t|
      t.string :provider_template_id, null: false
      t.string :name, null: false
      t.string :language, default: "pt_BR", null: false
      t.jsonb :components, default: [], null: false
      t.string :status, default: "approved", null: false
      # Status: pending | approved | rejected | paused
      t.datetime :last_synced_at
      t.timestamps
    end

    add_index :whatsapp_templates, :name, unique: true
  end
end
```

### 6.5 ERD (Text)

```
┌──────────┐       ┌──────────────────┐       ┌───────────────────┐
│   User   │1───∞→│ WhatsAppMessage   │       │ WhatsAppTemplate  │
├──────────┤       ├──────────────────┤       ├───────────────────┤
│ phone    │       │ user_id (FK)     │       │ name (unique)     │
│ phone_   │       │ notification_    │       │ provider_template │
│ verified │       │   alert_id (FK)  │       │   _id             │
│ wa_opt_  │       │ provider_message │       │ language          │
│  in_at   │       │   _id            │       │ components (jsonb)│
│ wa_notif │       │ template_name    │       │ status            │
│ ication_ │       │ status           │       │ last_synced_at    │
│ preferen │       │ error_message    │       │                   │
│ ces(jb)  │       │ category         │       │                   │
└──────────┘       │ metadata (jsonb) │       └───────────────────┘
                   │ sent_at          │
                   │ created_at       │
                   └──────────────────┘
                              │
                              │ ∞
                     ┌────────┴────────┐
                     │ Notification    │
                     │ Alert           │
                     └─────────────────┘
```

### 6.6 Existing User Model — No Breaking Changes

Existing `push_preferences` (JSONB) and `email_notification_preferences` (JSONB) remain untouched. The new `wa_notification_preferences` is additive.

`public_payload` will be updated to include phone/WA fields:

```ruby
def public_payload
  {
    # ...existing fields...
    phone: phone,
    phone_verified: phone_verified,
    wa_opt_in_at: wa_opt_in_at,
    wa_notification_preferences: wa_preferences_with_defaults
  }
end
```

---

## 7. API Design

### 7.1 Routes

```ruby
# config/routes.rb additions (inside api/v1 namespace)
patch "auth/phone", to: "auth#update_phone"           # Request verification code
post "auth/phone/verify", to: "auth#verify_phone"      # Confirm code
patch "auth/whatsapp_notifications", to: "auth#update_whatsapp_notifications"
```

### 7.2 `PATCH /api/v1/auth/phone`

**Request:**
```json
{
  "phone": "+5511999999999"
}
```

**Response (200):**
```json
{
  "message": "Código de verificação enviado.",
  "phone": "+5511999999999",
  "expires_in": 300
}
```

**Response (422):**
```json
{
  "error": "Telefone inválido."
}
```

**Logic:**
- Validates BR phone format (`/^\+55\d{10,11}$/`)
- Checks uniqueness (no other user with same phone)
- Generates 6-digit code + SHA256 digest (stored in `phone_verification_digest` + `phone_verification_sent_at`)
- Sends code via WhatsApp or SMS (provider-dependent)
- Rate limited: max 3 attempts/hour/IP

### 7.3 `POST /api/v1/auth/phone/verify`

**Request:**
```json
{
  "phone": "+5511999999999",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "Telefone verificado com sucesso.",
  "user": { "...existing user payload with phone fields..." }
}
```

**Logic:**
- Digest match + within 5 minutes
- Sets `phone_verified = true`
- Auto opt-in: sets `wa_opt_in_at = Time.current`
- Updates `wa_notification_preferences["wa_notifications_enabled"] = true`

### 7.4 `PATCH /api/v1/auth/whatsapp_notifications`

Follows existing `update_email_notifications` pattern:

**Request:**
```json
{
  "wa_notification_preferences": {
    "wa_notifications_enabled": true,
    "wa_due_reminders": true,
    "wa_weekly_summary": false,
    "wa_dnd_start": "23:00",
    "wa_dnd_end": "07:00"
  }
}
```

**Response (200):**
```json
{
  "message": "Preferências do WhatsApp atualizadas.",
  "wa_notification_preferences": {
    "wa_notifications_enabled": true,
    "wa_due_reminders": true,
    "wa_weekly_summary": false,
    "wa_dnd_start": "23:00",
    "wa_dnd_end": "07:00",
    "wa_daily_cap": 10
  }
}
```

**Controller method:**

```ruby
def update_whatsapp_notifications
  @current_user.update_wa_preferences!(params[:wa_notification_preferences])
  render json: {
    message: "Preferências do WhatsApp atualizadas.",
    wa_notification_preferences: @current_user.wa_preferences_with_defaults
  }, status: :ok
end
```

### 7.5 Updated `GET /api/v1/auth/me`

```json
{
  "user": {
    "id": 1,
    "name": "João",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "phone_verified": true,
    "wa_opt_in_at": "2026-07-12T14:00:00Z",
    "...existing fields..."
  },
  "email_preferences": { "...existing..." },
  "push_preferences": { "...existing..." },
  "wa_notification_preferences": { "...defaults..." }
}
```

---

## 8. Mobile Integration

### 8.1 Types (`src/types/settings.ts`)

```typescript
// Add to AppPreferences
export interface AppPreferences {
  // ...existing push fields...

  // WhatsApp fields
  wa_notifications_enabled: boolean;
  wa_due_reminders: boolean;
  wa_weekly_summary: boolean;
  wa_dnd_start: string;   // "22:00"
  wa_dnd_end: string;     // "08:00"
}
```

### 8.2 Types (`src/types/auth.ts`)

```typescript
export interface User {
  // ...existing fields...
  phone?: string | null;
  phone_verified?: boolean;
  wa_opt_in_at?: string | null;
  wa_notification_preferences?: {
    wa_notifications_enabled: boolean;
    wa_due_reminders: boolean;
    wa_weekly_summary: boolean;
    wa_dnd_start: string;
    wa_dnd_end: string;
    wa_daily_cap: number;
  };
}
```

### 8.3 Service (`src/services/whatsapp.ts`)

```typescript
import api from './api';

export interface WaPreferences {
  wa_notifications_enabled: boolean;
  wa_due_reminders: boolean;
  wa_weekly_summary: boolean;
  wa_dnd_start: string;
  wa_dnd_end: string;
}

export const updatePhone = async (phone: string): Promise<void> => {
  await api.patch('/auth/phone', { phone });
};

export const verifyPhone = async (phone: string, code: string): Promise<void> => {
  await api.post('/auth/phone/verify', { phone, code });
};

export const syncRemoteWaPreferences = async (prefs: WaPreferences): Promise<void> => {
  await api.patch('/auth/whatsapp_notifications', {
    wa_notification_preferences: prefs,
  });
};
```

### 8.4 UI Components

**`NotificationSettings.tsx` — Add WhatsApp section:**

- New `NotificationPreferenceKey` union includes WA keys
- Toggle `wa_notifications_enabled` (disabled unless `phone_verified`)
- Toggle `wa_due_reminders`, `wa_weekly_summary`
- Time pickers for `wa_dnd_start` / `wa_dnd_end` (optional, defaults hidden behind "Configurar Horário de Silêncio" expandable section)
- Phone input component (if phone not set/verified)

**Phone Input / Verification UI:**

```
┌─────────────────────────────┐
│  Número do WhatsApp          │
│  +55 (11) 99999-9999   [✓]  │  ← verified indicator
│  [Alterar Número]           │
│                              │
│  Seu telefone é usado apenas │
│  para enviar lembretes via   │
│  WhatsApp.                   │
└─────────────────────────────┘
```

**Unverified flow:**

```
┌─────────────────────────────┐
│  Número do WhatsApp          │
│  [___+55__)(__99999-9999__] │
│  [Enviar Código]            │
│                              │
│  Código de Verificação       │
│  [______]                    │
│  [Confirmar]                 │
└─────────────────────────────┘
```

---

## 9. ADRs (Architecture Decision Records)

### ADR-001: NotificationChannel Pattern vs Service Object

| | |
|---|---|
| **Status** | Aceito |
| **Contexto** | Precisamos de um contrato comum para canais de notificação. Service Objects (ex: `WhatsappService.send`) são ad-hoc; falta polimorfismo. |
| **Decisão** | Criar `ApplicationChannel` como base abstrata com interface `deliver`, `valid_recipient?`, `rate_limiter`, `channel_name`. Cada canal herda e implementa. |
| **Motivação** | Polimorfismo permite que `WhatsAppDispatchJob` trate qualquer canal uniformemente. Novo canal (SMS, Telegram) segue o mesmo padrão sem duplicar lógica de validação. |
| **Consequências** | + Testes podem mockar `ApplicationChannel`. + Canal existente (push/email) refatorado sem quebrar interface. - Refatoração inicial de 2 jobs. |

### ADR-002: Solid Queue for WhatsApp vs Separate Sidekiq/Redis

| | |
|---|---|
| **Status** | Aceito |
| **Contexto** | O app já usa Solid Queue (SQLite-based, embutido no Rails). WhatsApp precisa de fila separada para rate limiting. Sidekiq/Redis traria dependência externa. |
| **Decisão** | Usar fila `whatsapp` dedicada no Solid Queue, com workers configurados com `threads: 3, processes: 1` e polling mais lento (2s). |
| **Motivação** | Zero infraestrutura adicional. Solid Queue suporta múltiplas filas nativamente. Dead letter é tratada via `discard_on` em vez de fila separada. |
| **Consequências** | + Sem Redis/Sidekiq dependency. + Fila isolada não compete com push/email. - Polling-based (não push como Sidekiq), mas aceitável para ~500 msg/dia. |

### ADR-003: Token Bucket vs Sliding Window for Rate Limiting

| | |
|---|---|
| **Status** | Aceito |
| **Contexto** | WhatsApp API tem burst limit (10 msg/s) e per-phone limit (1 msg/5s). Precisamos controlar ambos no cliente para evitar 429s. |
| **Decisão** | Token Bucket global (`WhatsAppRateLimiter`, Singleton, in-memory) + `PhoneRateLimiter` (Hash + TTL). Token Bucket permite bursts controlados, Sliding Window é mais complexo para burst. |
| **Motivação** | Token Bucket é simples de implementar, permite burst de 10 mensagens seguidas (bom para weekly_summary que envia em lote), e refill suave evita starvation. |
| **Consequências** | + Burst natural sem falsos positivos. + Estado in-memory (sem Redis). - Perde estado em restart do worker (mas refill rápido recupera). |

### ADR-004: Provider-Agnostic Abstraction vs Direct SDK Coupling

| | |
|---|---|
| **Status** | Aceito |
| **Contexto** | PRD recomenda começar com Z-API e planejar migração para Meta Cloud API. Precisamos evitar provider lock-in. |
| **Decisão** | Abstrair comunicação com provider via `WhatsAppProvider.client` que retorna um adapter. Provider definido por ENV `WHATSAPP_PROVIDER` (= zapi / twilio / meta). |
| **Motivação** | Trocar de provider requer apenas implementar novo adapter + mudar ENV. Canais (`WhatsAppChannel`) não conhecem o provider diretamente. |
| **Consequências** | + Provider lock-in evitado. + Testes podem usar adapter mock. - Código extra de adapter (mínimo). |

```ruby
# app/providers/whatsapp_provider.rb
module WhatsAppProvider
  class << self
    def client
      case ENV["WHATSAPP_PROVIDER"]
      when "zapi"   then ZapiAdapter.new
      when "twilio" then TwilioAdapter.new
      when "meta"   then MetaCloudAdapter.new
      else raise "Unknown WHATSAPP_PROVIDER: #{ENV['WHATSAPP_PROVIDER']}"
      end
    end
  end

  # Expected adapter interface:
  #   #send_template(to:, template_name:, language:, components:)
  #   #send_verification_code(phone:)       -> { success:, code_id: }
  #   #verify_code(phone:, code:)           -> { success: }
  #   #account_quality                      -> Integer
  #   #health_check                         -> Boolean
end
```

---

## 10. Migration Plan

### 10.1 Order of Migrations

| Step | Migration | Backward Compat? | Risk |
|------|-----------|------------------|------|
| 1 | `AddWhatsAppFieldsToUsers` | Yes — nullable columns, default JSONB | Low |
| 2 | `CreateWhatsAppMessages` | Yes — new table | Low |
| 3 | `CreateWhatsAppTemplates` | Yes — new table | Low |
| 4 | Add jobs/channels code | Yes — behind feature flag | Medium |

### 10.2 Deployment Sequence

```
Phase 1 (Subfase 3a):
  ── Migrations: NONE (no schema changes)
  ── New files: app/channels/* (base + refactored + stub)
  ── Refactored: PushDispatchJob, EmailDispatchJob → use channels
  ── Feature flag: none (refactor only, same behavior)

Phase 2 (Subfase 3b):
  ── Migrations 1, 2
  ── New files: WhatsAppChannel, WhatsAppRateLimiter, PhoneRateLimiter
  ── New endpoints: auth/phone, auth/phone/verify, auth/whatsapp_notifications
  ── Feature flag: WHATSAPP_PROVIDER (unset = no WA dispatch)

Phase 3 (Subfase 3c):
  ── Migration 3 (whatsapp_templates)
  ── New files: WhatsAppDispatchJob, WhatsAppQualityMonitorJob, providers/
  ── Modified: NotificationAlertsService → add WA dispatch
  ── Feature flag: WHATSAPP_PROVIDER=zapi|twilio|meta (set = enabled)
```

### 10.3 Feature Flags

```yaml
# .env.example additions
WHATSAPP_PROVIDER=                  # (empty = disabled, zapi/twilio/meta = enabled)
WHATSAPP_API_KEY=                   # API key for provider
WHATSAPP_DAILY_CAP=500
WHATSAPP_BURST_SIZE=10
WHATSAPP_REFILL_RATE=1
```

No WA job dispatches unless `WHATSAPP_PROVIDER` is set:

```ruby
# In NotificationAlertsService#create_alert_once!
WhatsAppDispatchJob.perform_later(alert.id) if ENV["WHATSAPP_PROVIDER"].present?
```

### 10.4 Backward Compatibility Guarantees

- Existing `PushDispatchJob` and `EmailDispatchJob` continue to work unchanged during refactor (they'll be internally refactored to call channels, but same behavior).
- `NotificationAlertsService` behavior unchanged — WA is an ADDITIVE dispatch.
- `User` model `public_payload` additive — existing mobile clients ignore new fields.
- `me` endpoint returns new fields but existing clients don't break (they ignore unknown keys).
- All existing tests must pass after each phase.

### 10.5 Rollback

```
1. Unset WHATSAPP_PROVIDER → no WA dispatches
2. Revert migrations (down):
   - Drop whatsapp_templates
   - Drop whatsapp_messages
   - Remove columns from users
3. Push/email unaffected — no code rollback needed for core channels
```

---

## Appendix: File Manifest

```
NEW FILES (created during FASE 3):
─────────────────────────────────
app/channels/
  application_channel.rb
  email_channel.rb
  push_channel.rb
  whatsapp_channel.rb

app/providers/
  whatsapp_provider.rb
  zapi_adapter.rb
  (twilio_adapter.rb | meta_cloud_adapter.rb)  # depending on choice

app/services/
  whatsapp_rate_limiter.rb
  phone_rate_limiter.rb
  whatsapp_verification_service.rb

app/jobs/
  whatsapp_dispatch_job.rb
  whatsapp_daily_metrics_job.rb
  whatsapp_quality_monitor_job.rb

app/models/
  whatsapp_message.rb
  whatsapp_template.rb

db/migrate/
  *_add_whatsapp_fields_to_users.rb
  *_create_whatsapp_messages.rb
  *_create_whatsapp_templates.rb

app/controllers/api/v1/
  (existing auth_controller.rb — add methods)

config/
  solid_queue.yml (whatsapp queue section)
  recurring.yml (new schedules)

mobile/src/
  services/whatsapp.ts
  types/settings.ts (extend AppPreferences)
  types/auth.ts (extend User)
  screens/app/NotificationSettings.tsx (extend)

MODIFIED FILES:
───────────────
app/services/notification_alerts_service.rb   (+ WA dispatch)
app/jobs/push_dispatch_job.rb                 (→ use PushChannel)
app/jobs/email_dispatch_job.rb                (→ use EmailChannel)
app/models/user.rb                            (+ WA fields, methods)
app/controllers/api/v1/auth_controller.rb     (+ phone/WA endpoints)
config/routes.rb                              (+ WA routes)
.env.example                                  (+ WA env vars)
```

---

*— Aria, arquitetando o futuro 🏛️*
