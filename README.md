# App Divida Zero - Guia de Ambiente Local

Este guia centraliza os comandos para:

- iniciar o projeto
- resetar o ambiente para novas configuracoes
- validar se API e mobile estao conectando

## Fase 1 sem IA

Status atual desta entrega:
- recursos de IA ocultos na interface mobile
- chamadas mobile para endpoints de IA bloqueadas por modo de fase
- backend com endpoints de IA preservado para reativacao futura

Limitacoes esperadas:
- preferencias `ai_assistant_enabled` e `notify_daily_ai_message` permanecem por compatibilidade, mas estao inativas na fase 1
- a mensagem do dia na Home usa catalogo local rotativo

Criterio de reativacao:
- definir `EXPO_PUBLIC_PHASE_1_MODE=false`
- revalidar UX, notificacoes e testes automatizados antes de liberar em producao

## Pre-requisitos

- Docker Desktop ativo
- Node.js + npm instalados
- Emulador Android (ou device fisico na mesma rede)

## 1) Iniciar projeto (fluxo padrao)

No terminal 1 (raiz do projeto):

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero
docker compose up --build -d
curl.exe -i http://localhost:3000/up
```

No terminal 2 (mobile):

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero\mobile
npm install
npx expo start -c --android
```

## 2) Reset completo do ambiente (para novas configuracoes)

Use quando quiser limpar banco local, containers e caches do Expo.

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero

# Derruba containers e remove volumes (zera banco local)
docker compose down -v --remove-orphans

# Limpa caches locais do mobile
Remove-Item -Recurse -Force .\mobile\.expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\mobile\node_modules -ErrorAction SilentlyContinue

# Limpa pid stale do Rails (se existir)
Remove-Item -Force .\backend\api_divida_zero\tmp\pids\server.pid -ErrorAction SilentlyContinue

# Recria arquivos de ambiente base
Copy-Item .\mobile\.env.development.example .\mobile\.env.development -Force
Copy-Item .\backend\api_divida_zero\.env.development.example .\backend\api_divida_zero\.env.development -Force

# Reinstala deps mobile
cd .\mobile
npm install
cd ..

# Sobe backend + postgres novamente
docker compose up --build -d

# Valida API
curl.exe -i http://localhost:3000/up

# Sobe Android limpando cache do Expo
cd .\mobile
npx expo start -c --android
```

## 3) Configuracao da API no Android

Emulador Android:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
```

Device fisico (mesma rede LAN):

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LAN:3000/api/v1
```

## 4) Comandos uteis

```powershell
# Ver status dos containers
docker compose ps

# Logs da API
docker compose logs api --tail 200

# Parar stack (sem apagar banco)
docker compose down

# Parar stack e apagar banco local
docker compose down -v
```

## 5) Rodar testes do backend via Docker

Para evitar erros de conexao local com PostgreSQL, rode os testes dentro do container da API:

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero
docker compose exec api bash -lc "RAILS_ENV=test bundle exec rails db:prepare && bundle exec rails test test/controllers/api/v1/auth_controller_test.rb"
```

## 6) Regra obrigatoria de charset (UTF-8)

Todo texto do projeto deve permanecer em UTF-8 (sem caracteres corrompidos, por exemplo sequencias como `Ã` e `�`).

Validar manualmente:

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero
node .\scripts\check-mojibake.js
```

Esse check tambem roda no CI e bloqueia merge se detectar quebra de charset.

## 7) Android - notificacoes (Expo Go x Dev Build)

No Android, o app suporta dois modos:

- Expo Go (mais rapido para desenvolvimento de UI): `npx expo start --android`
- Dev Build (necessario para validar recursos nativos avancados): `npx expo run:android` e depois `npx expo start --dev-client`

Se o modulo nativo de notificacoes nao estiver disponivel no ambiente atual, o app continua abrindo e mostra feedback de indisponivel nas telas de notificacao/teste manual.

### Checklist rapido para ambiente de notificacoes

No `mobile/`, rode estes comandos quando houver erro de modulo nativo:

```powershell
npx expo install --fix
npx expo doctor
```

Resultado esperado:
- Dev Build: envio manual/local de notificacoes funcionando.
- Expo Go: app estavel com aviso de limitacao do ambiente (sem crash).

Se aparecer `native_module_mismatch` ou erro de modulo nativo ausente, rode:

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero\mobile
npx expo install --fix
npx expo run:android
npx expo start --dev-client
```

## 8) Publicacao para testes externos (Railway + Cloudflare + APK)

Objetivo: permitir que outras pessoas instalem o app e usem com dados persistentes.

### 8.1 Backend (Railway)

Crie no Railway:

- 1 servico `api` (Rails, apontando para `backend/api_divida_zero`)
- 1 banco `PostgreSQL` gerenciado

Variaveis minimas no servico `api`:

```env
RAILS_ENV=production
RAILS_LOG_LEVEL=info
RAILS_MASTER_KEY=<valor de backend/api_divida_zero/config/master.key>
DATABASE_URL=<fornecida pelo Postgres do Railway>
```

Observacao importante:
- Nesta fase 1, os recursos de IA estao ocultos na experiencia do aplicativo.

Comando de start/release do servico:

```bash
bundle exec rails db:prepare && bundle exec rails server -b 0.0.0.0 -p ${PORT:-3000}
```

Validacao:

- endpoint de health deve responder: `https://<dominio-publico-railway>/up`

### 8.2 Dominio no Cloudflare

Defina o subdominio da API (exemplo):

- `api.seudominio.com`

Crie registro:

- `CNAME` `api` -> `<dominio-publico-railway>`

TLS:

- SSL/TLS: `Full (strict)`
- `Always Use HTTPS`: ligado

Validacao final:

- `https://api.seudominio.com/up`

### 8.3 Mobile para producao

No build de distribuicao, use:

```env
EXPO_PUBLIC_API_URL=https://api.seudominio.com/api/v1
```

Arquivo de referencia:

- `mobile/.env.production.example`

### 8.4 Gerar APK para distribuir

No diretorio `mobile/`:

```powershell
npx eas-cli login
npx eas-cli build:configure
npm run build:apk
npm run build:apk:download
```

O comando `build:apk:download` salva o arquivo local como `Dívida Zero.apk`.
Ele baixa o último build Android finalizado do perfil `preview`.

## 9) Pre-release checklist (Fase 1)

Antes da banca, executar:

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero
node .\scripts\check-mojibake.js
```

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero\mobile
npx tsc --noEmit
npm run test -- --runInBand
```

```powershell
cd C:\Users\luanv\Projetos\app-divida-zero
docker compose exec api bash -lc "RAILS_ENV=test bundle exec rails db:prepare && bundle exec rails test"
```

Checklist de execução manual Android (QA):

- `docs/qa/checklist-manual-android-fase1.md`

## 10) Pacote de entrega para banca

Itens recomendados:

- APK de teste instalada/validada em device real Android
- credencial fictícia de demonstração
- roteiro de demo de 5 a 7 minutos cobrindo Auth -> Home -> Lançamentos -> Relatórios -> Configurações -> Notificações
- evidências de QA (capturas por fluxo e log de defeitos)

### 8.5 Operacao segura (nao perder dados)

- Nao executar rotinas destrutivas no ambiente remoto.
- Manter backup/snapshot do Postgres no Railway habilitado.
- Em problema de deploy: fazer rollback da API e restaurar backup do banco.
