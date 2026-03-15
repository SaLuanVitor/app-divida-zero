# CI Checklist (Backend + Mobile)

## Quick run (local)

### Backend (Rails)
```bash
cd backend/api_divida_zero
bin/rails db:prepare
bin/rails test
```

### Mobile (Typecheck + Jest)
```bash
cd mobile
npm ci
npx tsc --noEmit
npm run test -- --runInBand
```

## What CI runs on GitHub

- `backend` job:
  - `bin/rails db:prepare`
  - `bin/rails test`
- `mobile` job:
  - `npm ci`
  - `npx tsc --noEmit`
  - `npm run test -- --runInBand`

## Troubleshooting notes

- If Jest fails with React Native navigation/gesture errors:
  - check `mobile/jest.setup.ts` mocks.
- If local Node command fails with permission errors on Windows:
  - run terminal as admin or ensure user has permission on the project directory.
- If Rails test DB fails:
  - rerun `bin/rails db:prepare`.

