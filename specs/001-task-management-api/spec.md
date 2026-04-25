# Feature Specification: Task Management API

**Feature Branch**: `001-task-management-api`
**Created**: 2026-04-25
**Status**: Draft
**Input**: User description: "Construir uma API REST de gerenciamento de tarefas com CRUD completo, categorização por tags, filtros por status e prioridade, e autenticação JWT."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticação de Usuário (Priority: P1)

Um usuário se registra com e-mail e senha e recebe um token de acesso. Em sessões futuras, faz login com as mesmas credenciais e recebe um novo token válido. Com esse token, acessa todos os recursos protegidos da API.

**Why this priority**: Sem autenticação nenhum outro recurso pode ser acessado com segurança. É a base de toda a experiência do usuário.

**Independent Test**: Registrar um usuário, fazer login, e verificar que o token retornado permite acesso a um endpoint protegido.

**Acceptance Scenarios**:

1. **Given** um e-mail não cadastrado e senha válida, **When** o usuário solicita registro, **Then** a conta é criada e um par access token (1h) + refresh token (7 dias) é retornado
2. **Given** credenciais válidas cadastradas, **When** o usuário solicita login, **Then** um par access token + refresh token válidos são retornados
3. **Given** credenciais inválidas, **When** o usuário solicita login, **Then** o sistema retorna erro de autenticação sem expor detalhes internos
4. **Given** um access token expirado e refresh token válido, **When** o cliente chama o endpoint de renovação, **Then** um novo par de tokens é emitido e o refresh token anterior é invalidado
5. **Given** um token inválido ou refresh token expirado, **When** o usuário acessa qualquer endpoint protegido, **Then** o sistema retorna erro 401

---

### User Story 2 - Gerenciamento de Tarefas — CRUD (Priority: P1)

Um usuário autenticado pode criar novas tarefas, visualizar a lista de suas tarefas, ver detalhes de uma tarefa específica, atualizar dados de uma tarefa existente e remover tarefas que não são mais relevantes.

**Why this priority**: É a funcionalidade central do produto. Sem CRUD de tarefas o sistema não entrega valor algum.

**Independent Test**: Com um usuário autenticado, criar uma tarefa, listá-la, atualizá-la e deletá-la — verificando que cada operação reflete o estado correto.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** cria uma tarefa com título e descrição, **Then** a tarefa é persistida e retornada com id único
2. **Given** um usuário autenticado com tarefas existentes, **When** solicita a lista de tarefas, **Then** apenas suas próprias tarefas são retornadas
3. **Given** um usuário autenticado dono de uma tarefa, **When** atualiza campos da tarefa, **Then** as alterações são persistidas corretamente
4. **Given** um usuário autenticado dono de uma tarefa, **When** solicita a remoção da tarefa, **Then** a tarefa não aparece mais na listagem
5. **Given** um usuário autenticado, **When** tenta acessar ou modificar tarefa de outro usuário, **Then** o sistema retorna erro de autorização

---

### User Story 3 - Categorização por Tags (Priority: P2)

Um usuário autenticado pode criar tags personalizadas e associá-las a uma ou mais tarefas, facilitando a organização por categoria.

**Why this priority**: Agrega organização ao sistema de tarefas. Importante, mas o produto é utilizável sem esse recurso (US1 + US2 formam um MVP válido).

**Independent Test**: Criar uma tag, associá-la a uma tarefa, e verificar que a tarefa aparece corretamente categorizada.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** cria uma tag com nome único, **Then** a tag é persistida e associada ao seu perfil
2. **Given** uma tarefa e uma tag existentes do mesmo usuário, **When** associa a tag à tarefa, **Then** a tarefa exibe a tag em seus detalhes
3. **Given** uma tarefa com múltiplas tags, **When** o usuário remove uma tag da tarefa, **Then** apenas aquela tag é desassociada

---

### User Story 4 - Filtros por Status e Prioridade (Priority: P2)

Um usuário autenticado pode filtrar sua lista de tarefas por status e/ou prioridade para focar no que é mais relevante.

**Why this priority**: Melhora a usabilidade quando há muitas tarefas. Importante, mas não bloqueia o MVP.

**Independent Test**: Criar tarefas com diferentes status e prioridades, aplicar filtros e verificar que apenas as tarefas correspondentes são retornadas.

**Acceptance Scenarios**:

1. **Given** tarefas com diferentes status, **When** o usuário filtra por status "concluída", **Then** apenas tarefas com esse status são retornadas
2. **Given** tarefas com diferentes prioridades, **When** o usuário filtra por prioridade "alta", **Then** apenas tarefas com essa prioridade são retornadas
3. **Given** filtros combinados de status e prioridade, **When** o usuário aplica ambos, **Then** apenas tarefas que satisfazem os dois critérios são retornadas
4. **Given** nenhuma tarefa correspondendo ao filtro, **When** o usuário aplica o filtro, **Then** uma lista vazia é retornada sem erro

---

### Edge Cases

- O que acontece quando um usuário tenta criar uma tarefa com título vazio? O sistema rejeita a requisição com erro de validação.
- O que acontece quando a senha fornecida no registro não atende à política mínima? O sistema retorna erro descritivo indicando os requisitos não satisfeitos, sem criar a conta.
- Quando o access token expira durante uma sessão ativa, o cliente usa o refresh token para obter um novo par de tokens sem re-autenticação; se o refresh token também expirou, o usuário deve fazer login novamente.
- Associar uma tag já presente na tarefa é idempotente: o sistema retorna sucesso (200) sem criar duplicata.
- O que acontece quando um IP excede o limite de 10 tentativas de login em 15 minutos? O sistema retorna erro 429 com tempo de espera informado no cabeçalho da resposta.
- O que acontece quando filtros são aplicados mas não há tarefas correspondentes?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que novos usuários se registrem com e-mail único e senha de no mínimo 8 caracteres contendo ao menos uma letra e um número; senhas que não atendam aos requisitos DEVEM ser rejeitadas com mensagem de erro descritiva
- **FR-002**: O sistema DEVE autenticar usuários via JWT emitindo um access token de curta duração (1 hora) e um refresh token de longa duração (7 dias)
- **FR-002a**: O sistema DEVE fornecer um endpoint de renovação que aceite um refresh token válido e emita um novo par de tokens, invalidando o refresh token anterior (rotação de tokens)
- **FR-003**: O sistema DEVE rejeitar requisições sem access token válido com resposta de erro 401
- **FR-004**: Usuários autenticados DEVEM poder criar tarefas com título (obrigatório), descrição (opcional), status e prioridade
- **FR-005**: O sistema DEVE retornar apenas as tarefas pertencentes ao usuário autenticado
- **FR-006**: Usuários autenticados DEVEM poder atualizar qualquer campo de suas tarefas; transições de status são livres (qualquer valor pode ser atribuído independente do valor atual)
- **FR-007**: Usuários autenticados DEVEM poder remover suas tarefas permanentemente
- **FR-008**: O sistema DEVE impedir que usuários acessem ou modifiquem tarefas de outros usuários
- **FR-009**: Usuários autenticados DEVEM poder criar tags com nome único por usuário
- **FR-010**: Usuários autenticados DEVEM poder associar e desassociar tags de suas tarefas; a associação é idempotente — associar uma tag já presente retorna sucesso sem criar duplicata
- **FR-011**: O sistema DEVE suportar filtro de tarefas por status (pendente, em_andamento, concluida)
- **FR-012**: O sistema DEVE suportar filtro de tarefas por prioridade (baixa, media, alta)
- **FR-013**: O sistema DEVE suportar combinação simultânea de múltiplos filtros
- **FR-014**: Todas as respostas da API DEVEM estar no formato JSON
- **FR-015**: O sistema DEVE bloquear temporariamente requisições de login e registro de um mesmo IP após 10 tentativas falhas em um intervalo de 15 minutos, retornando erro 429

### Key Entities

- **Usuário**: Identidade com credenciais únicas (e-mail), responsável por suas próprias tarefas e tags
- **Tarefa**: Unidade de trabalho com título, descrição opcional, status, prioridade e zero ou mais tags; pertence a um único usuário
- **Tag**: Rótulo de categorização nomeado, pertencente a um usuário, associável a múltiplas tarefas do mesmo usuário

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem se registrar e fazer login em menos de 5 segundos em condições normais de rede
- **SC-002**: Operações CRUD retornam resposta em menos de 2 segundos para listas de até 500 tarefas por usuário
- **SC-003**: 100% das requisições sem token válido são rejeitadas antes de acessar dados protegidos
- **SC-004**: Nenhum usuário consegue ler, alterar ou deletar dados de outro usuário
- **SC-005**: Filtros retornam apenas tarefas que satisfazem todos os critérios selecionados, sem falsos positivos

## Clarifications

### Session 2026-04-25

- Q: Quando o token JWT expira, o usuário deve refazer login ou o sistema suporta refresh tokens? → A: Refresh token separado — access token de 1 hora + refresh token de 7 dias com rotação a cada uso.
- Q: O sistema deve aplicar limite de requisições nos endpoints de autenticação? → A: Apenas nos endpoints de auth — máximo 10 tentativas de login por IP em 15 minutos, bloqueio temporário após exceder.
- Q: Qual deve ser a política mínima de senha? → A: Mínimo 8 caracteres com ao menos uma letra e um número.
- Q: As transições de status das tarefas são livres ou seguem uma ordem? → A: Livres — qualquer status pode ir para qualquer outro, incluindo reabrir tarefas concluídas.
- Q: O que o sistema deve fazer ao tentar associar uma tag que já está na tarefa? → A: Idempotente — retorna sucesso (200) sem duplicar a associação.

## Assumptions

- Tags são pessoais: cada usuário gerencia seu próprio conjunto de tags (não há tags globais compartilhadas)
- Os valores de status são: `pendente`, `em_andamento`, `concluida`
- Os valores de prioridade são: `baixa`, `media`, `alta`
- O access token JWT tem duração de 1 hora; o refresh token tem duração de 7 dias
- Não há papel de administrador no escopo desta versão; todos os usuários têm as mesmas permissões sobre seus próprios dados
- Paginação da listagem de tarefas está fora do escopo desta versão inicial
- A remoção de tarefas é permanente (sem soft delete)
