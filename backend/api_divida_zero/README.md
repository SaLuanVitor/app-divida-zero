# API Divida Zero

## Fase 1 sem IA

Estado desta entrega:

- backend de IA preservado para reativação futura
- app mobile em modo de fase, sem consumo de IA na experiência do usuário
- contratos públicos atuais mantidos sem quebra

Observação:

- chaves legadas de preferências relacionadas à IA podem existir por compatibilidade, mas estão inativas na Fase 1 pelo app.

## Stack local (Docker hibrido)

Este projeto usa:

- `api` Rails em container
- `db` PostgreSQL em container
- app Android rodando fora do Docker (Expo no host)

Suba a stack na raiz do repositorio:

```bash
docker compose up --build
```

Endpoints principais:

- Healthcheck Rails: `GET http://localhost:3000/up`
- API base: `http://localhost:3000/api/v1`

## Variaveis de ambiente (backend)

As variaveis usadas para banco em `development/test`:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_TEST_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

## Producao (Railway/Postgres)

Em producao, o app usa PostgreSQL via `DATABASE_URL` (nao SQLite).

Variaveis minimas:

- `RAILS_ENV=production`
- `RAILS_MASTER_KEY`
- `RAILS_LOG_LEVEL=info`
- `DATABASE_URL`

URLs opcionais para separar conexoes:

- `DATABASE_CACHE_URL`
- `DATABASE_QUEUE_URL`
- `DATABASE_CABLE_URL`

## Android (Expo)

No emulador Android, use:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
```

Em device fisico (mesma rede LAN), use o IP da sua maquina:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LAN:3000/api/v1
```
