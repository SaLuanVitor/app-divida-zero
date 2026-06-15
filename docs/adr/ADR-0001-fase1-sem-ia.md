# ADR-0001: IA desativada na Fase 1

## Status
Aceito

## Contexto
Para a primeira entrega do App Divida Zero, o objetivo principal e estabilidade funcional e clareza da experiencia.
Integracao de IA completa nao cabe no prazo desta fase e adiciona risco de regressao em fluxos criticos.

## Decisao
- Manter backend de IA preservado (rotas e servicos sem remocao estrutural).
- Ocultar recursos de IA da interface mobile na Fase 1.
- Bloquear chamadas mobile para IA via modo central de fase:
  - `EXPO_PUBLIC_PHASE_1_MODE=true` por padrao
  - com esse modo ativo: IA desabilitada em UI e chamadas mobile
- Preservar compatibilidade de preferencias legadas:
  - `ai_assistant_enabled`
  - `notify_daily_ai_message`

## Consequencias
Positivas:
- menor risco de regressao em autenticacao, lancamentos, relatorios e notificacoes
- entrega mais previsivel para avaliacao da fase 1
- reativacao futura simplificada sem migracoes destrutivas

Trade-offs:
- funcionalidades inteligentes ficam indisponiveis nesta fase
- manutencao temporaria de chaves legadas inativas

## Plano de Reativacao
1. Definir `EXPO_PUBLIC_PHASE_1_MODE=false`.
2. Reativar gradualmente superficies de IA no mobile.
3. Rodar bateria de testes automatizados e checklist manual Android.
4. Revisar copy/UX antes de liberar em producao.
