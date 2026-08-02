# ADR-011 — Estratégia de Desenvolvimento (SDD + TDD)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O projeto será desenvolvido de forma incremental, com forte apoio de IA durante análise, implementação e revisão de código. Para reduzir ambiguidades e garantir qualidade, é necessário padronizar o processo de desenvolvimento.

## Objetivo

Definir um processo que privilegie especificações claras, implementação orientada ao domínio e validação automatizada.

## Drivers Arquiteturais

- Clareza de requisitos.
- Qualidade do código.
- Baixa regressão.
- Evolução incremental.
- Facilidade de colaboração entre pessoas e IA.

## Decisão

O projeto adotará:

- **SDD (Specification-Driven Development)** como metodologia principal.
- **TDD (Test-Driven Development)** como prática complementar para implementação das regras críticas.

## Fluxo de Desenvolvimento

```text
Necessidade
      ↓
Especificação (PRD/User Story)
      ↓
Critérios de Aceite
      ↓
Casos de Uso
      ↓
Testes (TDD)
      ↓
Implementação
      ↓
Refatoração
      ↓
Revisão
```

## Diretrizes

### Specification-Driven Development

Cada funcionalidade deverá possuir:

- objetivo;
- contexto;
- regras de negócio;
- critérios de aceite;
- dependências;
- impactos;
- definição de pronto.

Nenhuma implementação deve iniciar sem especificação aprovada.

### Test-Driven Development

Para regras de negócio críticas:

1. Escrever o teste.
2. Confirmar falha.
3. Implementar o mínimo necessário.
4. Confirmar sucesso.
5. Refatorar.

## Escopo dos Testes

### Unitários

- Casos de uso.
- Regras de domínio.
- Value Objects.

### Integração

- Repositórios.
- Prisma.
- Banco de dados.
- API REST.

### End-to-End

Fluxos principais:

- Login.
- Cadastro de produto.
- Pedido.
- Recebimento.
- Venda.

## Ferramentas

- Vitest
- Supertest
- Playwright
- Testcontainers

## Benefícios

- Redução de ambiguidades.
- Maior previsibilidade.
- Facilidade de manutenção.
- Melhor suporte ao desenvolvimento assistido por IA.

## Trade-offs

- Maior investimento inicial na escrita das especificações.
- Tempo adicional para criação de testes.

## Alternativas Consideradas

### Desenvolvimento sem especificação formal

Rejeitado por aumentar retrabalho e interpretações divergentes.

### Testes apenas manuais

Rejeitado por reduzir a confiabilidade e dificultar evoluções.

## ADRs Relacionados

- ADR-002 — NestJS
- ADR-004 — API First
- ADR-005 — Arquitetura Híbrida
