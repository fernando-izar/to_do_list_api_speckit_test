# API Contracts: Task Management API

**Branch**: `001-task-management-api` | **Date**: 2026-04-25  
**Base URL**: `/api` | **Format**: JSON | **Auth**: Bearer token (JWT)

---

## Autenticação

### POST /auth/register

Registra um novo usuário.

**Request**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Validações**:
- `email`: formato de e-mail válido, único no sistema
- `password`: mínimo 8 caracteres, ao menos 1 letra e 1 número

**Response 201**
```json
{
  "accessToken": "<jwt-1h>",
  "refreshToken": "<opaque-token-7d>"
}
```

**Erros**:
- `400` — email inválido ou senha fora da política
- `409` — e-mail já cadastrado
- `429` — rate limit excedido (10 tentativas/15min por IP)

---

### POST /auth/login

Autentica um usuário existente.

**Request**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response 200**
```json
{
  "accessToken": "<jwt-1h>",
  "refreshToken": "<opaque-token-7d>"
}
```

**Erros**:
- `400` — campos ausentes
- `401` — credenciais inválidas (mensagem genérica, sem distinguir e-mail/senha)
- `429` — rate limit excedido

---

### POST /auth/refresh

Renova o par de tokens. O refresh token anterior é revogado (rotação).

**Request**
```json
{
  "refreshToken": "<opaque-token>"
}
```

**Response 200**
```json
{
  "accessToken": "<jwt-1h>",
  "refreshToken": "<new-opaque-token-7d>"
}
```

**Erros**:
- `400` — campo ausente
- `401` — refresh token inválido, expirado ou já revogado

---

## Tarefas

> Todos os endpoints requerem `Authorization: Bearer <accessToken>`

### GET /tasks

Lista as tarefas do usuário autenticado.

**Query params** (todos opcionais, combináveis):
- `status`: `pendente` | `em_andamento` | `concluida`
- `priority`: `baixa` | `media` | `alta`

**Response 200**
```json
[
  {
    "id": "uuid",
    "title": "Comprar leite",
    "description": null,
    "status": "pendente",
    "priority": "alta",
    "tags": [{ "id": "uuid", "name": "compras" }],
    "createdAt": "2026-04-25T10:00:00Z",
    "updatedAt": "2026-04-25T10:00:00Z"
  }
]
```

**Erros**: `401` — token inválido/ausente

---

### POST /tasks

Cria uma nova tarefa.

**Request**
```json
{
  "title": "Comprar leite",
  "description": "2 litros, integral",
  "status": "pendente",
  "priority": "alta"
}
```

- `title`: obrigatório, não vazio
- `description`: opcional
- `status`: opcional, default `pendente`
- `priority`: opcional, default `media`

**Response 201**
```json
{
  "id": "uuid",
  "title": "Comprar leite",
  "description": "2 litros, integral",
  "status": "pendente",
  "priority": "alta",
  "tags": [],
  "createdAt": "2026-04-25T10:00:00Z",
  "updatedAt": "2026-04-25T10:00:00Z"
}
```

**Erros**:
- `400` — título ausente ou vazio
- `401` — token inválido/ausente

---

### GET /tasks/:id

Retorna uma tarefa específica do usuário.

**Response 200**: mesma estrutura de item do `GET /tasks`

**Erros**:
- `401` — token inválido/ausente
- `404` — tarefa não encontrada ou pertence a outro usuário

---

### PUT /tasks/:id

Atualiza campos de uma tarefa. Todos os campos são opcionais.

**Request**
```json
{
  "title": "Comprar leite e pão",
  "status": "em_andamento",
  "priority": "media"
}
```

**Response 200**: tarefa atualizada (mesma estrutura)

**Erros**:
- `400` — valor de status ou priority inválido
- `401` — token inválido/ausente
- `404` — tarefa não encontrada ou pertence a outro usuário

---

### DELETE /tasks/:id

Remove permanentemente uma tarefa.

**Response 204** — sem corpo

**Erros**:
- `401` — token inválido/ausente
- `404` — tarefa não encontrada ou pertence a outro usuário

---

## Tags

### GET /tags

Lista as tags do usuário autenticado.

**Response 200**
```json
[
  { "id": "uuid", "name": "compras", "createdAt": "2026-04-25T10:00:00Z" }
]
```

---

### POST /tags

Cria uma nova tag.

**Request**
```json
{ "name": "compras" }
```

**Response 201**
```json
{ "id": "uuid", "name": "compras", "createdAt": "2026-04-25T10:00:00Z" }
```

**Erros**:
- `400` — nome ausente ou vazio
- `409` — tag com esse nome já existe para este usuário

---

### DELETE /tags/:id

Remove uma tag (e desassocia automaticamente de todas as tarefas via CASCADE).

**Response 204** — sem corpo

**Erros**:
- `401` — token inválido/ausente
- `404` — tag não encontrada ou pertence a outro usuário

---

## Associação Tarefa ↔ Tag

### POST /tasks/:taskId/tags/:tagId

Associa uma tag a uma tarefa. **Idempotente** — se já associada, retorna 200 sem erro.

**Response 200** — sem corpo

**Erros**:
- `401` — token inválido/ausente
- `404` — tarefa ou tag não encontrada, ou pertence a outro usuário

---

### DELETE /tasks/:taskId/tags/:tagId

Desassocia uma tag de uma tarefa.

**Response 204** — sem corpo

**Erros**:
- `401` — token inválido/ausente
- `404` — tarefa ou tag não encontrada, ou associação inexistente

---

## Convenções Gerais

| Aspecto | Padrão |
|---------|--------|
| IDs | UUID v4 |
| Datas | ISO 8601 com timezone (`2026-04-25T10:00:00Z`) |
| Campos de data em resposta | `camelCase`: `createdAt`, `updatedAt` |
| Erros | `{ "error": "<mensagem descritiva>" }` |
| Auth header | `Authorization: Bearer <token>` |
| Rate limit response | `{ "error": "Too many requests", "retryAfter": <segundos> }` + header `Retry-After` |
