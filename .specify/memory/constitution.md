<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (initial ratification)

Principles added:
- I. Estilo de Código (new)
- II. Testes (new)
- III. Arquitetura (new)

Sections added:
- Core Principles (3 principles)
- Governance

Templates checked:
- .specify/templates/plan-template.md ✅ (Constitution Check section presente; referencia o arquivo da constituição)
- .specify/templates/spec-template.md ✅ (sem alterações necessárias)
- .specify/templates/tasks-template.md ✅ (sem alterações necessárias)

Deferred TODOs: nenhum
-->

# Todo List App Constitution

## Core Principles

### I. Estilo de Código

TypeScript é obrigatório em todo o projeto — nenhum arquivo `.js` é permitido na base de código.
Toda função exportada ou de nível de módulo DEVE ter JSDoc descrevendo parâmetros, retorno e propósito.
Funções DEVEM ser preferidas em relação a classes; classes são permitidas apenas quando
o estado encapsulado é estritamente necessário e não pode ser modelado com closures ou módulos.
Arquivos DEVEM ter no máximo 300 linhas; exceder esse limite DEVE acionar refatoração imediata.

### II. Testes

Toda função DEVE ter pelo menos um teste automatizado cobrindo seu caminho principal.
O framework de testes obrigatório é **Jest** — nenhum outro framework de teste será adicionado.
A cobertura mínima aceitável é **80%**; PRs que reduzam a cobertura abaixo desse limite
DEVEM ser bloqueados no CI.

### III. Arquitetura

A lógica de negócio DEVE estar completamente separada da camada de UI —
nenhuma regra de domínio pode residir em componentes de interface.
Acesso a dados DEVE ser feito com SQL direto; ORMs são proibidos.
Dependências circulares entre módulos são proibidas e DEVEM ser detectadas automaticamente no CI.
A API DEVE seguir o estilo RESTful com JSON como único formato de troca de dados.

## Governance

A constituição tem precedência sobre todas as outras práticas e preferências do projeto.
Alterações requerem: (1) documentação da motivação, (2) aprovação explícita do responsável
pelo projeto, e (3) plano de migração quando há impacto em código existente.

Todos os PRs DEVEM verificar conformidade com os três princípios acima antes do merge.
Complexidade adicional DEVE ser justificada por escrito no PR que a introduz.

**Version**: 1.0.0 | **Ratified**: 2026-04-25 | **Last Amended**: 2026-04-25
