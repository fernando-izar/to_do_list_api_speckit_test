# Tasks: Task Management API

**Input**: Design documents from `specs/001-task-management-api/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/api.md ✅, research.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story correspondente (US1, US2, US3, US4)
- Caminhos de arquivo incluídos em todas as tarefas

---

## Phase 1: Setup

**Purpose**: Inicialização do projeto TypeScript/Node.js e configuração de ferramentas

- [x] T001 Inicializar package.json com dependências: express, pg, jsonwebtoken, bcryptjs, express-rate-limit; dev: typescript, ts-jest, @types/express @types/pg @types/jsonwebtoken @types/bcryptjs, tsx, supertest, @types/supertest em package.json
- [x] T00X [P] Configurar TypeScript com strict mode, target ES2022, module commonjs em tsconfig.json
- [x] T00X [P] Configurar Jest com ts-jest e coverageThreshold de 80% para branches/functions/lines/statements em jest.config.ts
- [x] T00X [P] Criar arquivo de exemplo de variáveis de ambiente com DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PORT em .env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura compartilhada que DEVE estar completa antes de qualquer user story

**⚠️ CRÍTICO**: Nenhuma user story pode começar até esta fase estar completa

- [x] T00X Criar módulo de pool de conexão PostgreSQL com pg.Pool lendo DATABASE_URL do env em src/db/client.ts
- [x] T00X [P] Criar migration SQL para tabela users com pgcrypto extension em src/db/migrations/001_users.sql
- [x] T00X [P] Criar migration SQL com enums task_status/task_priority, tabela tasks e índices em src/db/migrations/002_tasks.sql
- [x] T00X [P] Criar migration SQL para tabelas tags e task_tags (junction com PK composta) em src/db/migrations/003_tags.sql
- [x] T00X [P] Criar migration SQL para tabela refresh_tokens com índices em src/db/migrations/004_refresh_tokens.sql
- [x] T01X [P] Implementar middleware de validação JWT que lê header Authorization, valida access token e anexa userId ao request em src/middleware/auth.middleware.ts
- [x] T01X [P] Configurar rate limiting com express-rate-limit: max 10 req por IP em janela de 15 minutos, resposta 429 com header Retry-After em src/middleware/rate-limit.ts
- [x] T01X Criar handler global de erros HTTP que formata erros como `{ error: string }` em src/middleware/error-handler.ts
- [x] T01X Configurar app Express com JSON parser, espaço reservado para registro de rotas e error handler em src/app.ts
- [x] T01X Criar entry point do servidor lendo PORT do env e iniciando listener em src/server.ts

**Checkpoint**: Infraestrutura pronta — implementação das user stories pode começar em paralelo

---

## Phase 3: User Story 1 — Autenticação (Priority: P1) 🎯 MVP

**Goal**: Usuários podem se registrar, fazer login e renovar tokens JWT com rotação de refresh tokens

**Independent Test**: Registrar um usuário via POST /auth/register → fazer login via POST /auth/login → usar o access token em GET /tasks → verificar 200; usar refresh token em POST /auth/refresh → verificar novo par de tokens; tentar com token inválido → verificar 401

### Implementação — User Story 1

- [x] T01X [P] [US1] Definir tipos TypeScript AuthPayload, TokenPair, RegisterInput, LoginInput em src/auth/auth.types.ts
- [x] T01X [US1] Implementar auth service com funções: hashPassword (bcryptjs fator 12), validatePassword, generateTokenPair (access JWT 1h + refresh token opaco 7d armazenado com hash SHA-256), register (valida e-mail único, política de senha 8+ chars com letra+número), login, refreshTokens (rotação: revogar token atual, emitir novo par) usando pool do src/db/client.ts em src/auth/auth.service.ts
- [x] T01X [US1] Implementar auth routes: POST /auth/register (rate limiter + registro), POST /auth/login (rate limiter + autenticação), POST /auth/refresh (renovação com rotação) em src/auth/auth.routes.ts
- [x] T01X [US1] Montar auth router em /api/auth no app Express em src/app.ts

**Checkpoint**: US1 completa — registro, login e refresh de tokens funcionando independentemente

---

## Phase 4: User Story 2 — Gerenciamento de Tarefas CRUD (Priority: P1) 🎯 MVP

**Goal**: Usuários autenticados podem criar, listar, visualizar, atualizar e deletar suas tarefas com isolamento total entre usuários

**Independent Test**: Com token válido: POST /tasks com título → verificar 201 com id; GET /tasks → verificar apenas tarefas do usuário; PUT /tasks/:id → verificar atualização; DELETE /tasks/:id → verificar 204; tentar acessar tarefa de outro usuário → verificar 404

### Implementação — User Story 2

- [x] T01X [P] [US2] Definir tipos TypeScript Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput em src/tasks/task.types.ts
- [x] T02X [US2] Implementar task service com funções: createTask (valida título não vazio, defaults status=pendente/priority=media), getTask (WHERE id=$1 AND user_id=$2), listTasks (filtra por user_id, inclui JOIN com task_tags para array de tags), updateTask (aceita campos parciais, valida enums), deleteTask — todas usando pool do src/db/client.ts em src/tasks/task.service.ts
- [x] T02X [US2] Implementar task routes com auth middleware: GET /tasks, POST /tasks, GET /tasks/:id, PUT /tasks/:id, DELETE /tasks/:id em src/tasks/task.routes.ts
- [x] T02X [US2] Montar task router em /api com auth middleware no app Express em src/app.ts

**Checkpoint**: US1 + US2 completas — MVP funcional com auth e CRUD de tarefas

---

## Phase 5: User Story 3 — Categorização por Tags (Priority: P2)

**Goal**: Usuários autenticados podem criar tags pessoais e associá-las a tarefas com operação idempotente

**Independent Test**: POST /tags com nome → verificar 201; GET /tags → verificar lista; POST /tasks/:id/tags/:tagId → verificar 200; chamar novamente → verificar 200 sem duplicata; GET /tasks/:id → verificar tags no response; DELETE /tasks/:id/tags/:tagId → verificar desassociação

### Implementação — User Story 3

- [x] T02X [P] [US3] Definir tipos TypeScript Tag, CreateTagInput em src/tags/tag.types.ts
- [x] T02X [US3] Implementar tag service com funções: createTag (valida nome único por usuário, retorna 409 se duplicado), listTags (WHERE user_id=$1), deleteTag (verifica ownership), addTagToTask (valida que task.user_id == tag.user_id; usa INSERT INTO task_tags ON CONFLICT DO NOTHING para idempotência), removeTagFromTask em src/tags/tag.service.ts
- [x] T02X [US3] Implementar tag routes com auth middleware: GET /tags, POST /tags, DELETE /tags/:id, POST /tasks/:taskId/tags/:tagId, DELETE /tasks/:taskId/tags/:tagId em src/tags/tag.routes.ts
- [x] T02X [US3] Montar tag router em /api com auth middleware no app Express em src/app.ts
- [x] T02X [US3] Atualizar funções listTasks e getTask em src/tasks/task.service.ts para incluir JOIN com task_tags e retornar array tags em cada objeto Task na resposta

**Checkpoint**: US1 + US2 + US3 completas — tarefas com categorização por tags funcionando

---

## Phase 6: User Story 4 — Filtros por Status e Prioridade (Priority: P2)

**Goal**: Usuários autenticados podem filtrar sua lista de tarefas por status e/ou prioridade, combinando os filtros

**Independent Test**: Criar tarefas com status/prioridades variados; GET /tasks?status=concluida → apenas concluídas; GET /tasks?priority=alta → apenas alta; GET /tasks?status=pendente&priority=alta → interseção; GET /tasks?status=invalido → 400

### Implementação — User Story 4

- [x] T02X [US4] Estender função listTasks em src/tasks/task.service.ts para aceitar parâmetros opcionais status e priority, construindo cláusula WHERE dinâmica com queries parametrizadas (nunca interpolação de string)
- [x] T02X [US4] Estender rota GET /tasks em src/tasks/task.routes.ts para ler query params status e priority, validar contra enums permitidos (400 se inválido) e passar para o service

**Checkpoint**: Todas as user stories completas — produto totalmente funcional

---

## Phase Final: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade, conformidade com a constituição e validação final

- [x] T03X [P] Adicionar JSDoc a todas as funções exportadas em src/auth/auth.service.ts, src/tasks/task.service.ts e src/tags/tag.service.ts (parâmetros, retorno, propósito)
- [x] T03X [P] Verificar que todos os arquivos em src/ têm ≤ 300 linhas; refatorar em módulos menores se necessário
- [x] T03X Executar smoke test do quickstart.md: iniciar servidor, registrar usuário, criar tarefa, aplicar filtro, verificar respostas — documentar resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as user stories
- **US1 (Phase 3)**: Depende do Foundational — sem dependência de outras stories
- **US2 (Phase 4)**: Depende do Foundational — sem dependência de outras stories
- **US3 (Phase 5)**: Depende de US2 estar completa (T027 modifica task.service.ts)
- **US4 (Phase 6)**: Depende de US2 estar completa (estende listTasks)
- **Polish (Phase Final)**: Depende de todas as stories desejadas estarem completas

### User Story Dependencies

- **US1**: Pode começar após Foundational — independente
- **US2**: Pode começar após Foundational — independente de US1
- **US3**: Pode começar após US2 estar completa (precisa de tasks existindo; T027 modifica task.service.ts)
- **US4**: Pode começar após US2 estar completa (estende listTasks)

### Within Each User Story

- Types antes de service (T015 → T016, T019 → T020, T023 → T024)
- Service antes de routes
- Routes antes de montagem no app.ts
- T027 (tags em task responses) DEVE vir após T020 (task service inicial)

---

## Parallel Opportunities

```bash
# Phase 1 — tudo em paralelo após T001:
T002: tsconfig.json
T003: jest.config.ts
T004: .env.example

# Phase 2 — migrations em paralelo após T005:
T006: 001_users.sql
T007: 002_tasks.sql
T008: 003_tags.sql
T009: 004_refresh_tokens.sql
T010: auth.middleware.ts
T011: rate-limit.ts

# Após Foundational — US1 e US2 em paralelo:
[Developer A] US1: T015 → T016 → T017 → T018
[Developer B] US2: T019 → T020 → T021 → T022

# Após US2 — US3 e US4 em paralelo:
[Developer A] US3: T023 → T024 → T025 → T026 → T027
[Developer B] US4: T028 → T029
```

---

## Implementation Strategy

### MVP First (US1 + US2 — Authentication + Task CRUD)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRÍTICO — bloqueia tudo)
3. Complete Phase 3: US1 — Authentication
4. Complete Phase 4: US2 — Task CRUD
5. **STOP e VALIDE**: testar auth + CRUD independentemente
6. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 (Auth) → testar independentemente → MVP parcial
3. US2 (Tasks CRUD) → testar independentemente → **MVP completo e demonstrável**
4. US3 (Tags) → testar independentemente → produto enriquecido
5. US4 (Filters) → testar independentemente → produto completo
6. Polish → produto pronto para produção

---

## Notes

- `[P]` = arquivos diferentes, sem dependências entre si
- Nunca interpolar input do usuário em queries SQL — sempre usar parâmetros `$1, $2, ...`
- `ON CONFLICT DO NOTHING` em task_tags garante idempotência de associação (T024)
- Cobertura mínima de 80% é verificada automaticamente no `npm test` via jest.config.ts (T003)
- Verificar que cada user story funciona independentemente antes de avançar para a próxima
