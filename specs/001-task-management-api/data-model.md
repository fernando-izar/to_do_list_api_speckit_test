# Data Model: Task Management API

**Branch**: `001-task-management-api` | **Date**: 2026-04-25

## Entidades

### User

Identidade do sistema. Possui tarefas e tags.

| Campo | Tipo | Restrições |
|-------|------|-----------|
| id | UUID | PK, gerado automaticamente |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL (bcrypt, fator 12) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### Task

Unidade de trabalho pertencente a um usuário.

| Campo | Tipo | Restrições |
|-------|------|-----------|
| id | UUID | PK, gerado automaticamente |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| status | task_status | NOT NULL, DEFAULT 'pendente' |
| priority | task_priority | NOT NULL, DEFAULT 'media' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**Enums**:
- `task_status`: `pendente` | `em_andamento` | `concluida`
- `task_priority`: `baixa` | `media` | `alta`

**Regras de negócio**:
- Transições de status são livres (qualquer valor → qualquer valor)
- `title` não pode ser vazio (validação na camada de serviço)
- `user_id` nunca é exposto em respostas de listagem — isolamento garantido por query com `WHERE user_id = $1`

### Tag

Rótulo pessoal associável a múltiplas tarefas do mesmo usuário.

| Campo | Tipo | Restrições |
|-------|------|-----------|
| id | UUID | PK, gerado automaticamente |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Restrição**: `UNIQUE(user_id, name)` — nome de tag único por usuário.

### TaskTag (tabela de junção)

Associação N:N entre tarefas e tags do mesmo usuário.

| Campo | Tipo | Restrições |
|-------|------|-----------|
| task_id | UUID | FK → tasks(id) ON DELETE CASCADE |
| tag_id | UUID | FK → tags(id) ON DELETE CASCADE |

**PK composta**: `(task_id, tag_id)` — garante idempotência de associação.

**Regra de negócio**: A validação de que `task.user_id == tag.user_id` DEVE ser feita na camada de serviço antes do INSERT.

### RefreshToken

Controle de refresh tokens com suporte a revogação e rotação.

| Campo | Tipo | Restrições |
|-------|------|-----------|
| id | UUID | PK, gerado automaticamente |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| token_hash | VARCHAR(255) | NOT NULL (SHA-256 do token raw) |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| revoked_at | TIMESTAMPTZ | NULLABLE (NULL = ativo) |

**Regra de rotação**: ao usar um refresh token, registrar `revoked_at = NOW()` e inserir novo token antes de retornar.

## Relacionamentos

```
users ──< tasks ──< task_tags >── tags
  │                                │
  └──────────────────────────────── (user_id em ambos — isolamento)

users ──< refresh_tokens
```

## Schema SQL

```sql
-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE task_status AS ENUM ('pendente', 'em_andamento', 'concluida');
CREATE TYPE task_priority AS ENUM ('baixa', 'media', 'alta');

-- Tabelas
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      task_status NOT NULL DEFAULT 'pendente',
  priority    task_priority NOT NULL DEFAULT 'media',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status  ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```
