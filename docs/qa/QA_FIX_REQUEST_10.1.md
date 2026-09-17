# QA Fix Request — Story 10.1: Open Finance Foundation

**Story:** 10.1.open-finance-foundation
**Branch:** feature/10.1-open-finance-foundation
**QA Agent:** Quinn (qa)
**Date:** 2026-09-17
**Verdict:** CONCERNS

---

## Issues to Fix (Ordered by Priority)

### 🔴 CRITICAL — Must Fix Before Merge

#### 1. Secrets Exposure in Logs
**File:** `app/services/financial/providers/pluggy_adapter.rb`
**Lines:** 91-94 (`fetch_auth_token`)

**Problem:** O método faz `POST /auth` com `clientId` e `clientSecret` no body. Se o Rails/Faraday logar requests (config `log_level: :debug` ou middleware de log), as credenciais vazam em plaintext.

**Fix:**
```ruby
# Adicionar em config/initializers/filter_parameter_logging.rb (se não existir)
Rails.application.config.filter_parameters += [:client_secret, :clientSecret, :password, :password_confirmation]

# No adapter, garantir que não loga o body:
def fetch_auth_token
  response = @conn.post('/auth') do |req|
    req.body = { clientId: @client_id, clientSecret: @client_secret }.to_json
    req.headers['Content-Type'] = 'application/json'
  end
  response.body['apiKey']
end
```

**Verification:** Rodar em staging com `LOG_LEVEL=debug` e confirmar que `client_secret` aparece como `[FILTERED]` nos logs.

---

### 🟠 HIGH — Must Fix Before Merge

#### 2. Missing Error Handling on HTTP Calls
**File:** `app/services/financial/providers/pluggy_adapter.rb`
**Methods:** `create_connection`, `accounts`, `transactions`, `institutions`, `refresh_connection`, `disconnect_connection`, `ping`

**Problem:** Todas as chamadas HTTP assumem sucesso (2xx). Qualquer erro 4xx/5xx (rate limit, auth expired, network error) lança `Faraday::Error` não tratado → 500 para o usuário.

**Fix:** Criar exception customizada e wrap todas as chamadas:

```ruby
# app/services/financial/providers/pluggy_adapter.rb
module FinancialProviders
  class Pluggy < Base
    class PluggyApiError < StandardError
      attr_reader :status, :body
      def initialize(message, status: nil, body: nil)
        super(message)
        @status = status
        @body = body
      end
    end

    class PluggyAuthError < PluggyApiError; end
    class PluggyRateLimitError < PluggyApiError; end
    class PluggyNotFoundError < PluggyApiError; end

    private

    def handle_response(response)
      case response.status
      when 200..299 then response.body
      when 401 then raise PluggyAuthError, 'Invalid credentials', status: 401, body: response.body
      when 404 then raise PluggyNotFoundError, 'Resource not found', status: 404, body: response.body
      when 429 then raise PluggyRateLimitError, 'Rate limited', status: 429, body: response.body
      else raise PluggyApiError, "HTTP #{response.status}: #{response.body}", status: response.status, body: response.body
      end
    end

    def get(path, params = {})
      handle_response(@conn.get(path, params, auth_header))
    end

    def post(path, body = {})
      handle_response(@conn.post(path, body, auth_header))
    end

    def delete(path)
      handle_response(@conn.delete(path, nil, auth_header))
    end
  end
end
```

**Verification:** Testes unitários mockando respostas 401, 404, 429, 500 e verificando exceções corretas.

---

#### 3. Thread-Unsafe Provider Registry
**File:** `app/services/financial/providers/factory.rb`
**Lines:** 12, 23-25 (`PROVIDERS` constant + `register` method)

**Problem:** `PROVIDERS` é uma Hash constante mutável. Em Puma multi-thread (produção), `register` pode causar race condition.

**Fix:** Usar `Concurrent::Hash` ou `Mutex`:

```ruby
# app/services/financial/providers/factory.rb
require 'concurrent/hash'

module FinancialProviders
  class Factory
    PROVIDERS = Concurrent::Hash.new({
      'pluggy' => FinancialProviders::Pluggy,
      'manual' => FinancialProviders::Manual
    }.freeze)

    def self.register(name, klass)
      PROVIDERS[name.to_s] = klass
    end
  end
end
```

Ou mais simples (registry imutável, sem `register` em runtime):
```ruby
PROVIDERS = {
  'pluggy' => FinancialProviders::Pluggy,
  'manual' => FinancialProviders::Manual
}.freeze

def self.register(name, klass)
  raise 'Registry is frozen - use initializer to add providers' unless Rails.env.test?
  # Only allow in test env
  self.const_get(:PROVIDERS).tap { |h| h[name.to_s] = klass }
end
```

**Verification:** Teste de concorrência (opcional) ou code review.

---

#### 4. Token Caching Without Expiration
**File:** `app/services/financial/providers/pluggy_adapter.rb`
**Lines:** 86-94 (`auth_header`, `fetch_auth_token`)

**Problem:** `@auth_token` cached indefinidamente. Pluggy tokens expiram (geralmente 2h). Após expiração, todas as chamadas falham com 401 até restart do processo.

**Fix:** Armazenar expiração e renovar automaticamente:

```ruby
def initialize(config = {})
  # ...
  @auth_token = nil
  @auth_token_expires_at = nil
end

def auth_header
  refresh_token_if_needed
  { 'Authorization' => "Bearer #{@auth_token}" }
end

def refresh_token_if_needed
  return if @auth_token && @auth_token_expires_at && Time.current < @auth_token_expires_at
  fetch_auth_token
end

def fetch_auth_token
  response = @conn.post('/auth', { clientId: @client_id, clientSecret: @client_secret })
  data = response.body
  @auth_token = data['apiKey']
  # Pluggy retorna expiresIn em segundos (assumindo)
  expires_in = data['expiresIn'] || 7200 # default 2h
  @auth_token_expires_at = Time.current + expires_in - 60 # renovar 1min antes
  @auth_token
end
```

**Verification:** Mock response com `expiresIn: 1`, avançar tempo, verificar renovação.

---

### 🟡 MEDIUM — Should Fix (Follow-up)

#### 5. Missing Tests for Configuration Models
**Files:** `app/models/plan.rb`, `plan_limit.rb`, `feature_flag.rb`, `setting.rb`, `financial_account.rb`

**Action:** Criar testes em `test/models/` cobrindo:
- Validações
- Scopes
- Class methods (`free`, `limit_for`, `enabled?`, `seed_initial!`, helpers)

#### 6. PlanLimit Hardcoded Class Methods
**File:** `app/models/plan_limit.rb`
**Lines:** 25-45

**Problem:** Métodos `connections_max_total`, `connections_max_per_user`, etc. duplicam lógica genérica.

**Fix:** Remover métodos hardcoded, usar `Plan.limit_for(key)` ou `PlanLimit.for_key(key).first&.value`.

#### 7. ManualAdapter Error Handling
**File:** `app/services/financial/providers/manual_adapter.rb`
**Line:** 11

**Problem:** `OfxParser`/`CsvParser` podem lançar exceções (arquivo corrompido, formato inválido) não tratadas.

**Fix:** Wrap em `begin/rescue` e retornar array vazio + log error.

#### 8. FeatureFlag Seed Not Automatic
**File:** `app/models/feature_flag.rb`
**Line:** 45 (`seed_initial!`)

**Fix:** Chamar em `db/seeds.rb` ou criar initializer.

---

### 🟢 LOW — Nice to Have

#### 9. Structured Logging
Adicionar `request_id` correlation em todos os logs do adapter.

#### 10. Retry Logic
Adicionar gem `faraday-retry` com exponential backoff para chamadas idempotentes (GET).

---

## Acceptance Criteria for Re-Review

| Issue | Verification |
|-------|--------------|
| 1. Secrets filtered | Logs não mostram `client_secret` em debug |
| 2. Error handling | Testes mockando 401/404/429/500 passam |
| 3. Thread-safe factory | `Concurrent::Hash` ou registry imutável |
| 4. Token refresh | Token renovado automaticamente antes de expirar |

---

## How to Submit Fix

1. @dev implementa fixes acima
2. @dev roda testes localmente (quando DB disponível)
3. @dev notifica @qa para re-review
4. @qa re-avalia → PASS → status `Done` → @devops push

---

**Quinn, guardião da qualidade 🛡️**