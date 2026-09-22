# Telegram Bot API — Custo, limites e migração a partir do WhatsApp

**Data:** 2026-09
**Decisão:** `docs/adr/ADR-0003-telegram-sem-whatsapp-sem-email.md`
**Contexto:** o canal de notificação migra de WhatsApp (pago/regulado) para Telegram (gratuito).

## Custo

- Criar um bot (via @BotFather) e usar a Bot API é **gratuito**. A FAQ oficial declara que bots
  "mandam mensagens aos usuários **sem custo**".
- Broadcast pago é opcional e irrelevante neste porte: 1000 msg/s a 0,1 Telegram Star/mensagem, exigindo
  saldo mínimo de 100.000 Stars e 100.000 usuários ativos mensais.

## Limites de envio (FAQ oficial)

| Cenário | Limite |
|---------|--------|
| Chat individual (1:1) | ~1 msg/segundo (rajadas curtas toleradas; depois disso, 429) |
| Grupo | 20 msg/minuto |
| Broadcast em massa | ~30 msg/segundo |

## Onboarding do usuário

- O bot **não inicia conversa** do zero. O usuário precisa abrir o chat e apertar **Start** (`/start`).
- Vínculo de conta via deep link: `https://t.me/<bot_username>?start=<payload>` (payload de até 64 chars,
  serve de token/identificação do usuário).

## Templates / mensagens

- **Não há** sistema de templates aprovados (HSM) como no WhatsApp. Após o `/start`, a mensagem é **livre**
  (MarkdownV2/HTML ou Rich Messages), sem aprovação prévia.

## Comparação WhatsApp × Telegram (notificação transacional)

| Critério | WhatsApp Cloud API | Telegram Bot API |
|----------|--------------------|------------------|
| Custo | por conversa (categoria marketing/utility/etc.) | gratuito |
| Verificação Business | exigida | não existe |
| Templates HSM | exigidos para mensagem business-initiated | não existem (mensagem livre) |
| Onboarding | opt-in via número + verificação | instalar app + `/start` via deep link |
| Conformidade | gate comercial/legal da Meta | LGPD do próprio app |

## Sync bancário gratuito — confirmação

- O único caminho gratuito real é a **importação manual OFX/CSV** (já implementada na FASE 4a).
- O Conector 200 (MeuPluggy) é gratuito mas restrito a **5 conexões do mesmo titular** e uso pessoal;
  produto multi-usuário exige o plano **Dados** (a partir de R$ 2.500/mês).
- Belvo e Celcoin são pagas/comerciais; os MCPs open source (`douglac/banco-mcp`,
  `brunovicco/openfinance-br-mcp`) são clientes sobre a API paga da provedora.
- **Conclusão:** não existe sincronização automática verdadeiramente gratuita e multi-usuário no Brasil hoje.

## Fontes

- https://core.telegram.org/bots/faq
- https://core.telegram.org/bots/features#start-command
- https://core.telegram.org/bots/features#deep-linking
- https://core.telegram.org/bots/features#messages-and-formatting
- https://www.pluggy.ai/meu-pluggy
- https://www.pluggy.ai/precos
- https://developers.facebook.com/docs/whatsapp/pricing (modelo de precificação; cifras exatas não verificadas)
- https://www.belvo.com (preço não publicado em tabela aberta)
- https://www.celcoin.com.br/open-finance/financial-data/
