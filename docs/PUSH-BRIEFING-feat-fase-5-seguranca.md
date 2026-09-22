# Push Briefing — `feat/fase-5-seguranca` (para @devops)

> Data: 2026-09-22 · Preparado por Orion (@aiox-master)
> Repo: app-divida-zero

## 1. Estado da branch

| Item | Valor |
|------|-------|
| Branch | `feat/fase-5-seguranca` (100% local, sem upstream) |
| HEAD de trabalho | `d04eefe` (antes dos commits de docs desta preparação) |
| Commits de trabalho | 24 |
| vs `origin/main` | **24 à frente · 6 atrás** (divergiu — ver §3) |
| Working tree | limpa após esta preparação |
| Push | **EXCLUSIVO do @devops** |

## 2. O que vai subir

Fase 5.6–5.7 (gráficos de relatório, animações com `reduced motion`), Fase 6.1–6.6
(empty states ilustrados, card variants/gradiente, timestamps relativos, modal de
confirmação, dark mode), Fase 3 parcial + 3t (Telegram: canal, webhook, vínculo por
`/start`, tela de settings, unlink + identidade no `/auth/me`), ADR-0003 (Telegram no
lugar do WhatsApp; sem e-mail; sync manual), fix `db:prepare`.

## 3. Divergência (o handoff anterior não registrou)

A branch foi cortada em `760e774` ("docs: update sprint tracking - Story 5.5 DONE").
Depois disso o `origin/main` avançou **6 commits** — as Fases 10.1/10.2/10.3 já
mergeadas por PR:

```
a7ba808 Merge PR #5  feature/10.3-limits-admin-dashboard
430a261 Merge PR #4  feature/10.2-pluggy-integration
8ff52ab Merge PR #3  feature/10.1-open-finance-foundation
f43ea06 feat: Limits, Plans & Admin Health Dashboard (10.3)
591e0cb feat: Pluggy Integration — Connect Widget, Webhooks & Sync (10.2)
859d70e feat: Open Finance Foundation (10.1)
```

**Não é fast-forward.** A branch não contém o trabalho Pluggy do main.

## 4. Conflitos de merge (medido com `git merge-tree`)

Interseção de arquivos tocados dos dois lados: **apenas 2**. Todo o resto é disjunto.

| Arquivo | Situação | Ação |
|---|---|---|
| `backend/api_divida_zero/config/routes.rb` | 🔴 CONFLITO de conteúdo | Juntar as rotas dos dois lados (telegram + financial/pluggy) |
| `backend/api_divida_zero/app/models/user.rb` | 🟢 auto-merge limpo | Manter associações dos dois lados (telegram + financial) |
| `backend/api_divida_zero/db/schema.rb` | ⚠️ stale (não é conflito) | **Regenerar após o merge** (`rails db:migrate` + `db:schema:dump`) — a branch o modificou, o main não |

## 5. Decisão de produto (dono — NÃO reabrir)

- Telegram no lugar do WhatsApp; sem e-mail/SMTP; sync congelado no manual OFX/CSV (ADR-0003).
- **Pluggy: gatear OFF** via `feature_flag` (já existe no `main`). Manual OFX/CSV continua ativo.
  → **Follow-up pós-merge:** garantir que o auto-sync Pluggy está desligado em runtime.

## 6. Revisão de segredos (limpa)

Nenhum token/credencial no diff. `.env*` e `config/master.key` gitignorados;
`credentials.yml.enc` cifrado; `.kamal/secrets` é template; os únicos "secrets"
encontrados são fixtures de teste (`senha1234`, `123:abc`).

## 7. O que o @devops deve fazer

Recomendado:

1. `git fetch origin`
2. Rebase de `feat/fase-5-seguranca` sobre `origin/main` (ou merge); resolver `routes.rb`
   juntando os dois conjuntos de rotas.
3. Regerar `db/schema.rb` (ver §4).
4. Suíte backend **1 arquivo por vez** (segfault em paralelo).
5. `git push -u origin feat/fase-5-seguranca` + abrir PR.

NÃO fazer:

- Force-push.
- Merge direto em `main` sem PR.
- Deletar `feature/10.4-migration-cleanup` (guarda os docs da Fase 4b0).

## 8. Armadilhas conhecidas

`db:prepare` (não `db:schema:load`) · `config.hosts` já tem `api.dividazeropa.sbs` ·
webhook em `/api/v1/telegram/webhook` · suíte em paralelo segfaulta · `rails runner`
inline quebra no PowerShell (usar script em `tmp/`).
