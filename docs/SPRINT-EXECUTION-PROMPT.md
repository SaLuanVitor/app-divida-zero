# Sprint Execution Loop Prompt — FASE 5: Segurança + UX Core (FULL AUTO)

> **Branch:** `feat/fase-5-seguranca`
> **Stories:** 5.1 → 5.7 (7 stories)
> **Duration:** 3 semanas (15 dias úteis)
> **Orchestrator:** @aiox-master (Orion) → delegates to @dev, @qa, @architect, @data-engineer

---

## 🔄 MASTER EXECUTION LOOP — FULL AUTOMATION

```bash
# SINGLE COMMAND TO RUN ENTIRE FASE 5:
@aiox-master *full-sdc-wave fase-5-seguranca

# OR step-by-step auto-loop:
@aiox-master *auto-loop fase-5-seguranca
```

### Loop Invariant (sempre verdadeiro no início de cada iteração)
- [ ] Branch `feat/fase-5-seguranca` ativa
- [ ] `git status` limpo (sem WIP)
- [ ] Próxima story identificada automaticamente via `story_order` YAML
- [ ] Quality gates do story anterior: **PASS**

---

## 📋 STORY ORDER (determinístico, executado sequencialmente)

```yaml
story_order:
  - id: "5.1"
    title: "Rate Limiting Global"
    priority: "CRÍTICO"
    effort: "M (2 dias)"
    deps: []
    owner: "@dev + @data-engineer (Redis)"
    type: "backend"
    status: "DONE"  # ✅ CONCLUÍDA
  - id: "5.2"
    title: "Account Lockout"
    priority: "CRÍTICO"
    effort: "M (2 dias)"
    deps: ["5.1"]
    owner: "@dev + @data-engineer (migration)"
    type: "backend"
    status: "PENDING"
  - id: "5.3"
    title: "Session Management (Logout + Blacklist)"
    priority: "CRÍTICO"
    effort: "G (3 dias)"
    deps: ["5.1", "5.2"]
    owner: "@dev + @data-engineer (Redis)"
    type: "backend"
    status: "PENDING"
  - id: "5.4"
    title: "Audit Log"
    priority: "ALTA"
    effort: "G (3 dias)"
    deps: ["5.3"]
    owner: "@dev + @data-engineer"
    type: "backend"
    status: "PENDING"
  - id: "5.5"
    title: "Haptic Feedback"
    priority: "ALTA"
    effort: "S (1 dia)"
    deps: []
    owner: "@dev (mobile)"
    type: "mobile"
    status: "PENDING"
  - id: "5.6"
    title: "Success Animations"
    priority: "ALTA"
    effort: "M (2 dias)"
    deps: ["5.5"]
    owner: "@dev (mobile) + @ux-design-expert (assets)"
    type: "mobile"
    status: "PENDING"
  - id: "5.7"
    title: "Gráficos nos Relatórios"
    priority: "ALTA"
    effort: "G (3 dias)"
    deps: ["5.6"]
    owner: "@dev (mobile) + @ux-design-expert (design)"
    type: "mobile"
    status: "PENDING"
```

**Auto-pick rule:** Próxima story = primeira na lista com `deps` todas `DONE` e `status = "PENDING"`.

---

## 🤖 AUTO-LOOP EXECUTION ENGINE

```yaml
# Pseudo-code do loop automático (executado por @aiox-master via *auto-loop)
auto_loop:
  while stories_remaining:
    story = pick_next_story(story_order)
    
    # ==========================================
    # FASE 0: PRE-FLIGHT (automático)
    # ==========================================
    run: git status --porcelain
    assert: clean
    run: git log --oneline -1
    log: "Iniciando Story {story.id}: {story.title}"
    update_tracker(story.id, "IN_PROGRESS", started=now())
    
    # IDS pre-check (advisory)
    run: *ids check "implementar {story.title}" --type story
    
    # ==========================================
    # FASE 1: PLAN & DESIGN (Architect-First)
    # ==========================================
    if story.type == "backend":
      # Generate design prompt from ACs
      design_prompt = extract_acs_from_plan(story.id)
      run: @architect *generate-ai-prompt "{design_prompt}"
      run: @architect *validate-workflow design-approval --story={story.id}
      run: @data-engineer *task validate-schema --story={story.id}
    else:
      # Mobile: design review com @ux-design-expert
      run: @ux-design-expert *design-review --story={story.id}
    
    gate1 = wait_for_approval(["@architect", "@data-engineer" if backend])
    assert gate1 == "APPROVED"
    
    # ==========================================
    # FASE 2: IMPLEMENT (Dev Loop com retry)
    # ==========================================
    retry_count = 0
    max_retries = 3
    while retry_count < max_retries:
      run: @dev *develop-story {story.id}
      
      # Quality gates locais
      if story.type == "backend":
        gates = run_gates([
          "bin/rails test",
          "bin/rubocop --fail-level=error",
          "bin/brakeman --exit-on-warn",
          "bin/rails db:migrate:status"
        ])
      else:
        gates = run_gates([
          "npm run typecheck",
          "npm test -- --passWithNoTests",
          "npm run lint -- --max-warnings=0"
        ])
      
      # Cross-cutting gates
      cross_gates = run_gates([
        "npm audit --audit-level=high",
        "bin/brakeman --exit-on-warn"
      ])
      
      if gates.all_pass && cross_gates.all_pass:
        break  # SUCCESS
      
      retry_count++
      log: "Quality gates FAIL (tentativa {retry_count}/3). Fixando..."
      run: @dev *apply-qa-fixes --auto-fix --gates={gates.failed}
    
    assert retry_count < max_retries, "Max retries exceeded → escalate @pm"
    
    # Register new files
    new_files = git diff --name-only HEAD
    run: @dev *ids register {new_files} --type story --agent dev
    
    # ==========================================
    # FASE 3: REVIEW (QA Gate - obrigatório)
    # ==========================================
    qa_cycle = 0
    max_qa_cycles = 2
    while qa_cycle <= max_qa_cycles:
      verdict = run: @qa *review-story {story.id} --mode=strict
      
      if verdict == "PASS":
        break
      elif verdict in ["CONCERNS", "FAIL"]:
        findings = run: @qa *get-findings {story.id}
        run: @dev *apply-qa-fixes {findings}
        qa_cycle++
        continue
      elif verdict == "WAIVED":
        log: "Story WAIVED by @qa (documentar justificativa)"
        break
    
    assert verdict == "PASS", "QA Gate FAIL after {max_qa_cycles} cycles → re-implement"
    
    # ==========================================
    # FASE 4: INTEGRATE & COMMIT
    # ==========================================
    run: @dev *sync-branch
    run: @dev *run-full-quality-gates
    run: @aiox-commit "feat({story.type}): {story.title} [Story {story.id}]"
    update_tracker(story.id, "DONE", completed=now(), gates="PASS")
    update_plan_checklist(story.id, all_acs=true)
    
    # ==========================================
    # FASE 5: POST-STORY VALIDATION
    # ==========================================
    run: @aiox-master *status
    run: @aiox-master *ids health
    assert ids_health == "HEALTHY"
    
    log: "✅ Story {story.id} CONCLUÍDA. Próxima: {next_story.id}"
  
  # ALL STORIES DONE → Sprint completion
  run_sprint_completion()
```

---

## 🎯 PER-STORY DETAILED SPECS (para @dev *develop-story)

### Story 5.2 — Account Lockout
```yaml
backend_files:
  - db/migrate/xxx_add_failed_login_to_users.rb
  - app/models/user.rb (lock_account!, locked?, increment_failed_login!, reset_failed_login!)
  - app/controllers/api/v1/auth_controller.rb (login action)
  - test/controllers/api/v1/auth_controller_test.rb (lockout tests)

acceptance_criteria:
  - migration: failed_login_count (integer, default 0)
  - migration: locked_until (datetime, nullable)
  - após 5 falhas: lockout 15 min
  - login sucesso: reset contadores
  - mensagem clara quando bloqueada
  - admin pode desbloquear manualmente
```

### Story 5.3 — Session Management (Logout + Blacklist)
```yaml
backend_files:
  - db/migrate/xxx_create_token_blacklist.rb (ou Redis-only)
  - app/services/token_blacklist.rb
  - app/controllers/api/v1/auth_controller.rb (logout action)
  - config/initializers/redis.rb (se não existe)
  - test/controllers/api/v1/auth_controller_test.rb (logout tests)
  - test/services/token_blacklist_test.rb

acceptance_criteria:
  - endpoint POST /auth/logout adiciona token à blacklist
  - Redis configurado para blacklist (TTL = 7 dias)
  - refresh token invalidado no logout
  - mobile: logout limpa tokens locais
  - token revogado retorna 401
```

### Story 5.4 — Audit Log
```yaml
backend_files:
  - db/migrate/xxx_create_audit_logs.rb
  - app/models/audit_log.rb
  - app/controllers/concerns/auditable.rb
  - app/controllers/api/v1/auth_controller.rb (include Auditable)
  - app/controllers/api/v1/financial_records_controller.rb (include Auditable)
  - app/jobs/cleanup_audit_logs_job.rb
  - config/recurring.yml (cleanup job)
  - test/models/audit_log_test.rb
  - test/controllers/concerns/auditable_test.rb

acceptance_criteria:
  - model AuditLog: user_id, action, resource_type, resource_id, ip, user_agent, metadata
  - ações logadas: login, logout, password_change, record_delete, admin_actions
  - retenção: 90 dias (job de limpeza)
```

### Story 5.5 — Haptic Feedback (Mobile)
```yaml
mobile_files:
  - package.json (expo-haptics)
  - src/utils/haptics.ts
  - src/screens/app/Lancamentos.tsx (integração)
  - src/screens/app/Metas.tsx (integração)
  - src/screens/app/Home.tsx (integração)
  - src/context/SettingsContext.tsx (toggle)
  - test/utils/haptics.test.ts

acceptance_criteria:
  - expo-haptics instalado
  - pagamento/recebimento: impacto médio
  - deletar registro: impacto pesado
  - nível up: notificação sucesso
  - erro: notificação erro
  - pull-to-refresh: impacto leve
  - toggle no settings para desativar
```

### Story 5.6 — Success Animations (Mobile)
```yaml
mobile_files:
  - package.json (lottie-react-native, react-native-reanimated)
  - src/assets/animations/success-check.json
  - src/assets/animations/confetti.json
  - src/assets/animations/loading-gear.json
  - src/components/SuccessAnimation.tsx
  - src/screens/app/Lancamentos.tsx (integração)
  - src/screens/app/Metas.tsx (integração)
  - test/components/SuccessAnimation.test.tsx

acceptance_criteria:
  - lottie-react-native instalado
  - animação checkmark para pagamentos
  - animação confetti para nível up
  - animação engrenagem para processamento
  - duração 1.5-2s
  - redução de movimento respeitada
```

### Story 5.7 — Gráficos nos Relatórios (Mobile)
```yaml
mobile_files:
  - package.json (react-native-chart-kit)
  - src/screens/app/Relatorios.tsx (refatoração completa)
  - src/components/charts/MonthlyBarChart.tsx
  - src/components/charts/CategoryPieChart.tsx
  - src/components/charts/BalanceLineChart.tsx
  - src/hooks/useReportData.ts
  - test/screens/Relatorios.test.tsx

acceptance_criteria:
  - react-native-chart-kit instalado
  - gráfico barras: entradas vs saídas (mensal)
  - gráfico pizza: por categoria
  - gráfico linha: evolução do saldo
  - filtro por período
  - dark mode suportado
  - loading state
```

---

## 🛡️ QUALITY GATES (Non-Negotiable — Auto-enforced)

```bash
# BACKEND (executado automaticamente em FASE 2)
backend_gates:
  - bin/rails test                    # 100% pass
  - bin/rubocop --fail-level=error    # 0 offenses
  - bin/brakeman --exit-on-warn       # 0 warnings
  - bin/rails db:migrate:status       # all up

# MOBILE (executado automaticamente em FASE 2)
mobile_gates:
  - npm run typecheck                 # 0 errors
  - npm test -- --passWithNoTests     # 68+ tests pass
  - npm run lint -- --max-warnings=0  # 0 errors

# CROSS-CUTTING (sempre)
cross_gates:
  - npm audit --audit-level=high      # 0 vulnerabilities
  - bin/brakeman --exit-on-warn       # 0 warnings
```

---

## 🔁 RETRY/ROLLBACK RULES (Auto-enforced)

| Cenário | Ação Automática |
|---------|-----------------|
| Local gates FAIL em FASE 2 | @dev *apply-qa-fixes --auto-fix → re-run (max 3) |
| @qa = CONCERNS | @dev *apply-qa-fixes → @qa re-review (max 2) |
| @qa = FAIL | Re-implement story → volta FASE 1 |
| Merge conflict | @dev *resolve-conflicts → re-run ALL gates |
| *ids health = DEGRADED | PAUSAR loop → alert @aiox-master |
| 3+ FAIL cycles | ESCALATE @pm → *correct-course |

---

## 📊 SPRINT TRACKING (Auto-updated)

```markdown
## Sprint Progress Tracker (AUTO-UPDATED)

| Story | Status | Started | Completed | Gates | Notes |
|-------|--------|---------|-----------|-------|-------|
| 5.1 | ✅ DONE | 2026-08-21 | 2026-08-21 | PASS | Rate Limiting |
| 5.2 | ⏳ PENDING | — | — | — | Account Lockout |
| 5.3 | ⏳ PENDING | — | — | — | Session Mgmt |
| 5.4 | ⏳ PENDING | — | — | — | Audit Log |
| 5.5 | ⏳ PENDING | — | — | — | Haptics (Mobile) |
| 5.6 | ⏳ PENDING | — | — | — | Success Anim (Mobile) |
| 5.7 | ⏳ PENDING | — | — | — | Charts (Mobile) |

**Overall:** 1/7 DONE | 14% | ETA: 15 dias úteis
```

---

## 🎮 HOW TO RUN — SINGLE COMMAND

### Opção 1: Full SDC Wave (RECOMENDADO - totalmente automático)
```bash
# Executa TODA a FASE 5 do início ao fim
@aiox-master *full-sdc-wave fase-5-seguranca
```

### Opção 2: Auto-Loop (controlado)
```bash
# Loop automático story por story com checkpoints
@aiox-master *auto-loop fase-5-seguranca --checkpoint-after=each
```

### Opção 3: Story individual (se precisar retomar)
```bash
@aiox-master *full-sdc 5.2
@aiox-master *full-sdc 5.3
# ...
```

---

## 🚀 START COMMAND — EXECUTAR AGORA

```bash
# ESTAMOS NA BRANCH CORRETA (feat/fase-5-seguranca)
# Story 5.1 JÁ CONCLUÍDA

# OPÇÃO A: Rodar TODA a FASE 5 automaticamente
@aiox-master *full-sdc-wave fase-5-seguranca

# OPÇÃO B: Rodar story por story com checkpoint
@aiox-master *auto-loop fase-5-seguranca --checkpoint-after=each
```

---

## ⚠️ PRÉ-REQUISITOS (verificar antes de iniciar)

```bash
# 1. PostgreSQL rodando (para testes backend)
docker-compose up -d db
# Aguardar healthcheck

# 2. Dependências mobile instaladas
cd mobile && npm install

# 3. Backend bundle instalado
cd backend/api_divida_zero && bundle install

# 4. Verificar se Redis disponível (para 5.3 blacklist)
# Se não: story 5.3 usará memory store em dev
```

---

## 📌 NOTAS CRÍTICAS (Auto-enforced)

1. **NUNCA pula FASE 1 (Design)** — Architect-First mandatório
2. **NUNCA pula FASE 3 (QA)** — @qa gate obrigatório
3. **SEMPRE roda gates LOCALMENTE** antes de @qa
4. **SEMPRE atualiza checklist** no SPRINT-5-8-PLAN.md
5. **SEMPRE *ids register** novos arquivos
6. **Branch protection:** Não force-push, não commit direto em main
7. **WIP commits:** Permitidos localmente, mas squash antes do PR final
8. **Story 5.5, 5.6, 5.7 são MOBILE** — requerem device físico para haptics/animations

---

**Este prompt executa TODA a FASE 5 automaticamente. Use `@aiox-master *full-sdc-wave fase-5-seguranca` para rodar o loop completo.**