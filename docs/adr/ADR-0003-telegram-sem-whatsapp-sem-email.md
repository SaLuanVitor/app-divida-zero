# ADR-0003: Canais gratuitos — Telegram no lugar do WhatsApp, sem e-mail próprio, sync bancário congelado no manual

## Status

Aceito em 2026-09 (decisão do dono do projeto).

## Contexto

Três frentes dependiam de serviços pagos ou de etapa externa e foram reavaliadas pelo dono,
que não pode assumir custo recorrente agora:

1. O WhatsApp (Meta Cloud API) exige verificação Business e cobra por conversa, além de templates HSM
   pré-aprovados. O caminho ficou travado em etapas do lado da Meta que não se resolvem por código.
2. O e-mail real dependia de serviço SMTP próprio (Resend), com entrega ainda não confirmada e
   credencial ausente.
3. A sincronização bancária automática via agregador gratuito (Conector 200 da Pluggy) mostrou-se
   limitada a 5 conexões do mesmo titular e a uso pessoal; o plano pago (a partir de R$ 2.500/mês)
   está fora de alcance neste momento.

## Decisão

1. **Notificação transacional migra de WhatsApp para Telegram.** O WhatsApp fica abandonado como canal
   nesta fase. Fatos confirmados na documentação oficial do Telegram (https://core.telegram.org/bots/faq):
   - bot e Bot API são gratuitos ("mensagens aos usuários sem custo");
   - sem sistema de templates/HSM: mensagem livre (MarkdownV2/HTML) após o usuário iniciar;
   - limite ~1 msg/s por chat individual e ~30 msg/s em broadcast (aquém, usa-se 429 + backoff);
   - o usuário precisa apertar **Start** antes de receber a primeira mensagem proativa (vincular conta
     via deep link `https://t.me/<bot>?start=<payload>`).
   Nada de código de Telegram é implementado nesta decisão — apenas registra-se a direção; a
   implementação (`TelegramChannel` reutilizando `ApplicationChannel`) fica para uma story própria.
2. **E-mail/SMTP fica fora de escopo por ora.** Não há serviço de e-mail próprio. O código de e-mail
   existente (mailers, `EmailChannel`, rake `smtp:test`) permanece preservado por compatibilidade, sem
   remoção estrutural, seguindo o mesmo princípio do ADR-0001 para a IA.
3. **Sincronização bancária fica congelada no caminho manual gratuito** (OFX/CSV, já implementado na
   FASE 4a). Auto-sync via agregador é adiado até que haja (a) uma alternativa verdadeiramente gratuita
   e multi-usuário, ou (b) viabilidade de arcar com o plano pago. **Confirmado em fonte oficial da
   Pluggy** (https://www.pluggy.ai/meu-pluggy e https://www.pluggy.ai/precos): o Conector 200 é gratuito
   mas limitado a 5 conexões do mesmo titular e uso pessoal; produto multi-usuário exige o plano Dados
   (a partir de R$ 2.500/mês). Belvo e Celcoin também são pagas/comerciais; os MCPs open source são só
   clientes sobre a API paga da provedora. Portanto **não existe** sync automático gratuito multi-usuário
   no Brasil hoje — o manual OFX/CSV é o único caminho a custo zero.

## Consequências

Positivas:
- custo zero imediato em notificação transacional e em sincronização bancária
- desbloqueia a FASE 3 sem depender de verificação Business da Meta
- mantém o que já existe (WhatsApp, e-mail) preservado, sem migração destrutiva

Trade-offs:
- Telegram exige que o usuário tenha o app e inicie o contato com o bot (onboarding próprio do canal)
- sem e-mail transacional, o reset de senha continua sem entrega real até haver serviço próprio
- sincronização bancária automática fica pendente; o usuário segue exportando OFX/CSV manualmente

## Plano de Reativação

1. Telegram: criar story com bot, opt-in do usuário por `chat_id` e dispatch assíncrono, reutilizando a
   abstração `ApplicationChannel` existente (`TelegramChannel` como terceiro canal ao lado de
   `EmailChannel` e `PushChannel`).
2. E-mail: retomar quando houver serviço SMTP próprio; o rake `smtp:test` e os mailers já cobrem o fluxo.
3. Sincronização bancária: revisar esta decisão quando o Conector 200 (ou outro agregador) comprovar
   caminho gratuito multi-usuário na prática, ou quando o plano pago entrar no orçamento.
