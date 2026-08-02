# ADR-004 — API First

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Embora o MVP seja uma aplicação web simples, um dos objetivos do projeto é permitir evolução sem reescrita da arquitetura.

Além do frontend, futuramente agentes de IA, scripts de migração e automações deverão consumir os mesmos serviços do sistema.

## Problema

Evitar que regras de negócio fiquem acopladas ao frontend ou dependam exclusivamente da interface web.

## Decisão

Adotar a estratégia **API First**.

Toda funcionalidade do sistema será disponibilizada através de uma API REST documentada. O frontend será apenas um consumidor dessa API.

## Objetivos

- Desacoplar frontend e backend.
- Permitir integrações futuras.
- Facilitar testes de integração.
- Garantir contratos estáveis entre consumidores.

## Diretrizes

- Toda regra de negócio reside no backend.
- Nenhuma operação acessa diretamente o banco fora da camada de aplicação.
- Toda funcionalidade disponível na interface deverá possuir um endpoint correspondente.
- A API será versionada (`/api/v1`).
- A documentação será gerada automaticamente via OpenAPI/Swagger.

## Autenticação

### Usuários

- Login e senha.
- Sessão segura via cookie HTTP-only.

### Integrações

- API Keys.
- Possibilidade futura de escopos (read/write).

## Idempotência

Operações críticas deverão aceitar uma chave de idempotência, evitando duplicações causadas por reenvio de requisições ou agentes de IA.

Aplicável principalmente para:

- criação de pedidos;
- recebimento de pedidos;
- registro de vendas.

## Integração com IA

Fluxo previsto:

1. IA recebe um XML de NF-e.
2. IA interpreta os dados.
3. IA envia os dados para a API.
4. O sistema cria um rascunho.
5. Usuário revisa.
6. Usuário confirma.
7. O sistema persiste os dados.

A IA nunca deverá confirmar automaticamente operações que alterem estoque.

## Consequências Positivas

- Arquitetura preparada para crescimento.
- Reutilização da mesma camada de negócio.
- Facilidade para integrações.
- Maior testabilidade.

## Consequências Negativas

- Exige maior disciplina na definição dos contratos.
- Necessidade de manter documentação da API atualizada.

## Alternativas Consideradas

### Backend acoplado ao frontend

Rejeitado por limitar integrações e aumentar o acoplamento.

### RPC ou GraphQL

Rejeitado neste momento para manter simplicidade operacional.

## Relação com outros ADRs

- ADR-001 — Monorepo
- ADR-002 — NestJS
- ADR-003 — Next.js
- ADR-005 — Arquitetura Híbrida
