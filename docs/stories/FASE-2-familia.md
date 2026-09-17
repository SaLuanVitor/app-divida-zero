# FASE 2 — Família / Contas Compartilhadas 👨‍👩‍👧

> Mudança estrutural de maior porte: múltiplos usuários compartilhando uma conta financeira.
> Baseado em `docs/PLANO-EVOLUCAO.md`.

Data: 2026-07-10 · Owner: SaLuanVitor · Orquestração: @aiox-master (Orion)

---

## Design Técnico

### Modelos

```ruby
Household
  - name: string, not null
  - invite_code: string, unique (token para entrada)
  - created_at/updated_at

HouseholdMembership
  - household: belongs_to
  - user: belongs_to
  - role: enum (owner | member)
  - joined_at: datetime
  - unique [household_id, user_id]

HouseholdInvitation
  - household: belongs_to
  - email: string, not null (destinatário)
  - token: string, unique
  - status: enum (pending | accepted | declined | expired)
  - invited_by: belongs_to (user)
  - expires_at: datetime
  - created_at/updated_at
```

### Escopo de Dados

`financial_records` e `financial_goals` ganham `household_id` opcional (nullable).

Regras de visibilidade:
- Se `household_id` é nil → visível apenas pelo dono (comportamento atual)
- Se `household_id` é preenchido → visível por todos membros daquele household
- `owner` pode editar/deletar qualquer record/goal do household
- `member` pode editar/deletar apenas próprios records/goals

### Endpoints

```
GET    /api/v1/households/me          — meu household (com membros)
POST   /api/v1/households             — criar household (vira owner)
PATCH  /api/v1/households/me          — editar nome
DELETE /api/v1/households/me          — sair da família (se owner, transfere ou extingue)

POST   /api/v1/households/invitations — convidar por email
GET    /api/v1/households/invitations — listar convites pendentes (do household)
DELETE /api/v1/households/invitations/:id — cancelar convite

GET    /api/v1/invitations/pending    — meus convites pendentes (como destinatário)
POST   /api/v1/invitations/:token/accept — aceitar convite
POST   /api/v1/invitations/:token/decline — recusar convite
```

### Mudanças no FinancialRecordsController

- `index`: incluir records do household + do usuário
- `create`: associar ao household do usuário (se ele for owner)
- `update/destroy`: verificar permissão (owner pode editar qualquer um; member só os próprios)

### Mobile: Novas Telas

- **FamilyScreen** — informações da família, membros, código de convite
- **FamilyInviteScreen** — formulário de convite por email
- **PendingInvitesScreen** — lista de convites recebidos
- **Indicador de autoria** — avatar/nome ao lado de records compartilhados

---

## Acceptance Criteria

### Backend: Modelos
- [x] Criar migration `Household` (name, invite_code)
- [x] Criar migration `HouseholdMembership` (household, user, role)
- [x] Criar migration `HouseholdInvitation` (household, email, token, status, invited_by, expires_at)
- [x] `invite_code` gerado automaticamente (SecureRandom.hex)
- [x] Validações: nome presente, email único por household, papéis válidos
- [x] `Household#owner` retorna o owner atual

### Backend: Endpoints
- [x] `POST /households` — criar família, cria membership como owner
- [x] `GET /households/me` — retorna household + membros
- [x] `PATCH /households/me` — editar nome (só owner)
- [x] `DELETE /households/me` — sair (owner precisa transferir)
- [x] `POST /households/invitations` — convidar por email (só owner)
- [x] `GET /households/invitations` — listar convites do household
- [x] `DELETE /households/invitations/:id` — cancelar convite pendente (só owner)
- [x] `GET /invitations/pending` — listar convites recebidos
- [x] `POST /invitations/:token/accept` — aceitar e criar membership
- [x] `POST /invitations/:token/decline` — recusar

### Backend: Escopo de Dados
- [x] Migration: add `household_id` a `financial_records` (nullable)
- [x] Migration: add `household_id` a `financial_goals` (nullable)
- [x] `FinancialRecordsController#index` inclui records do household
- [x] `FinancialRecordsController` verifica permissão (owner vs member)
- [x] `FinancialGoalsController` escopo compartilhado similar
- [x] Owner pode editar/deletar qualquer record do household
- [x] Member só edita/deleta próprios records
- [x] Usuário sem household vê apenas dados próprios (comportamento atual)

### Mobile
- [x] Tela "Minha Família" com info + membros + invite_code
- [x] Tela "Convidar" com input de email
- [x] Tela "Convites Pendentes" com aceitar/recusar
- [x] Indicador de autoria em records compartilhados (avatar/nome)
- [x] Badge de convites pendentes no perfil

### Testes
- [x] Testes de criação de household
- [x] Testes de convite (aceitar, recusar, expirar)
- [x] Testes de autorização (owner vs member)
- [x] Testes de escopo (usuário fora do household não vê dados)
- [x] Testes de tipo de dado legado (household_id nil)

---

## Arquivos Afetados

### Backend — Novos
- `app/models/household.rb`
- `app/models/household_membership.rb`
- `app/models/household_invitation.rb`
- `app/controllers/api/v1/households_controller.rb`
- `app/controllers/api/v1/household_invitations_controller.rb`
- `app/controllers/api/v1/invitations_controller.rb`
- `db/migrate/*_create_households.rb`
- `db/migrate/*_create_household_memberships.rb`
- `db/migrate/*_create_household_invitations.rb`
- `db/migrate/*_add_household_ref_to_financial_records.rb`
- `db/migrate/*_add_household_ref_to_financial_goals.rb`
- `test/controllers/api/v1/households_controller_test.rb`

### Backend — Modificados
- [x] `app/models/user.rb` — associações `has_many :household_memberships`
- [x] `app/models/financial_record.rb` — `belongs_to :household`, optional
- [x] `app/models/financial_goal.rb` — `belongs_to :household`, optional, user_name na serialize
- [x] `app/controllers/api/v1/financial_records_controller.rb` — escopo compartilhado + user_name
- [x] `app/controllers/api/v1/financial_goals_controller.rb` — escopo compartilhado
- [x] `config/routes.rb` — novas rotas

### Mobile — Novos
- [x] `src/screens/app/Familia.tsx`
- [x] `src/screens/app/Convidar.tsx`
- [x] `src/screens/app/ConvitesPendentes.tsx`

### Mobile — Modificados
- [x] `src/screens/app/Profile.tsx` — link para tela de família
- [x] `src/screens/app/Lancamentos.tsx` — indicador de autoria
- [x] `src/screens/app/Home.tsx` — indicador de autoria no calendário
- [x] `src/navigation/AppNavigator.tsx` — novas telas
- [x] `src/types/household.ts` — tipos
- [x] `src/types/financialRecord.ts` — user_name
- [x] `src/types/financialGoal.ts` — user_name

---

## Sequência de Execução

```
1. Migrations (modelos + household_id em records/goals)
2. Models (Household, Membership, Invitation)
3. Endpoints de Household (CRUD)
4. Endpoints de Invitation (convidar, aceitar, recusar)
5. Escopo compartilhado (FinancialRecords + FinancialGoals)
6. Mobile: tipos + API service
7. Mobile: tela Família + Convidar
8. Mobile: tela Convites Pendentes
9. Mobile: indicador de autoria
10. Testes de autorização e escopo
11. Quality gates + checklist
```

---

## Riscos

- **Dados legados**: records/goals existentes têm `household_id = nil` — escopo não muda para eles
- **Migração de dados**: owner pode "adotar" records próprios para o household via PATCH
- **Performance**: escopo compartilhado adiciona `OR` queries — monitorar índices
