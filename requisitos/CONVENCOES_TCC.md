# Convencoes de Uso de Skills no TCC

## Skill obrigatoria para guardrails

Usar a skill `$tcc-android-guardrails` sempre que a tarefa envolver:

- telas mobile (React Native/Expo)
- textos de interface (copy/mensagens)
- payloads de API, mocks, seeds, fixtures e testes
- cadastro, perfil, preferencias ou dados de usuario

## Exemplo de invocacao

`Use $tcc-android-guardrails para revisar a tela AppSettings e garantir dados ficticios e padrao Android.`

## Check de conformidade esperado

Ao final de cada tarefa guiada por essa skill, incluir:

- `Dados sensiveis`: nao usados
- `Dados reais`: nao usados
- `Padrao Android`: aplicado
- `Charset UTF-8`: aplicado

## Checklist tecnico para telas com input (Android)

Para qualquer tela que tenha digitacao, validar antes de concluir:

- usar um unico container de rolagem na tela (evitar scroll aninhado em formulario)
- manter label e campo visiveis ao focar input com teclado aberto
- garantir que o teclado Android nao sobreponha o campo focado
- usar `keyboardShouldPersistTaps="handled"` em fluxos de formulario
- garantir que toques no conteudo do overlay/modal nao fechem o popup indevidamente
