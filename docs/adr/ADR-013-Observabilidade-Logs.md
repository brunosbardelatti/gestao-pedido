# ADR-013 — Observabilidade, Logs e Tratamento de Erros

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Mesmo sendo uma aplicação de pequeno porte, o sistema deve permitir identificar falhas rapidamente, facilitar suporte e registrar eventos relevantes para manutenção e evolução.

## Objetivo

Definir uma estratégia simples de observabilidade, priorizando baixo custo e facilidade operacional.

## Drivers Arquiteturais

- Facilidade de diagnóstico.
- Baixo custo.
- Simplicidade.
- Confiabilidade.
- Manutenção.

## Decisão

Adotar uma estratégia baseada em:

- Logs estruturados.
- Health Check da aplicação.
- Tratamento centralizado de exceções.
- Auditoria de operações do domínio.
- Monitoramento utilizando inicialmente os recursos da Railway.

## Logs

Todos os logs deverão conter, quando aplicável:

- Timestamp (UTC).
- Nível (INFO, WARN, ERROR).
- Módulo.
- Operação.
- Identificador da requisição (Request ID).
- Usuário autenticado (quando existir).

Nunca registrar:

- Senhas.
- Cookies.
- Tokens.
- Dados sensíveis desnecessários.

## Tratamento de Erros

O backend deverá possuir:

- Exception Filter global.
- Respostas padronizadas.
- Mensagens amigáveis ao frontend.
- Registro detalhado apenas nos logs.

## Health Check

Endpoints mínimos:

- /health
- /health/ready

Devem validar:

- aplicação;
- conexão com PostgreSQL.

## Auditoria

Operações relevantes registrarão:

- criação;
- alteração;
- cancelamento;
- recebimento de pedidos;
- vendas;
- ajustes de estoque.

Os registros permanecerão apenas no banco no MVP.

## Benefícios

- Diagnóstico rápido.
- Maior confiabilidade.
- Facilidade de suporte.
- Base preparada para monitoramento futuro.

## Trade-offs

- Pequeno aumento no volume de armazenamento de logs.
- Necessidade de padronização desde o início.

## Alternativas Consideradas

### Logs apenas via console

Rejeitada por dificultar suporte e rastreamento.

### Plataforma completa de observabilidade (Sentry, Datadog etc.)

Adiada para uma fase futura por não agregar valor proporcional ao MVP.

## ADRs Relacionados

- ADR-002 — NestJS
- ADR-005 — Arquitetura Híbrida
- ADR-012 — Infraestrutura e Deploy
