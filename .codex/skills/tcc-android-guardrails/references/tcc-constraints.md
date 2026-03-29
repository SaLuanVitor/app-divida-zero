# TCC Constraints Reference

## Objetivo

Definir limites de privacidade e padrao Android para tarefas do App Divida Zero.

## Dados Permitidos (Exemplos)

- `user_alias`: "usuario_023"
- `meta_valor`: 350.0
- `meta_tipo`: "quitar divida"
- `categoria_lancamento`: "alimentacao"
- `preferencia_notificacao`: true
- `mes_referencia`: "2026-03"

## Dados Proibidos (Nao Usar)

- CPF, RG, CNH, passaporte
- Endereco completo real
- Telefone real
- Email pessoal real
- Data de nascimento completa vinculada a identidade
- Geolocalizacao precisa
- Dados biometricos
- Qualquer combinacao que identifique pessoa real

## Regras de Mock e Testes

1. Gerar nomes sinteticos (ex.: "Usuario Teste 01", "Ana Exemplo").
2. Usar dominios reservados para email ficticio (ex.: `@example.com`).
3. Evitar copiar dados de capturas reais, planilhas reais ou contas reais.
4. Trocar documentos e identificadores por tokens falsos (ex.: `doc_mock_001`).
5. Revisar snapshots para remover qualquer dado pessoal antes de commitar.

## Regras de Copy e UX

1. Escrever textos neutros e orientados a acao.
2. Evitar termos que parecam expor historico pessoal real.
3. Preferir labels de usuario do app em vez de nomes civis.

## Padrao Android no Projeto

1. Priorizar fluxo de volta previsivel no cabecalho e no botao fisico/gesto.
2. Preservar hierarquia de tela: titulo, contexto, acao primaria, acoes secundarias.
3. Garantir toque confortavel em botoes e itens interativos.
4. Manter consistencia visual com componentes existentes no projeto.
5. Exibir estados de carregamento, erro e sucesso com feedback claro.

## Checklist Final de Conformidade

- `dados_sensiveis`: nao
- `dados_reais`: nao
- `dados_ficticios`: sim
- `padrao_android`: sim
