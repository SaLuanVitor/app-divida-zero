---
name: tcc-android-guardrails
description: Aplicar guardrails do TCC no projeto App Divida Zero para manter privacidade, dados ficticios e consistencia Android. Use quando criar ou revisar telas, fluxos, copy, mock data, testes, contratos de API e historias que envolvam perfil, cadastros, preferencias, transacoes ou qualquer dado de usuario.
---

# TCC Android Guardrails

## Overview

Aplicar regras obrigatorias para o projeto academico: nao usar dados sensiveis, nao usar dados de pessoas reais e seguir padrao Android no mobile.
Executar este checklist antes de propor implementacao, textos de interface, exemplos, seeds e testes.

## Checklist Obrigatorio

1. Classificar os dados envolvidos na tarefa.
2. Bloquear qualquer dado sensivel ou identificavel de pessoa real.
3. Substituir exemplos por dados ficticios de usuario.
4. Ajustar UI/UX e componentes para padrao Android.
5. Entregar com um resumo curto de conformidade.

## Regras de Dados para TCC

Aplicar sempre as regras abaixo:

- Usar apenas dados de usuario declarados para o app (ex.: apelido, meta financeira, valor de lancamento, categoria, preferencias de notificacao).
- Tratar nome completo, CPF, RG, data de nascimento completa, telefone real, endereco completo, email real, geolocalizacao precisa e biometria como proibidos em exemplos e mocks.
- Anonimizar ou generalizar qualquer dado real encontrado em contexto de entrada.
- Usar identidades ficticias e sinteticas para seeds, snapshots e documentacao.
- Evitar linguagem que pareca relatar dados de uma pessoa existente.

Quando existir duvida sobre um campo, assumir "dado sensivel" e pedir alternativa nao sensivel.

## Padronizacao Android (Mobile)

Para tela, componente e fluxo mobile:

- Priorizar navegacao e comportamentos esperados no Android (back navigation clara, feedback visual imediato e estados de toque consistentes).
- Usar nomenclatura e microcopy objetiva, curta e acionavel.
- Garantir alvos de toque confortaveis e hierarquia visual clara.
- Preservar padroes existentes do projeto em React Native/Expo (estrutura de navegacao, tema e componentes ja adotados).
- Evitar solucoes pensadas primeiro para iOS quando houver conflito com experiencia Android.

Consultar [references/tcc-constraints.md](references/tcc-constraints.md) para exemplos permitidos e proibidos.

## Formato de Saida

Ao concluir uma tarefa com esta skill, incluir um bloco curto:

`Conformidade TCC`
- `Dados sensiveis`: nao usados
- `Dados reais`: nao usados
- `Padrao Android`: aplicado

## Recursos

Ler [references/tcc-constraints.md](references/tcc-constraints.md) sempre que a tarefa envolver:
- modelagem de dados
- cadastro/perfil/autenticacao
- exemplos de payloads, seeds e fixtures
- texto de tela e mensageria de UX
