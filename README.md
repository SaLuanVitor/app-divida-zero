# App Divida Zero - Guia de Ambiente Local

Este guia centraliza os comandos para:

- iniciar o projeto
- resetar o ambiente para novas configuracoes
- validar se API e mobile estao conectando

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
