# Implementation Plan: Task Management API

**Branch**: `001-task-management-api` | **Date**: 2026-04-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-task-management-api/spec.md`

## Summary

API REST de gerenciamento de tarefas pessoais com autenticação JWT (access token 1h + refresh token 7 dias com rotação), CRUD completo de tarefas, categorização por tags e filtros por status/prioridade. Implementada em TypeScript/Node.js com Express, PostgreSQL via SQL direto, Jest para testes com cobertura mínima de 80%.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: Express 4.x, pg (node-postgres), jsonwebtoken, bcryptjs, express-rate-limit, tsx (dev)
**Storage**: PostgreSQL 16 — SQL direto, sem ORM
**Testing**: Jest + ts-jest + supertest
**Target Platform**: Linux server (Node.js runtime)
**Project Type**: web-service (REST API)
**Performance Goals**: Resposta em < 2s para listas de até 500 tarefas; login/registro em < 5s
**Constraints**: Sem ORM; max 300 linhas/arquivo; funções sobre classes; 80% cobertura de testes
**Scale/Scope**: Single-server v1; sem paginação; sem multi-tenancy avançado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Estilo de Código

- [x] TypeScript obrigatório — toda codebase em `.ts`; `strict: true` no tsconfig
- [x] JSDoc em todas as funções — requerido na implementação e revisão
- [x] Funções sobre classes — serviços como módulos de funções exportadas, sem classes
- [x] Máx 300 linhas/arquivo — estrutura granular por domínio garante compliance

### II. Testes

- [x] Cada função com pelo menos um teste — gate de cobertura 80% + contrato por função
- [x] Framework Jest — `jest.config.ts` com `ts-jest`; `supertest` para endpoints
- [x] Cobertura mínima 80% — `coverageThreshold` no `jest.config.ts` bloqueia CI se abaixo

### III. Arquitetura

- [x] Lógica de negócio separada da UI — `*.service.ts` contém domínio; `*.routes.ts` apenas HTTP
- [x] SQL direto, sem ORM — driver `pg` com queries parametrizadas; zero ORM instalado
- [x] Sem dependências circulares — fluxo unidirecional: `routes → services → db/client`
- [x] API RESTful com JSON — Express com `res.json()`; contratos documentados em `contracts/api.md`

**Gate: PASS** — Nenhuma violação detectada. Re-verificado após Phase 1 design: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-management-api/
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões técnicas
├── data-model.md        # Fase 1: schema SQL e entidades
├── quickstart.md        # Fase 1: como rodar localmente
├── contracts/
│   └── api.md           # Fase 1: contratos REST completos
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── client.ts                    # Pool de conexão PostgreSQL (pg.Pool)
│   └── migrations/
│       ├── 001_users.sql
│       ├── 002_tasks.sql
│       ├── 003_tags.sql
│       └── 004_refresh_tokens.sql
├── auth/
│   ├── auth.service.ts              # registro, login, refresh, validação JWT
│   ├── auth.routes.ts               # POST /auth/register|login|refresh
│   └── auth.types.ts                # AuthPayload, TokenPair
├── tasks/
│   ├── task.service.ts              # CRUD + filtros por status/prioridade
│   ├── task.routes.ts               # GET|POST /tasks, GET|PUT|DELETE /tasks/:id
│   └── task.types.ts                # Task, TaskStatus, TaskPriority
├── tags/
│   ├── tag.service.ts               # CRUD de tags + associação/desassociação
│   ├── tag.routes.ts                # GET|POST /tags, DELETE /tags/:id
│   │                                # POST|DELETE /tasks/:id/tags/:tagId
│   └── tag.types.ts                 # Tag
├── middleware/
│   ├── auth.middleware.ts           # Validação de access token JWT
│   ├── rate-limit.ts                # express-rate-limit para /auth/*
│   └── error-handler.ts            # Handler global de erros HTTP
└── app.ts                           # Configuração do Express, registro de rotas

tests/
├── contract/                        # Testes de contrato via supertest (banco real)
├── integration/                     # Testes de fluxo completo (banco real)
└── unit/                            # Testes unitários (serviços com pg mock)

jest.config.ts
tsconfig.json
package.json
.env.example
```

**Structure Decision**: Web service com separação por domínio (auth, tasks, tags). Cada domínio tem `service` (lógica de negócio), `routes` (HTTP binding) e `types` (TypeScript). A camada `db/` é compartilhada e contém apenas o pool e migrations. Fluxo unidirecional garante ausência de dependências circulares: `routes → services → db/client`. Sem frontend nesta versão.

## Complexity Tracking

> Nenhuma violação da constituição identificada. Tabela vazia.
