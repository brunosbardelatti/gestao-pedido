# ADR-015 — Estratégia de Integração com IA e Automação

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Desde a concepção do projeto, um dos objetivos é permitir que agentes de IA, scripts e automações interajam com o sistema sem depender da interface web. Um caso de uso previsto é a leitura de XML de NF-e para criação assistida de pedidos.

## Objetivo

Definir uma estratégia segura, desacoplada e evolutiva para integrações automatizadas.

## Drivers Arquiteturais

- API First
- Baixo acoplamento
- Segurança
- Rastreabilidade
- Evolução incremental

## Decisão

As integrações externas consumirão exclusivamente a API REST pública autenticada.

Nenhuma integração terá acesso direto ao banco de dados.

## Fluxo Inicial

```text
XML da NF-e
      │
Agente de IA
      │
Interpretação
      │
API REST
      │
Pedido em Rascunho
      │
Validação Humana
      │
Confirmação
      │
Persistência
```

## Diretrizes

- A IA nunca confirma operações que alterem estoque automaticamente.
- Toda criação realizada por integração deverá ficar identificada.
- Operações críticas deverão utilizar chave de idempotência.
- Todas as ações serão registradas na auditoria.

## Autenticação

Integrações utilizarão API Keys independentes das contas dos usuários.

Em evoluções futuras poderão existir escopos como:

- leitura;
- escrita;
- administração.

## Idempotência

Endpoints de criação de pedidos, recebimentos e vendas deverão aceitar uma chave de idempotência para evitar duplicações.

## Benefícios

- Integração com ChatGPT, Gemini e outros agentes.
- Importações automatizadas.
- Reaproveitamento da mesma camada de negócio.
- Redução de lançamentos manuais.

## Trade-offs

- Necessidade de manter contratos estáveis.
- Maior cuidado com versionamento da API.

## Alternativas Consideradas

### Integração direta com o banco

Rejeitada por comprometer segurança e arquitetura.

### IA escrevendo diretamente no estoque

Rejeitada. Toda alteração operacional exige validação humana no MVP.

## ADRs Relacionados

- ADR-004 — API First
- ADR-008 — Autenticação
- ADR-009 — Modelagem de Estoque
- ADR-013 — Observabilidade
