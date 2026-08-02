# ADR-002 — Adoção do NestJS

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O backend será responsável por expor uma API REST, encapsular as regras de negócio e servir como ponto único de integração para o frontend, futuras automações e agentes de IA.

A arquitetura definida para o projeto combina Clean Architecture com Vertical Slice, exigindo boa organização modular e suporte à injeção de dependências.

## Problema

Escolher um framework que ofereça:

- Estrutura modular;
- Escalabilidade sem excesso de complexidade;
- Boa integração com TypeScript;
- Excelente experiência para testes (TDD);
- Facilidade de documentação da API.

## Decisão

Adotar **NestJS** como framework oficial do backend.

## Motivação

O NestJS fornece:

- Arquitetura modular nativa;
- Injeção de dependências;
- Excelente integração com TypeScript;
- Facilidade para documentação OpenAPI/Swagger;
- Integração com Prisma;
- Suporte à validação, autenticação e interceptors;
- Comunidade madura e ampla adoção.

## Consequências Positivas

- Organização consistente do código.
- Facilidade para evolução do domínio.
- Baixo acoplamento entre camadas.
- Melhor suporte a testes unitários e de integração.
- Curva de manutenção reduzida.

## Consequências Negativas

- Maior curva de aprendizado quando comparado ao Express/Fastify puro.
- Estrutura inicial mais verbosa.

## Alternativas Consideradas

### Express

Rejeitado por exigir maior padronização manual.

### Fastify puro

Rejeitado porque a necessidade de organização arquitetural supera o ganho de leveza.

### Hono

Rejeitado por menor aderência ao padrão arquitetural definido para este projeto.

## Diretrizes

- Controllers apenas recebem e respondem requisições.
- Regras de negócio pertencem aos casos de uso (Application).
- O domínio permanece independente do NestJS.
- Infraestrutura implementa contratos definidos pela camada de domínio.

## Relação com outros ADRs

- ADR-001 — Monorepo
- ADR-003 — Next.js
- ADR-004 — API First
- ADR-005 — Arquitetura Híbrida
