# Checklist Manual Android - Tutorial Geral (Mobile)

Objetivo: validar onboarding e tutorial geral hibrido (`overlay + guia`) em cenarios criticos de banca.

## Ambiente
- Build instalada em dispositivo Android real.
- Backend disponivel e usuario de teste ficticio valido.
- Limpar dados do app antes de cada fluxo completo.

## Matriz de dispositivo
- Compacto (<= 360dp)
- Padrao (361dp a 411dp)
- Grande (>= 412dp)

## Matriz de acessibilidade
- Tema claro e escuro
- Fonte padrao e texto grande
- Alvos de toque padrao e ampliados (quando configurado)

## Fluxo 1 - Iniciante (trilha geral critica)
1. Abrir app e selecionar `Modo iniciante (com tutorial)`.
2. Confirmar passo a passo: `Inicio -> Calendario -> Historico do mes -> Lancamentos -> Metas -> Relatorios -> Perfil`.
3. Validar foco do spotlight no alvo correto em cada etapa.
4. Validar fallback textual quando alvo nao estiver disponivel (sem travar fluxo).
5. Concluir tutorial e confirmar retorno normal ao app.

Criterio de aprovacao:
- Sem crash, sem bloqueio de navegacao e sem highlight deslocado de forma critica.

## Fluxo 2 - Avancado (guia rapido, sem spotlight)
1. Abrir app limpo e escolher `Modo avancado (sem tutorial)`.
2. Visualizar guia rapido.
3. Tocar `Entrar no app`.
4. Confirmar que nao inicia overlay/spotlight automatico.

Criterio de aprovacao:
- Entrada direta no app sem bloqueio e com guia rapido exibido uma unica vez.

## Fluxo 3 - Pular + recuperacao contextual
1. Abrir app limpo e escolher `Pular por enquanto`.
2. Confirmar uso normal das telas sem overlay.
3. Em `Inicio`, `Metas`, `Relatorios` e `Perfil`, abrir atalho `Ver guia rapido` ou `Como usar esta tela`.
4. Em `Configuracoes`, usar `Ver tutorial novamente`.
5. Confirmar reabertura da trilha essencial.

Criterio de aprovacao:
- Usuario reencontra ajuda em ate 2 toques.

## Fluxo 4 - Primeiro sucesso (exibicao unica)
1. Garantir `first_success_milestone_done=false` (app limpo).
2. Acionar um dos gatilhos:
   - primeiro lancamento criado, ou
   - primeira meta criada, ou
   - primeira visualizacao util em relatorios com registros.
3. Validar mensagem de primeiro sucesso.
4. Fechar e reabrir app.
5. Repetir acao e confirmar que a mensagem nao reaparece.

Criterio de aprovacao:
- Feedback exibido apenas uma vez por usuario.

## Regressao rapida
- Auth (login/cadastro) continua funcional.
- Cadastro de lancamento continua funcional.
- Metas continuam com criacao/edicao.
- Relatorios continuam com filtros e periodo.
- Perfil e Configuracoes continuam sem regressao.

## Evidencias para banca
- Captura por etapa do fluxo iniciante.
- Captura do guia rapido no fluxo avancado.
- Captura de reabertura por Configuracoes.
- Captura do primeiro sucesso e da nao repeticao.
- Registro de defeitos (id, severidade, status, evidencias).
