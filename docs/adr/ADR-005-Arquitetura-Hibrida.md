# ADR-005 — Arquitetura Híbrida (Clean Architecture + Vertical Slice)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O sistema inicia pequeno, porém deve evoluir sem perder organização. A arquitetura precisa favorecer testes, baixo acoplamento, manutenção simples e crescimento gradual.

## Problema

Arquiteturas puramente em camadas tendem a criar acoplamento entre módulos. Já uma Clean Architecture completa pode introduzir complexidade desnecessária para um projeto deste porte.

## Decisão

Adotar uma arquitetura híbrida combinando:

- **Vertical Slice** para organizar o código por funcionalidades.
- **Clean Architecture** dentro de cada módulo.

Cada funcionalidade será um módulo independente contendo suas próprias camadas.

## Estrutura

```text
modules/
  products/
    domain/
    application/
    infrastructure/
    presentation/

  orders/
  inventory/
  sales/
  customers/
  auth/
  audit/
```

## Responsabilidades

### Domain

- Entidades
- Value Objects
- Regras de negócio
- Interfaces de repositório

Não depende de NestJS, Prisma ou HTTP.

### Application

- Casos de uso
- DTOs
- Orquestração
- Validações de aplicação

Depende apenas do domínio.

### Infrastructure

- Prisma
- PostgreSQL
- Repositories
- Serviços externos

Implementa os contratos definidos pelo domínio.

### Presentation

- Controllers REST
- DTOs HTTP
- Guards
- Pipes
- Interceptors

Sem regras de negócio.

## Fluxo

```text
HTTP
 ↓
Controller
 ↓
Use Case
 ↓
Domain
 ↓
Repository
 ↓
Prisma/PostgreSQL
```

## Princípios

- Controllers finos.
- Casos de uso representam ações do negócio.
- Regras ficam no domínio.
- Dependências apontam para dentro.
- Comunicação entre módulos por contratos explícitos.

## Benefícios

- Alta coesão por funcionalidade.
- Baixo acoplamento.
- Facilidade para TDD.
- Reaproveitamento da lógica pela API e futuras integrações.
- Crescimento incremental sem refatorações estruturais.

## Consequências

### Positivas

- Organização previsível.
- Código fácil de localizar.
- Testes simplificados.
- Evolução segura.

### Negativas

- Estrutura inicial um pouco maior.
- Exige disciplina para manter responsabilidades separadas.

## Alternativas Consideradas

### Arquitetura tradicional em camadas

Rejeitada por concentrar funcionalidades em pastas globais e dificultar a evolução.

### Clean Architecture completa

Rejeitada por adicionar abstrações desnecessárias ao MVP.

### Vertical Slice puro

Rejeitado porque parte das regras acabaria acoplada à infraestrutura.

## Relação com outros ADRs

- ADR-001 — Monorepo
- ADR-002 — NestJS
- ADR-003 — Next.js
- ADR-004 — API First
