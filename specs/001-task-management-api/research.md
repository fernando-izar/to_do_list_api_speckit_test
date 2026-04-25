# Research: Task Management API

**Branch**: `001-task-management-api` | **Date**: 2026-04-25

## Decisões Técnicas

### 1. HTTP Framework

- **Decision**: Express 4.x com TypeScript
- **Rationale**: Minimalista, baseado em funções (alinhado com a constituição), tipagem via `@types/express`, ecossistema maduro e sem padrões impostos que conflitem com a arquitetura por domínio definida.
- **Alternatives considered**: Fastify (mais performático, mas mais opinionado); Hono (excelente suporte TypeScript, válido para v2); NestJS (excluído — fortemente baseado em classes, viola a constituição).

### 2. Autenticação JWT com Refresh Tokens

- **Decision**: `jsonwebtoken` para assinatura de tokens; refresh tokens armazenados como hash (SHA-256) no PostgreSQL com rotação a cada uso.
- **Rationale**: Tokens de acesso stateless (1h) reduzem carga no banco. Refresh tokens armazenados permitem revogação e detecção de reuso. Rotação invalida o token anterior a cada renovação, limitando janela de ataque em caso de vazamento.
- **Alternatives considered**: `jose` (Web Crypto API nativo, mais moderno) — válido mas menos adotado no ecossistema Node.js atual; sessões server-side (excluído — não alinhado com REST stateless).

### 3. Hash de Senhas

- **Decision**: `bcryptjs` com fator de custo 12
- **Rationale**: Algoritmo adaptativo resistente a ataques de GPU; fator 12 equilibra segurança e latência (~250ms em hardware moderno). Versão pure-JS evita problemas de compilação de bindings nativos.
- **Alternatives considered**: `argon2` (recomendado pelo OWASP para novos projetos, superior ao bcrypt) — válido para v2 se requisitos de segurança aumentarem; requer bindings nativos.

### 4. Rate Limiting

- **Decision**: `express-rate-limit` com store em memória, aplicado apenas nas rotas `/auth/*`
- **Rationale**: Solução zero-infraestrutura suficiente para deployment single-server v1. Janela de 15 minutos / 10 tentativas por IP previne força bruta sem complexidade operacional.
- **Alternatives considered**: Rate limiting via Redis (necessário em multi-servidor) — diferido para quando houver necessidade de escala horizontal.

### 5. Cliente PostgreSQL

- **Decision**: `pg` (node-postgres) com `Pool`, queries parametrizadas para toda entrada de usuário
- **Rationale**: Driver oficial PostgreSQL, battle-tested, suporte nativo a connection pooling, zero abstração sobre SQL (alinhado com a constituição). Queries parametrizadas previnem SQL injection.
- **Alternatives considered**: `postgres.js` (mais moderno, melhor suporte TypeScript) — alternativa válida; `Drizzle` excluído por ser ORM-adjacent, violaria a constituição.

### 6. Toolchain de Desenvolvimento

- **Decision**: `tsx` para desenvolvimento com hot-reload; `tsc` para build de produção; `ts-jest` para testes
- **Rationale**: `tsx` elimina etapa de compilação no desenvolvimento; `tsc` garante output limpo para produção; `ts-jest` permite rodar Jest diretamente em TypeScript sem pré-compilação.
