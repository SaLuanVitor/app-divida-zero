# 📋 Sprint Plan — FASE 5 a 8

> **Projeto:** App Dívida Zero
> **Data:** 2026-08-20
> **Owner:** SaLuanVitor
> **Orquestração:** @master (Buffy)
> **Duração Total Estimada:** 8-10 semanas

---

## 🗺️ Visão Geral das Fases

```
FASE 5 (Semanas 1-3)  ──→  FASE 6 (Semanas 4-5)  ──→  FASE 7 (Semanas 6-8)  ──→  FASE 8 (Semana 9-10)
     Segurança + UX Core          Design Polish           Features Avançadas        Launch Prep
```

---

# 🔷 FASE 5 — Segurança + UX Core

> **Duração:** 3 semanas (15 dias úteis)
> **Objetivo:** Blindar o app e entregar feedback visual de qualidade
> **Dependências:** Nenhuma (pode iniciar imediatamente)

---

## Story 5.1 — Rate Limiting Global
**Prioridade:** 🔴 CRÍTICO | **Esforço:** M (2 dias)

### Descrição
Implementar rate limiting em todos os endpoints de autenticação para prevenir ataques de força bruta.

### Acceptance Criteria
- [x] Rack::Attack configurado no backend
- [x] Login: 5 tentativas/minuto por IP
- [x] Register: 3 registros/hora por IP
- [x] Forgot Password: 3 requisições/hora por IP
- [x] Resposta 429 com header `Retry-After`
- [x] Logs de rate limit para monitoramento
- [x] Testes unitários para cada limite

### Implementação
```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  # Login
  throttle("auth/login", limit: 5, period: 60) do |req|
    req.path == "/api/v1/auth/login" && req.post? ? req.ip : nil
  end

  # Register
  throttle("auth/register", limit: 3, period: 3600) do |req|
    req.path == "/api/v1/auth/register" && req.post? ? req.ip : nil
  end

  # Forgot Password
  throttle("auth/forgot", limit: 3, period: 3600) do |req|
    req.path == "/api/v1/auth/forgot_password" && req.post? ? req.ip : nil
  end

  # Custom response
  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"]
    now = Time.current

    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => (match_data[:period] - (now.to_i % match_data[:period])).to_s
    }

    body = { error: "Muitas requisições. Tente novamente em alguns minutos." }

    [429, headers, [body.to_json]]
  end
end
```

### Validação
- [x] Testar com curl: 6 logins em 1 min → 429 na 6ª tentativa
- [x] Verificar header Retry-After
- [x] Testar que endpoints normais não são afetados
- [x] Logs aparecem no stdout

---

## Story 5.2 — Account Lockout
**Prioridade:** 🔴 CRÍTICO | **Esforço:** M (2 dias)

### Descrição
Implementar bloqueio temporário de conta após múltiplas falhas de login.

### Acceptance Criteria
- [x] Migration: `failed_login_count` (integer, default 0)
- [x] Migration: `locked_until` (datetime, nullable)
- [x] Após 5 falhas: lockout 15 minutos
- [x] Login bem-sucedido: reset contadores
- [x] Mensagem clara quando conta está bloqueada
- [x] Admin pode desbloquear manualmente
- [x] Testes de lockout e unlock

### Implementação
```ruby
# app/models/user.rb (adicionar)
def lock_account!
  update!(
    failed_login_count: 0,
    locked_until: 15.minutes.from_now
  )
end

def locked?
  locked_until.present? && locked_until > Time.current
end

def increment_failed_login!
  new_count = failed_login_count + 1
  if new_count >= 5
    lock_account!
  else
    update!(failed_login_count: new_count)
  end
end

def reset_failed_login!
  update!(failed_login_count: 0, locked_until: nil) if failed_login_count > 0
end
```

### Validação
- [x] 5 logins falhos → conta bloqueada por 15 min
- [x] Login correto após bloqueio → contadores resetados
- [x] Mensagem "Conta bloqueada. Tente novamente em X minutos."
- [x] Admin pode desbloquear via endpoint

---

## Story 5.3 — Session Management (Logout + Blacklist)
**Prioridade:** 🔴 CRÍTICO | **Esforço:** G (3 dias)

### Descrição
Implementar logout seguro com revogação de tokens via blacklist em Redis.

### Acceptance Criteria
- [x] Endpoint `POST /auth/logout` adiciona token à blacklist
- [x] Blacklist configurada com TTL = 7 dias (banco de dados, alinhado com Solid Cache)
- [x] Refresh token invalidado no logout
- [x] Mobile: logout limpa tokens locais
- [x] Token revogado retorna 401
- [x] Testes de blacklist e expiração

### Implementação
```ruby
# app/services/token_blacklist.rb
class TokenBlacklist
  REDIS_PREFIX = "jwt_blacklist:"
  DEFAULT_TTL = 7.days

  def self.add!(token, ttl: DEFAULT_TTL)
    Redis.current.setex("#{REDIS_PREFIX}#{digest(token)}", ttl.to_i, "1")
  end

  def self.revoked?(token)
    Redis.current.exists?("#{REDIS_PREFIX}#{digest(token)}")
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end
end

# app/controllers/api/v1/auth_controller.rb
def logout
  token = request.headers["Authorization"].to_s.split(" ").last
  TokenBlacklist.add!(token)
  render json: { message: "Logout realizado com sucesso." }, status: :ok
end
```

### Validação
- [x] Login → Logout → Usar token antigo → 401
- [x] Refresh token também invalidado
- [x] Mobile: tela de login aparece após logout
- [x] Blacklist expira após 7 dias

---

## Story 5.4 — Audit Log
**Prioridade:** 🟡 ALTA | **Esforço:** G (3 dias)

### Descrição
Registrar ações sensíveis para rastreabilidade e compliance.

### Acceptance Criteria
- [x] Model `AuditLog`: user_id, action, resource_type, resource_id, ip, user_agent, metadata
- [x] Migration criada
- [x] Ações logadas: login, logout, password_change, record_create, record_pay, record_delete
- [x] Retenção: 90 dias (job de limpeza)
- [x] Endpoint admin para consultar logs (opcional) - não implementado (opcional)
- [x] Testes de criação de log

### Implementação
```ruby
# app/models/audit_log.rb
class AuditLog < ApplicationRecord
  belongs_to :user, optional: true

  validates :action, presence: true

  scope :recent, -> { order(created_at: :desc).limit(100) }
  scope :for_user, ->(user) { where(user: user) }
  scope :by_action, ->(action) { where(action: action) }
end

# app/controllers/concerns/auditable.rb
module Auditable
  extend ActiveSupport::Concern

  private

  def audit_log!(action, resource: nil, metadata: {})
    AuditLog.create!(
      user: @current_user,
      action: action,
      resource_type: resource&.class&.name,
      resource_id: resource&.id,
      ip: request.remote_ip,
      user_agent: request.user_agent,
      metadata: metadata
    )
  rescue StandardError => e
    Rails.logger.error("AuditLog falhou: #{e.message}")
  end
end
```

### Validação
- [x] Login gera log com action "login"
- [x] Delete de record gera log com resource_type
- [x] Admin action gera log (password_change)
- [x] Job de limpeza remove logs > 90 dias

---

## Story 5.5 — Haptic Feedback
**Prioridade:** 🟡 ALTA | **Esforço:** S (1 dia)

### Descrição
Adicionar feedback tátil em ações importantes do app.

### Acceptance Criteria
- [ ] expo-haptics instalado
- [ ] Pagamento/recebimento: impacto médio
- [ ] Deletar registro: impacto pesado
- [ ] Nível up: notificação de sucesso
- [ ] Erro: notificação de erro
- [ ] Pull-to-refresh: impacto leve
- [ ] Toggle no settings para desativar

### Implementação
```typescript
// src/utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const hapticPay = () => 
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const hapticDelete = () => 
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

export const hapticSuccess = () => 
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const hapticError = () => 
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const hapticLight = () => 
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

### Validação
- [ ] Testar em dispositivo físico (não emulator)
- [ ] Cada ação gera o haptic correto
- [ ] Settings: toggle desativa haptics

---

## Story 5.6 — Success Animations
**Prioridade:** 🟡 ALTA | **Esforço:** M (2 dias)

### Descrição
Adicionar animações de sucesso para feedback visual satisfatório.

### Acceptance Criteria
- [ ] lottie-react-native instalado
- [ ] Animação de checkmark para pagamentos
- [ ] Animação de confetti para nível up
- [ ] Animação de engrenagem para processamento
- [ ] Animações duram 1.5-2 segundos
- [ ] Redução de movimento respeitada

### Assets Necessários
- `success-check.json` (Lottie)
- `confetti.json` (Lottie)
- `loading-gear.json` (Lottie)

### Validação
- [ ] Animações aparecem nos momentos corretos
- [ ] Não bloqueiam interação do usuário
- [ ] Respect motion settings do dispositivo

---

## Story 5.7 — Gráficos nos Relatórios
**Prioridade:** 🟡 ALTA | **Esforço:** G (3 dias)

### Descrição
Adicionar visualizações gráficas na tela de relatórios.

### Acceptance Criteria
- [ ] react-native-chart-kit ou victory-native instalado
- [ ] Gráfico de barras: entradas vs saídas (mensal)
- [ ] Gráfico de pizza: por categoria
- [ ] Gráfico de linha: evolução do saldo
- [ ] Filtro por período
- [ ] Dark mode suportado
- [ ] Loading state enquanto carrega

### Implementação
```typescript
// src/screens/app/Relatorios.tsx (adicionar)
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';

// Gráfico de barras mensal
const MonthlyBarChart = ({ data }) => (
  <BarChart
    data={{
      labels: ['Jan', 'Fev', 'Mar', ...],
      datasets: [
        { data: data.income, color: '#22c55e' },
        { data: data.expense, color: '#ef4444' },
      ],
    }}
    width={Dimensions.get('window').width - 32}
    height={220}
    chartConfig={{
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(244, 140, 37, ${opacity})`,
    }}
  />
);
```

### Validação
- [ ] Gráficos renderizam com dados reais
- [ ] Filtro por mês/atualiza dados
- [ ] Dark mode: cores ajustadas
- [ ] Performance: < 500ms para render

---

## Quality Gate FASE 5

### Checklist de Validação
- [ ] **Typecheck:** `tsc --noEmit` sem erros
- [ ] **Testes backend:** `bin/rails test` passando
- [ ] **Testes mobile:** `npm test` (68+ testes)
- [ ] **Lint:** sem warnings críticos
- [ ] **Security audit:** rate limiting funcionando
- [ ] **Manual QA:** fluxo login → ação → logout testado
- [ ] **Performance:** telas carregam < 2s

### Entregáveis
- [ ] Código commitado na branch `feat/fase-5-seguranca`
- [ ] PR criado e revisado
- [ ] Deploy em staging para teste
- [ ] Documentação de endpoints atualizada

---

# 🔷 FASE 6 — Design Polish

> **Duração:** 2 semanas (10 dias úteis)
> **Objetivo:** Elevar a qualidade visual e primeira impressão
> **Dependências:** FASE 5 concluída (haptics e animations prontos)

---

## Story 6.1 — Empty States com Ilustrações
**Prioridade:** 🟡 ALTA | **Esforço:** M (2 dias)

### Descrição
Criar estados vazios informativos e convidativos em todas as telas.

### Acceptance Criteria
- [ ] Home vazia: ilustração + "Comece registrando seu primeiro lançamento"
- [ ] Metas vazia: ilustração de alvo + "Crie sua primeira meta"
- [ ] Notificações vazia: sino + "Tudo tranquilo por aqui"
- [ ] Convites vazia: envelope + "Nenhum convite pendente"
- [ ] Família vazia: família + "Crie sua família"
- [ ] CTA (botão) em cada empty state
- [ ] Ilustrações em SVG ou PNG (assets/images/)

### Placeholders para Assets
```
assets/images/empty-calendar.png     → https://placehold.co/400x300/f8f7f5/f48c25?text=📅+Sem+lançamentos
assets/images/empty-goals.png        → https://placehold.co/400x300/f8f7f5/3b82f6?text=🎯+Crie+sua+primeira+meta
assets/images/empty-notifications.png → https://placehold.co/400x300/f8f7f5/22c55e?text=🔔+Tudo+tranquilo
assets/images/empty-invites.png      → https://placehold.co/400x300/f8f7f5/8b5cf6?text=✉️+Sem+convites
assets/images/empty-family.png       → https://placehold.co/400x300/f8f7f5/f48c25?text=👨‍👩‍👧+Crie+sua+família
```

### Validação
- [ ] Cada tela vazia mostra ilustração + texto + CTA
- [ ] Ilustrações carregam rapidamente
- [ ] Dark mode: ilustrações visíveis
- [ ] Acessibilidade: alt text nas imagens

---

## Story 6.2 — Onboarding Visual
**Prioridade:** 🟡 ALTA | **Esforço:** M (2 dias)

### Descrição
Criar slides visuais para o primeiro acesso ao app.

### Acceptance Criteria
- [ ] 4 slides com screenshots/mockups
- [ ] Navegação por swipe + dots indicadores
- [ ] Botão "Pular" e "Próximo"
- [ ] Último slide: "Começar" → Home
- [ ] Armazenar flag `onboarding_seen`
- [ ] Não mostrar novamente

### Placeholders para Slides
```
assets/onboarding/slide1.png → https://placehold.co/400x800/1a1a1a/f48c25?text=💰+Organize+suas+finanças
assets/onboarding/slide2.png → https://placehold.co/400x800/1a1a1a/22c55e?text=📈+Acompanhe+progresso
assets/onboarding/slide3.png → https://placehold.co/400x800/1a1a1a/3b82f6?text=👨‍👩‍👧+Família+integrada
assets/onboarding/slide4.png → https://placehold.co/400x800/1a1a1a/8b5cf6?text=🏦+Importe+extratos
```

### Validação
- [ ] Primeira instalação mostra onboarding
- [ ] Swipe funciona suavemente
- [ ] Flag persiste (não mostra após completar)
- [ ] Acessibilidade: labels nos botões

---

## Story 6.3 — Cards com Profundidade
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (2 dias)

### Descrição
Melhorar cards com sombras, gradientes e bordas coloridas.

### Acceptance Criteria
- [ ] Card de saldo: gradiente sutil laranja
- [ ] Cards de registros: borda colorida por tipo
  - Dívida: borda vermelha
  - Ganho: borda verde
  - Despesa: borda amarela
- [ ] Sombras sutis em cards principais
- [ ] Ícone com fundo circular colorido
- [ ] Dark mode: sombras ajustadas

### Componente Atualizado
```typescript
// src/components/Card.tsx
interface CardProps {
  variant?: 'default' | 'income' | 'expense' | 'debt';
  gradient?: boolean;
}

// Cores por variante
const variantStyles = {
  default: 'border-slate-200 dark:border-slate-800',
  income: 'border-l-4 border-l-green-500',
  expense: 'border-l-4 border-l-yellow-500',
  debt: 'border-l-4 border-l-red-500',
};
```

### Validação
- [ ] Cards renderizam com variantes corretas
- [ ] Gradiente visível no card de saldo
- [ ] Dark mode: contraste adequado
- [ ] Performance: sem lag no scroll

---

## Story 6.4 — Notificações com Avatares
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (1 dia)

### Descrição
Melhorar visual da lista de notificações.

### Acceptance Criteria
- [ ] Ícone colorido por tipo:
  - Lembrete: 🔴 vermelho
  - Meta: 🔵 azul
  - Conquista: 🟡 dourado
  - Sistema: ⚪ cinza
- [ ] Timestamp relativo ("há 2 horas", "ontem")
- [ ] Badge de não lido (ponto laranja)
- [ ] Swipe para deletar (opcional)

### Placeholders
```
assets/notifications/icon-reminder.png → https://placehold.co/48x48/ef4444/ffffff?text=🔔
assets/notifications/icon-goal.png     → https://placehold.co/48x48/3b82f6/ffffff?text=🎯
assets/notifications/icon-achievement.png → https://placehold.co/48x48/f48c25/ffffff?text=🏆
assets/notifications/icon-system.png   → https://placehold.co/48x48/64748b/ffffff?text=⚙️
```

### Validação
- [ ] Ícones aparecem por tipo
- [ ] Timestamps relativos funcionam
- [ ] Badge aparece para não lidas

---

## Story 6.5 — Modal de Confirmação Visual
**Prioridade:** 🟡 MÉDIA | **Esforço:** S (0.5 dia)

### Descrição
Melhorar modais de confirmação com ícones e animações.

### Acceptance Criteria
- [ ] Ícone de alerta (⚠️) ou perigo (🗑️)
- [ ] Animação de entrada (scale up)
- [ ] Botão de perigo em vermelho mais forte
- [ ] Texto de consequência claro
- [ ] Haptic feedback ao confirmar

### Placeholders
```
assets/modals/icon-warning.png → https://placehold.co/64x64/f59e0b/ffffff?text=⚠️
assets/modals/icon-danger.png  → https://placehold.co/64x64/ef4444/ffffff?text=🗑️
```

### Validação
- [ ] Modal aparece com animação
- [ ] Ícone correto por tipo de ação
- [ ] Haptic ao confirmar

---

## Story 6.6 — Dark Mode Polish
**Prioridade:** 🟡 MÉDIA | **Esforço:** S (0.5 dia)

### Descrição
Ajustar contraste e cores no dark mode.

### Acceptance Criteria
- [ ] Cards: `#1a1a1a` (mais contraste que `#121212`)
- [ ] Texto secundário: `#94a3b8`
- [ ] Bordas: `#2d2d2d`
- [ ] Background: `#0a0a0a`
- [ ] Contraste WCAG AA (4.5:1)

### Validação
- [ ] Todas as telas testadas em dark mode
- [ ] Contraste adequado em textos
- [ ] Sem textos ilegíveis

---

## Quality Gate FASE 6

### Checklist de Validação
- [ ] **Visual QA:** todas as telas revisadas
- [ ] **Dark mode:** contraste validado
- [ ] **Acessibilidade:** alt texts, labels
- [ ] **Performance:** animações a 60fps
- [ ] **Assets:** todas as imagens otimizadas
- [ ] **Cross-platform:** iOS e Android testados

---

# 🔷 FASE 7 — Features Avançadas

> **Duração:** 3 semanas (15 dias úteis)
> **Objetivo:** Entregar features diferenciadoras
> **Dependências:** FASE 6 concluída

---

## Story 7.1 — Biometric Auth
**Prioridade:** 🟡 ALTA | **Esforço:** M (2 dias)

### Descrição
Permitir login com biometria (digital/face).

### Acceptance Criteria
- [ ] expo-local-authentication instalado
- [ ] Tela de login: botão "Usar biometria"
- [ ] Verificar se dispositivo suporta
- [ ] Salvar flag `biometric_enabled` nas prefs
- [ ] Fallback para senha se biometria falhar
- [ ] Settings: toggle para ativar/desativar
- [ ] LGPD: biometria NUNCA sai do dispositivo

### Implementação
```typescript
// src/services/biometric.ts
import * as LocalAuthentication from 'expo-local-authentication';

export const isBiometricAvailable = async (): Promise<boolean> => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
};

export const authenticateWithBiometric = async (): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Use sua biometria para entrar',
    cancelLabel: 'Usar senha',
    disableDeviceFallback: false,
  });
  return result.success;
};
```

### Validação
- [ ] Dispositivo com biometria: botão aparece
- [ ] Dispositivo sem biometria: botão não aparece
- [ ] Autenticação funciona
- [ ] Fallback para senha funciona
- [ ] Settings: toggle funciona

---

## Story 7.2 — Swipe Actions nos Cards
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (2 dias)

### Descrição
Adicionar ações por swipe nos cards de lançamentos.

### Acceptance Criteria
- [ ] Swipe esquerdo: botão "Pagar" (verde)
- [ ] Swipe direito: botão "Excluir" (vermelho)
- [ ] Haptic feedback ao atingir threshold
- [ ] Animação suave de reveal
- [ ] Tap fora fecha as opções
- [ ] Funciona em listas com scroll

### Placeholders
```
assets/swipe/swipe-pay.png    → https://placehold.co/80x80/22c55e/ffffff?text=✅
assets/swipe/swipe-delete.png → https://placehold.co/80x80/ef4444/ffffff?text=🗑️
```

### Validação
- [ ] Swipe funciona suavemente
- [ ] Haptic ao atingir botão
- [ ] Ação executa corretamente
- [ ] Não conflita com scroll

---

## Story 7.3 — Quick Actions FAB
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (2 dias)

### Descrição
Menu flutuante com ações rápidas.

### Acceptance Criteria
- [ ] FAB no canto inferior direito
- [ ] Tap: expande para 4 opções
- [ ] Opções: Dívida, Ganho, Importar, Meta
- [ ] Animação de expand/collapse
- [ ] Haptic ao abrir/fechar
- [ ] Overlay escurece fundo

### Placeholders
```
assets/fab/fab-main.png      → https://placehold.co/56x56/f48c25/ffffff?text=+
assets/fab/fab-debt.png      → https://placehold.co/48x48/ef4444/ffffff?text=💸
assets/fab/fab-income.png    → https://placehold.co/48x48/22c55e/ffffff?text=💰
assets/fab/fab-import.png    → https://placehold.co/48x48/3b82f6/ffffff?text=🏦
assets/fab/fab-goal.png      → https://placehold.co/48x48/8b5cf6/ffffff?text=🎯
```

### Validação
- [ ] FAB aparece em todas as telas principais
- [ ] Animação suave
- [ ] Cada opção navega corretamente
- [ ] Haptic funciona

---

## Story 7.4 — Offline Support
**Prioridade:** 🟡 MÉDIA | **Esforço:** G (3 dias)

### Descrição
Detectar connectivity e enfileirar ações offline.

### Acceptance Criteria
- [ ] Detectar status de rede (expo-netinfo)
- [ ] Indicador visual "Offline" no header
- [ ] CRUD enfileirado quando offline
- [ ] Sincronização automática ao reconectar
- [ ] Toast "Sincronizando..." ao reconectar
- [ ] Conflitos: última escrita vence

### Implementação
```typescript
// src/services/offlineQueue.ts
interface QueuedAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = '@offline_queue';

export const enqueue = async (action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
  const queue = await getQueue();
  queue.push({
    ...action,
    id: Date.now().toString(),
    timestamp: Date.now(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const processQueue = async () => {
  const queue = await getQueue();
  for (const action of queue) {
    try {
      await executeAction(action);
    } catch {
      // Manter na fila para próxima tentativa
    }
  }
  await AsyncStorage.removeItem(QUEUE_KEY);
};
```

### Validação
- [ ] Airplane mode: ações enfileiradas
- [ ] Reconexão: fila processada
- [ ] Indicador offline aparece
- [ ] Dados sincronizados corretamente

---

## Story 7.5 — Error Recovery UX
**Prioridade:** 🟡 ALTA | **Esforço:** M (2 dias)

### Descrição
Melhorar experiência em erros com opções de retry.

### Acceptance Criteria
- [ ] Erro de rede: "Sem conexão. Tentar novamente?"
- [ ] Erro de servidor: "Erro no servidor. Tente em instantes."
- [ ] Botão "Tentar novamente" em erros recuperáveis
- [ ] Auto-retry com exponential backoff (3x)
- [ ] Skeleton loading enquanto retry
- [ ] Mensagens contextualizadas por tipo de erro

### Placeholders
```
assets/errors/error-network.png → https://placehold.co/200x150/ef4444/ffffff?text=📡+Sem+conexão
assets/errors/error-server.png  → https://placehold.co/200x150/f59e0b/ffffff?text=⚙️+Erro+no+servidor
```

### Validação
- [ ] Erro de rede: mensagem + botão aparecem
- [ ] Retry funciona
- [ ] Auto-retry após 3s, 6s, 12s
- [ ] Mensagens são claras

---

## Story 7.6 — Push Notification Rich
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (2 dias)

### Descrição
Enriquecer notificações push com imagens e ações.

### Acceptance Criteria
- [ ] Imagem no push (quando disponível)
- [ ] Ação rápida "Ver detalhes"
- [ ] Deep link para tela relevante
- [ ] Android: canal de notificação configurado
- [ ] iOS: categorias de notificação

### Placeholders
```
assets/push/push-reminder.png → https://placehold.co/400x200/ef4444/ffffff?text=🔔+Lembrete
assets/push/push-achievement.png → https://placehold.co/400x200/f48c25/ffffff?text=🏆+Conquista
```

### Validação
- [ ] Push com imagem aparece
- [ ] Botão "Ver detalhes" navega
- [ ] Deep link funciona

---

## Quality Gate FASE 7

### Checklist de Validação
- [ ] **Feature complete:** todas as stories implementadas
- [ ] **Testes:** cobertura ≥ 80%
- [ ] **Performance:** 60fps em animações
- [ ] **Bateria:** não drena bateria (offline queue)
- [ ] **Memória:** sem leaks (Flipper/DevTools)
- [ ] **Cross-platform:** iOS e Android

---

# 🔷 FASE 8 — Launch Prep

> **Duração:** 2 semanas (10 dias úteis)
> **Objetivo:** Preparar para publicação nas stores
> **Dependências:** FASE 7 concluída

---

## Story 8.1 — App Store Assets
**Prioridade:** 🔴 CRÍTICO | **Esforço:** G (3 dias)

### Descrição
Criar todos os assets necessários para publicação.

### Acceptance Criteria
- [ ] Screenshots: 5-8 por dispositivo
  - iPhone 6.7" (iPhone 14 Pro Max)
  - iPhone 6.5" (iPhone 11)
  - iPhone 5.5" (iPhone SE)
  - Android phone
  - Android tablet (opcional)
- [ ] Feature Graphic: 1024x500
- [ ] Ícone: 512x512 (adaptable icon)
- [ ] Descrição curta: 80 caracteres
- [ ] Descrição longa: 4000 caracteres
- [ ] Palavras-chave: 10 terms
- [ ] Privacy Policy URL
- [ ] Terms of Service URL

### Placeholders para Screenshots
```
assets/store/iphone-14-pro-max-1.png → https://placehold.co/1290x2796/ffffff/f48c25?text=Home
assets/store/iphone-14-pro-max-2.png → https://placehold.co/1290x2796/ffffff/22c55e?text=Metas
assets/store/iphone-14-pro-max-3.png → https://placehold.co/1290x2796/ffffff/3b82f6?text=Relatórios
assets/store/iphone-14-pro-max-4.png → https://placehold.co/1290x2796/ffffff/8b5cf6?text=Família
assets/store/feature-graphic.png      → https://placehold.co/1024x500/f48c25/ffffff?text=Dívida+Zero
assets/store/app-icon.png             → https://placehold.co/512x512/f48c25/ffffff?text=DZ
```

### Validação
- [ ] Screenshots em resolução correta
- [ ] Feature graphic com texto legível
- [ ] Ícone segue guidelines Apple/Google
- [ ] Privacy policy online e acessível

---

## Story 8.2 — Secrets Rotation Runbook
**Prioridade:** 🟡 ALTA | **Esforço:** S (1 dia)

### Descrição
Documentar processo de rotação de secrets.

### Acceptance Criteria
- [ ] Documento `docs/RUNBOOK-SECRETS.md` criado
- [ ] Lista de todos os secrets:
  - JWT_SECRET
  - SMTP_PASSWORD
  - AI_API_KEY
  - WHATSAPP_API_KEY
  - DATABASE_URL
  - WHATSAPP_WEBHOOK_SECRET
- [ ] Processo de rotação para cada um
- [ ] Contato responsável
- [ ] Frequência recomendada

### Validação
- [ ] Runbook revisado por outro dev
- [ ] Teste de rotação simulado

---

## Story 8.3 — HTTPS Enforcement
**Prioridade:** 🟡 ALTA | **Esforço:** S (0.5 dia)

### Descrição
Garantir HTTPS em produção.

### Acceptance Criteria
- [ ] `config.force_ssl = true` em production
- [ ] `config.assume_ssl = true` (Cloudflare)
- [ ] Header `Strict-Transport-Security`
- [ ] Redirect HTTP → HTTPS
- [ ] Teste com curl: `http://` → 301 para `https://`

### Validação
- [ ] Produção força HTTPS
- [ ] HSTS header presente
- [ ] Sem mixed content warnings

---

## Story 8.4 — Performance Audit
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (2 dias)

### Descrição
Auditar e otimizar performance do app.

### Acceptance Criteria
- [ ] Listas usam FlatList (virtualização)
- [ ] Imagens otimizadas (WebP, lazy load)
- [ ] Memoização auditada (useMemo useCallback)
- [ ] Bundle size < 5MB
- [ ] Tempo de inicialização < 2s
- [ ] Scroll 60fps

### Ferramentas
- Flipper (debugging)
- React DevTools (profiler)
- Bundle Analyzer

### Validação
- [ ] Flipper: sem memory leaks
- [ ] Profiler: re-renders < 16ms
- [ ] Bundle: tamanho aceitável

---

## Story 8.5 — Beta Testing Setup
**Prioridade:** 🟡 ALTA | **Esforço:** M (1 dia)

### Descrição
Configurar beta testing para validação externa.

### Acceptance Criteria
- [ ] EAS Build: profile `preview` configurado
- [ ] Google Play: track interno/alpha
- [ ] TestFlight: group de teste
- [ ] Documento de teste manual
- [ ] Formulário de feedback

### Validação
- [ ] Build de preview funciona
- [ ] Beta testers conseguem instalar
- [ ] Feedback chega ao time

---

## Story 8.6 — Monitoring & Analytics
**Prioridade:** 🟡 MÉDIA | **Esforço:** M (2 dias)

### Descrição
Configurar monitoramento pós-lançamento.

### Acceptance Criteria
- [ ] Sentry configurado (crash reporting)
- [ ] Analytics: eventos principais tracked
  - register, login, logout
  - record_create, record_pay, record_delete
  - goal_create, goal_contribute
  - bank_import
- [ ] Dashboard de métricas
- [ ] Alertas de erro configurados

### Validação
- [ ] Sentry captura erros
- [ ] Analytics aparece no dashboard
- [ ] Alertas funcionam

---

## Quality Gate FASE 8 (FINAL)

### Checklist de Validação
- [ ] **App Store:** assets prontos
- [ ] **Privacy Policy:** online
- [ ] **Terms of Service:** online
- [ ] **HTTPS:** forçado em produção
- [ ] **Monitoring:** Sentry + Analytics
- [ ] **Beta:** teste externo concluído
- [ ] **Performance:** todos os benchmarks atingidos
- [ ] **Security:** audit completa
- [ ] **Documentation:** README atualizado
- [ ] **Deploy:** pipeline CI/CD funcionando

---

## 📊 Métricas de Sucesso

### Quantitativas
| Métrica | Meta |
|---------|------|
| Crash rate | < 1% |
| ANR rate | < 0.5% |
| Tempo de inicialização | < 2s |
| Tamanho do app | < 50MB |
| Test coverage | ≥ 80% |
| Lighthouse score | ≥ 90 |

### Qualitativas
| Métrica | Meta |
|---------|------|
| App Store rating | ≥ 4.5 |
| Bug reports (primeiro mês) | < 10 |
| Feature requests | Tracked |
| User satisfaction | NPS ≥ 50 |

---

## 🔄 Fluxo de Trabalho

```
Story Criada → Development → Code Review → Tests → QA → Deploy Staging → Approve → Deploy Prod
     ↓              ↓              ↓           ↓       ↓         ↓             ↓          ↓
   Grooming      Branch PR     Comment     CI/CD   Manual    Smoke test   PO Sign   Release
```

### Branches
```
feat/fase-5-seguranca     → Stories 5.1-5.7
feat/fase-6-design        → Stories 6.1-6.6
feat/fase-7-features      → Stories 7.1-7.6
feat/fase-8-launch        → Stories 8.1-8.6
```

### Deploy
```
PR merged → main → Auto deploy → Staging → Manual promote → Production
```

---

## 📝 Notas Finais

### Dependências de Pacotes (package.json)
```json
{
  "dependencies": {
    "expo-haptics": "~14.0.0",
    "expo-local-authentication": "~16.0.0",
    "expo-netinfo": "~12.0.0",
    "react-native-reanimated": "~3.16.0",
    "lottie-react-native": "~6.5.0",
    "react-native-chart-kit": "^6.12.0",
    "@sentry/react-native": "~5.0.0"
  },
  "devDependencies": {
    "react-native-bundle-analyzer": "^0.13.0"
  }
}
```

### Gems Backend
```ruby
# Gemfile
gem "rack-attack"
gem "redis"
```

### Cronograma Resumido
| Semana | Fase | Stories |
|:------:|:----:|:-------:|
| 1-2 | 5 | 5.1, 5.2, 5.3 |
| 3 | 5 | 5.4, 5.5, 5.6, 5.7 |
| 4-5 | 6 | 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 |
| 6-7 | 7 | 7.1, 7.2, 7.3 |
| 8 | 7 | 7.4, 7.5, 7.6 |
| 9-10 | 8 | 8.1, 8.2, 8.3, 8.4, 8.5, 8.6 |

---

**Status:** 📋 Pronto para revisão
**Próximo:** Validar com time e iniciar FASE 5
