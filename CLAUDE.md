# CLAUDE.md

## Projeto

Sistema web de gestão para revendedora de cosméticos (Avon, Natura). Substitui planilha perdida por aplicação com persistência, controle de estoque automático, pedidos, vendas e relatórios. MVP focado em simplicidade — fluxo semelhante ao da planilha original.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js, TypeScript, NestJS |
| Frontend | Next.js, React, TypeScript, shadcn/ui, Tailwind CSS |
| Banco | PostgreSQL |
| ORM | Prisma |
| Testes | Vitest, Supertest, Playwright, Testcontainers |
| Infra | Railway, Docker, Docker Compose |
| API Docs | OpenAPI / Swagger |

## Estrutura do Monorepo

```
apps/
  backend/          # NestJS API REST
    prisma/
      schema.prisma
  frontend/         # Next.js

packages/
  shared-types/
  shared-utils/

docs/
  product/          # PRD e PRD Técnico
  architecture/     # Arquitetura, domínio, modelo de dados, API, convenções
  adr/              # ADR-001 a ADR-015
  planning/         # Roadmap e plano executivo
  specifications/   # Especificações funcionais por módulo (SDD)
  api/
    openapi.yaml    # Contrato da API (fonte de verdade)
```

## Arquitetura

Híbrida: **Vertical Slice** (organização por funcionalidade) + **Clean Architecture** (camadas dentro de cada módulo).

Cada módulo do backend segue:

```
modules/<nome>/
  domain/           # Entidades, Value Objects, regras, interfaces de repositório
  application/      # Use Cases, DTOs, orquestração
  infrastructure/   # Prisma repositories, serviços externos
  presentation/     # Controllers REST, DTOs HTTP, Guards, Pipes
```

Módulos: products, orders, inventory, sales, customers, auth, audit.

Fluxo: HTTP → Controller → Use Case → Domain → Repository → Prisma/PostgreSQL.

**Controllers nunca contêm regra de negócio.** O domínio não conhece NestJS, Prisma, HTTP ou Railway.

## Convenções de Código

- Código em **inglês**. Documentação em **português**. Mensagens de UI em **português**.
- Classes: `CreateOrderUseCase`
- Interfaces: `OrderRepository`
- DTOs: `CreateOrderDto`
- Controllers: `OrdersController`
- Repositories: `PrismaOrderRepository`
- Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## API REST

- Base URL: `/api/v1`
- JSON UTF-8, datas ISO-8601 (UTC), UUIDs
- Autenticação: cookie HTTP-only (usuários) ou `X-API-Key` (integrações)
- Resposta sucesso: `{ "data": {}, "meta": {} }`
- Resposta erro: `{ "error": { "code": "ORDER_NOT_FOUND", "message": "..." } }`
- Paginação: `?page=1&pageSize=20`
- Idempotência via header `Idempotency-Key: UUID` em operações críticas
- Nunca retornar stack trace, password hash ou expor cookies

## Metodologia

**SDD (Specification-Driven Development)**: toda funcionalidade precisa de especificação aprovada antes da implementação. Specs ficam em `docs/specifications/`.

**TDD** para regras de negócio críticas: teste → falha → implementação mínima → sucesso → refatoração.

## Testes

- **Unitários** (obrigatórios): use cases, regras de domínio, value objects
- **Integração** (obrigatórios): repositories, endpoints REST
- **E2E** (fluxos mínimos): login, pedido, recebimento, venda

## Regras de Domínio Importantes

- Estoque é projeção de movimentações, nunca editado diretamente
- Pedido só movimenta estoque quando status = Recebido
- Itens de pedido/venda armazenam snapshot histórico de preços
- Código de produto é único por marca
- Venda pode existir sem cliente
- Pedido recebido não pode ser excluído
- Alterações de preço não afetam histórico

## Comandos Prisma

```bash
npx prisma format --schema apps/backend/prisma/schema.prisma
npx prisma validate --schema apps/backend/prisma/schema.prisma
npx prisma migrate dev --schema apps/backend/prisma/schema.prisma
npx prisma generate --schema apps/backend/prisma/schema.prisma
```

## Definition of Done

Uma funcionalidade está concluída quando: especificação aprovada, implementação concluída, testes passando, documentação atualizada, revisão realizada.
