# ADR-007 — Adoção do Prisma ORM

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O sistema utilizará PostgreSQL como banco de dados e NestJS como backend. É necessário um ORM que simplifique o acesso aos dados, mantenha segurança de tipos e facilite a evolução do schema.

## Problema

Selecionar uma tecnologia de acesso a dados que:

- integre-se ao TypeScript;
- suporte migrations versionadas;
- facilite testes;
- mantenha produtividade elevada;
- reduza SQL repetitivo.

## Decisão

Adotar **Prisma ORM** como camada oficial de persistência.

## Motivação

- Tipagem forte para TypeScript.
- Schema declarativo.
- Geração automática de cliente.
- Migrations versionadas.
- Excelente integração com PostgreSQL e NestJS.

## Diretrizes

- Todo acesso ao banco ocorrerá através do Prisma.
- O Prisma ficará restrito à camada **Infrastructure**.
- Casos de uso dependem apenas de interfaces de repositório.
- Nenhum controller acessará o Prisma diretamente.
- Consultas complexas poderão utilizar SQL nativo apenas quando houver justificativa técnica documentada.

## Migrations

- Todas as alterações de banco serão realizadas por migrations.
- Migrations fazem parte do versionamento do projeto.
- Não serão permitidas alterações manuais no banco de produção.

## Testes

- Repositórios poderão ser substituídos por implementações em memória ou mocks.
- Testes de integração utilizarão PostgreSQL isolado com Testcontainers.

## Consequências Positivas

- Alta produtividade.
- Segurança de tipos.
- Evolução controlada do schema.
- Menor probabilidade de erros de persistência.

## Consequências Negativas

- Dependência da ferramenta para geração do cliente.
- Algumas consultas avançadas exigem SQL nativo.

## Alternativas Consideradas

### TypeORM

Rejeitado por preferência arquitetural e menor aderência ao fluxo definido.

### Drizzle ORM

Rejeitado por priorizar um ecossistema já consolidado no time.

### SQL puro

Rejeitado por aumentar a complexidade de manutenção.

## Relação com outros ADRs

- ADR-002 — NestJS
- ADR-005 — Arquitetura Híbrida
- ADR-006 — PostgreSQL
