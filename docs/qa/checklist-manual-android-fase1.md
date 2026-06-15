# Checklist Manual Android - QA (Fase 1 sem IA)

## Objetivo
Validar estabilidade da entrega Fase 1 com IA oculta no mobile, sem regressão nos fluxos principais.

## Ambiente
- Build Android instalada (Dev Build ou APK de teste)
- API disponível e autenticável
- Conta de teste válida
- Testar em modo claro e modo escuro
- Testar com tamanho de texto normal e grande

## Fluxo 1 - Autenticação
1. Abrir app e realizar login com credenciais válidas.
2. Validar navegação para Home sem travamentos.
3. Realizar logout e novo login.
4. Validar mensagens de erro de login inválido (somente bloco inline, sem popup duplicado).

## Fluxo 2 - Home
1. Verificar card "Próxima ação recomendada" (hierarquia e contraste).
2. Verificar card "Mensagem de hoje" (conteúdo presente).
3. Reabrir o app no mesmo dia e confirmar mesma mensagem do dia.
4. Verificar ausência de rótulos/controles de IA.
5. Abrir notificações pelo ícone e validar leitura/listagem sem erro.

## Fluxo 3 - Lançamentos
1. Abrir tela de lançamento (ganho e dívida).
2. Tentar salvar sem valor e validar erro inline no formulário.
3. Preencher dados válidos e salvar com sucesso.
4. Validar criação de registro e retorno visual esperado.
5. Confirmar ausência do botão/sugestão de IA.

## Fluxo 4 - Relatórios
1. Abrir Relatórios e validar carregamento inicial.
2. Aplicar filtros de status, tipo e categoria.
3. Validar exibição de "Filtros ativos".
4. Forçar cenário sem dados e validar CTA de reset/atualização.
5. Forçar cenário de erro de rede e validar CTA único para recuperar.
6. Confirmar ausência de cards/selos de IA.

## Fluxo 5 - Configurações
1. Abrir Configurações do app.
2. Validar ausência de toggle "Assistente IA".
3. Alterar tema e tamanho de texto, validar persistência.
4. Validar "Botões maiores" ligado/desligado.

## Fluxo 6 - Notificações
1. Abrir configurações de notificações.
2. Validar permissões e toggles principais (hoje, amanhã, semanal).
3. Desativar notificações e validar desligamento em cascata.
4. Reativar notificações e validar comportamento esperado.
5. Validar ausência de opção de mensagem diária IA na UI.

## Fluxo 7 - Tutorial adaptativo (trilha única)
1. Em onboarding, validar entrada no modo "tutorial adaptativo" (sem escolha iniciante/avançado).
2. Validar etapa essencial em dispositivo compacto, padrão e grande.
3. Validar fallback de layout quando alvo não puder ser medido (card com CTA de navegação).
4. Concluir etapa essencial e validar transição para missões contextuais.
5. Concluir ao menos 2 missões reais (criar lançamento, abrir relatórios ou criar meta).
6. Validar pausa e retomada do tutorial em Configurações.
7. Validar conclusão final da trilha sem travar navegação.

## Acessibilidade
1. Verificar contraste mínimo aceitável em textos e botões (claro/escuro).
2. Validar alvos de toque em ações principais (>= 44dp).
3. Validar labels de acessibilidade nos botões críticos (notificações, período, ações principais).

## Critérios de aprovação
- Nenhuma menção visual de IA nas telas principais.
- Nenhum crash/travamento nos fluxos Auth -> Home -> Lançamentos -> Relatórios -> Configurações -> Notificações.
- Validação inline de formulário funcionando em Lançamentos.
- Estados de vazio/erro de Relatórios com recuperação funcional.
- Tema e acessibilidade sem regressões evidentes.

## Evidências QA
- Capturas de tela: Home, Lançamentos (erro inline), Relatórios (filtros ativos), Configurações, Notificações.
- Vídeo curto opcional do fluxo completo.
- Log de defeitos com severidade (Bloqueador, Alto, Médio, Baixo).
- Registro consolidado: `docs/qa/evidencias-android-fase1.md`.
