# Sprint Execution Loop Prompt — FASE 5: Segurança + UX Core

> **Branch:** `feat/fase-5-seguranca`
> **Stories:** 5.1 → 5.7 (7 stories)
> **Duration:** 3 semanas (15 dias úteis)
> **Orchestrator:** @aiox-master (Orion) → delegates to @dev, @qa, @architect, @data-engineer

---

## 🔄 MASTER EXECUTION LOOP

```bash
# Execute this prompt in a loop until all 7 stories are DONE
# Each iteration: PICK NEXT STORY → PLAN → IMPLEMENT → REVIEW → GATE → COMMIT → NEXT
```

### Loop Invariant (sempre verdadeiro no início de cada iteração)
- [ ] Branch `feat/fase-5-seguranca` ativa
- [ ] `git status` limpo (sem WIP)
- [ ] Próxima story identificada em `docs/stories/SPRINT-5-8-PLAN.md`
- [ ] Quality gates do story anterior: **PASS**

---

## 📋 STORY PICKING LOGIC (determinístico)

```yaml
story_order:
  - id: "5.1"
    title: "Rate Limiting Global"
    priority: "CRÍTICO"
    effort: "M (2 dias)"
    deps: []
    owner: "@dev + @data-engineer (Redis)"
  - id: "5.2"
    title: "Account Lockout"
    priority: "CRÍTICO"
    effort: "M (2 dias)"
    deps: ["5.1"]
    owner: "@dev + @data-engineer (migration)"
  - id: "5.3"
    title: "Session Management (Logout + Blacklist)"
    priority: "CRÍTICO"
    effort: "G (3 dias)"
    deps: ["5.1", "5.2"]
    owner: "@dev + @data-engineer (Redis)"
  - id: "5.4"
    title: "Audit Log"
    priority: "ALTA"
    effort: "G (3 dias)"
    deps: ["5.3"]
    owner: "@dev + @data-engineer"
  - id: "5.5"
    title: "Haptic Feedback"
    priority: "ALTA"
    effort: "S (1 dia)"
    deps: []
    owner: "@dev (mobile)"
  - id: "5.6"
    title: "Success Animations"
    priority: "ALTA"
    effort: "M (2 dias)"
    deps: ["5.5"]
    owner: "@dev (mobile) + @ux-design-expert (assets)"
  - id: "5.7"
    title: "Gráficos nos Relatórios"
    priority: "ALTA"
    effort: "G (3 dias)"
    deps: ["5.6"]
    owner: "@dev (mobile) + @ux-design-expert (design)"
```

**Regra:** Próxima story = primeira na lista com `deps` todas `DONE` e status ≠ `DONE`.

---

## 🎯 PER-STORY EXECUTION LOOP (para cada story)

### FASE 0: PRE-FLIGHT (obrigatório antes de começar)

```bash
# 0.1 Verificar branch e status
git status
git log --oneline -3

# 0.2 Ler ACs completos da story no SPRINT-5-8-PLAN.md
# 0.3 Verificar dependências (deps) estão DONE
# 0.4 *ids check "implementar {story.title}" --type story  # Advisory REUSE/ADAPT/CREATE
# 0.5 Confirmar owner/agent delegation
```

### FASE 1: PLAN & DESIGN (Architect-First)

```bash
# 1.1 @architect *generate-ai-prompt para design técnico (se backend)
# 1.2 @architect valida arquitetura proposta vs código existente
# 1.3 @data-engineer valida schema/migrations (se DB)
# 1.4 Documentar decisões em `.aiox/sdc/{story-id}/DESIGN.md`
# 1.5 @po *validate-story-draft (se story não está Ready)
```

**Gate 1:** Design approved by @architect + @data-engineer (se aplica)

### FASE 2: IMPLEMENT (Dev Loop)

```bash
# 2.1 @dev *develop-story {story-id}
#     - Implementa ACs um a um
#     - Escreve testes JUNTO (TDD preferido)
#     - Commits atômicos por AC
# 2.2 @dev roda quality gates LOCALMENTE:
#     - Backend: bin/rails test, rubocop, brakeman
#     - Mobile: npm run typecheck, npm test, npm run lint
# 2.3 Se FAIL: @dev corrige → volta 2.2 (loop até PASS)
# 2.4 @dev *ids register {novos-arquivos} --type story --agent dev
```

**Gate 2:** All local quality gates PASS + ACs implementados

### FASE 3: REVIEW (QA Gate)

```bash
# 3.1 @qa *review-story {story-id}
#     - Verifica ACs um a um (traceability)
#     - Roda testes completos
#     - Security review (se security-related)
#     - Performance check
# 3.2 Verdict: PASS | CONCERNS | FAIL | WAIVED
# 3.3 Se CONCERNS/FAIL:
#     - @qa documenta findings
#     - @dev *apply-qa-fixes {findings}
#     - Volta 3.1 (loop até PASS)
# 3.4 Se PASS: @qa atualiza lifecycle → "Ready for Merge"
```

**Gate 3:** @qa verdict = **PASS**

### FASE 4: INTEGRATE & COMMIT

```bash
# 4.1 @dev faz merge/local rebase se necessário
# 4.2 @dev roda FULL quality gates (backend + mobile)
# 4.3 @aiox-commit: commit convencional com [Story X.Y]
# 4.4 @dev *ids register {arquivos-modificados} --type story --agent dev
# 4.5 Atualizar checklist no SPRINT-5-8-PLAN.md: [ ] → [x]
```

### FASE 5: POST-STORY VALIDATION

```bash
# 5.1 @aiox-master *status → confirma story DONE
# 5.2 @aiox-master *ids health → registry saudável
# 5.3 Próxima story = pick from story_order
# 5.4 LOOP BACK TO FASE 0
```

---

## 🛡️ QUALITY GATES (Non-Negotiable)

### Backend (Rails)
```bash
bin/rails test                    # 100% pass
bin/rubocop                       # 0 offenses
bin/brakeman                      # 0 warnings
bin/rails db:migrate:status       # all up
```

### Mobile (React Native/Expo)
```bash
npm run typecheck                 # 0 errors
npm test                          # 68+ tests pass
npm run lint                      # 0 errors (warnings OK)
```

### Cross-cutting
```bash
# Security
npm audit --audit-level=high      # 0 vulnerabilities
bin/brakeman                      # 0 warnings

# Performance
# - Bundle size < 5MB
# - Startup < 2s
# - 60fps animations
```

---

## 🔁 RETRY/ROLLBACK RULES

| Cenário | Ação |
|---------|------|
| Local gates FAIL em FASE 2 | Fix → re-run gates (max 3 tentativas) |
| @qa = CONCERNS | @dev fixes → @qa re-reviews (max 2 ciclos) |
| @qa = FAIL | @dev re-implementa story → volta FASE 1 |
| Merge conflict | @dev resolve → re-run ALL gates |
| *ids health = DEGRADED | Pausar sprint → @aiox-master investiga |

**Max retries por story:** 3 ciclos completos. Após 3 FAILs → escalar para @pm (replan).

---

## 📊 SPRINT TRACKING (atualizar a cada story DONE)

```markdown
## Sprint Progress Tracker

| Story | Status | Started | Completed | Gates | Notes |
|-------|--------|---------|-----------|-------|-------|
| 5.1 | 🔄 IN_PROGRESS | 2026-08-21 | — | — | Rate Limiting |
| 5.2 | ⏳ PENDING | — | — | — | Depends on 5.1 |
| 5.3 | ⏳ PENDING | — | — | — | Depends on 5.1, 5.2 |
| 5.4 | ⏳ PENDING | — | — | — | Depends on 5.3 |
| 5.5 | ⏳ PENDING | — | — | — | Mobile, independent |
| 5.6 | ⏳ PENDING | — | — | — | Depends on 5.5 |
| 5.7 | ⏳ PENDING | — | — | — | Depends on 5.6 |

**Overall:** 0/7 DONE | 0% | ETA: 15 dias úteis
```

---

## 🤖 AGENT DELEGATION MATRIX

| Atividade | Agent Primário | Support | Comando |
|-----------|---------------|---------|---------|
| Architecture/Design | @architect | — | `*generate-ai-prompt` |
| DB Schema/Migrations | @data-engineer | — | `*task create-migration` |
| Backend Implementation | @dev | @data-engineer | `*develop-story` |
| Mobile Implementation | @dev | @ux-design-expert | `*develop-story` |
| Test Creation | @qa | @dev | `*create-suite` |
| QA Gate Review | @qa | — | `*review-story` |
| QA Fix Application | @dev | — | `*apply-qa-fixes` |
| Git/Release | @devops | — | `*push`, `*create-pr` |
| Sprint Orchestration | @aiox-master | All | `*workflow`, `*plan` |

**Regra de Ouro:** @aiox-master NUNCA implementa diretamente. SEMPRE delega.

---

## 🚨 ESCALATION TRIGGERS

| Trigger | Ação | Responsável |
|---------|------|-------------|
| 3+ FAIL cycles em story | Pausar → @pm replan | @aiox-master |
| Quality gate regressão | *correct-course | @aiox-master |
| Blocker > 1 dia | Daily sync → @sm unblocks | @sm |
| Scope creep detectado | *correct-course → reject | @aiox-master |
| *ids health = CRITICAL | Pausar tudo → registry heal | @aiox-master |

---

## 📝 COMMIT CONVENTION (por story)

```bash
# Por AC implementado (atomic commits):
feat(backend): rate limiting login 5/min por IP [Story 5.1]
feat(backend): rate limiting register 3/hr por IP [Story 5.1]
feat(backend): rate limiting forgot 3/hr por IP [Story 5.1]
test(backend): rate limiting unit tests [Story 5.1]

# Mobile:
feat(mobile): haptic feedback pagar/receber [Story 5.5]
feat(mobile): haptic feedback deletar/erro [Story 5.5]
test(mobile): haptics integration tests [Story 5.5]
```

---

## 🏁 SPRINT COMPLETION CRITERIA

Sprint FASE 5 = **DONE** quando:

- [ ] Todas as 7 stories: `status = DONE` + `qa_verdict = PASS`
- [ ] Checklist SPRINT-5-8-PLAN.md: todos `[x]`
- [ ] Quality Gate FASE 5 (seção 364-380) 100% PASS
- [ ] `git diff main..feat/fase-5-seguranca` limpo (só changes da sprint)
- [ ] @devops *create-pr com title: `feat: FASE 5 - Segurança + UX Core`
- [ ] PR approved + CI/CD green → merge to main
- [ ] Deploy staging validado
- [ ] @aiox-master *close-story para cada story

---

## 🎮 HOW TO RUN THIS LOOP

### Opção A: Manual (você executa cada comando)
```bash
# Em cada iteração, execute os comandos das fases acima em ordem
# Use @dev, @qa, @architect via atalhos (@dev, @qa, @architect)
```

### Opção B: Semi-automado (use *workflow engine)
```bash
@aiox-master *workflow story-development-cycle --mode=engine --story=5.1
# Repete para 5.2, 5.3...
```

### Opção C: Full SDC (single command per story)
```bash
@aiox-master *full-sdc 5.1
@aiox-master *full-sdc 5.2
# ...
```

---

## 📌 NOTAS CRÍTICAS

1. **NUNCA pule FASE 1 (Design)** — Architect-First é mandatório
2. **NUNCA pule FASE 3 (QA)** — @qa é gate obrigatório
3. **SEMPRE rode gates LOCALMENTE** antes de chamar @qa
4. **SEMPRE atualize checklist** no SPRINT-5-8-PLAN.md
5. **SEMPRE *ids register** novos arquivos
6. **Branch protection:** Não force-push, não commit direto em main
7. **WIP commits:** Permitidos localmente, mas squash antes do PR final

---

## 🚀 START COMMAND

```bash
# Para iniciar AGORA:
git checkout feat/fase-5-seguranca
# Ler Story 5.1 ACs completos
@architect *generate-ai-prompt "Rate Limiting Global com Rack::Attack: login 5/min, register 3/hr, forgot 3/hr, resposta 429 com Retry-After, logs, testes"
# Validar design → @dev *develop-story 5.1
```

---

**Este prompt é um loop executável. Rode fase a fase, valide gates, repita até sprint completa.**