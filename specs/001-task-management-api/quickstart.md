# Quickstart: Task Management API

## Pré-requisitos

- Node.js 20 LTS
- PostgreSQL 16+
- npm 10+

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskapi
JWT_ACCESS_SECRET=<segredo-forte-aleatorio>
JWT_REFRESH_SECRET=<segredo-forte-diferente>
PORT=3000
```

## Banco de dados

```bash
# Criar banco
createdb taskapi

# Rodar migrations (em ordem)
psql $DATABASE_URL -f src/db/migrations/001_users.sql
psql $DATABASE_URL -f src/db/migrations/002_tasks.sql
psql $DATABASE_URL -f src/db/migrations/003_tags.sql
psql $DATABASE_URL -f src/db/migrations/004_refresh_tokens.sql
```

## Desenvolvimento

```bash
npm run dev        # hot-reload com tsx
```

## Produção

```bash
npm run build      # compila TypeScript → dist/
npm start          # inicia a partir de dist/
```

## Testes

```bash
npm test           # todos os testes com cobertura
npm run test:unit  # apenas unitários
npm run test:integration  # requer banco configurado
```

A cobertura mínima de 80% é verificada automaticamente. O build falha se ficar abaixo.

## Validação manual

```bash
# Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'

# Criar tarefa (substituir <token> pelo accessToken retornado)
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Primeira tarefa","priority":"alta"}'
```
