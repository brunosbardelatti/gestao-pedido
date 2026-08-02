# ADR-001 — Arquitetura do Monorepo

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O projeto será uma aplicação web pequena, porém preparada para evoluir com integrações via API REST e agentes de IA. Será desenvolvido por um único time e compartilhará contratos entre frontend e backend.

## Decisão

Adotar um **monorepo** contendo frontend, backend, pacotes compartilhados e documentação.

Estrutura inicial:

```text
apps/
  frontend/
  backend/

packages/
  shared-types/
  shared-utils/

docs/
  prd/
  adr/
```

## Motivação

- Compartilhamento de tipos entre frontend e backend.
- Evolução sincronizada da API e da interface.
- Versionamento único.
- Simplificação do CI/CD.
- Centralização da documentação técnica.

## Consequências

### Positivas

- Menor duplicação de código.
- Maior consistência entre contratos.
- Facilidade para manutenção.
- Organização por responsabilidades.

### Negativas

- Repositório tende a crescer ao longo do tempo.
- Build e pipelines exigem configuração adequada.

## Alternativas consideradas

### Repositórios separados

**Rejeitado**, pois aumentaria a complexidade operacional e duplicaria contratos e modelos compartilhados.

## Relação com outros ADRs

- ADR-002 — NestJS
- ADR-003 — Next.js
- ADR-004 — API First
- ADR-005 — Organização por Vertical Slice + Clean Architecture
