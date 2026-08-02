# ADR-009 — Estratégia de Modelagem de Estoque

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O principal objetivo do sistema é substituir a planilha da cliente, automatizando o controle de estoque sem aumentar a complexidade operacional.

O estoque deve permanecer consistente, auditável e preparado para futuras integrações.

## Objetivo

Definir como o estoque será modelado e atualizado ao longo do ciclo de vida dos pedidos e das vendas.

## Drivers Arquiteturais

- Integridade dos dados.
- Simplicidade operacional.
- Rastreabilidade.
- Facilidade para auditoria.
- Evolução sem refatorações estruturais.

## Decisão

O estoque será baseado em **movimentações**, e não apenas em um saldo persistido.

O saldo atual de cada produto será consequência das movimentações registradas.

## Tipos de Movimentação

### Entradas

- Recebimento de pedido.

### Saídas

- Venda.

### Ajustes

- Correção de estoque.
- Uso pessoal.
- Devolução.

## Regras

- Um pedido somente gera entrada quando marcado como **Recebido**.
- Vendas geram saída imediatamente após a confirmação.
- Ajustes exigem um motivo.
- O sistema permitirá estoque negativo apenas mediante confirmação do usuário, exibindo um alerta.
- Nenhuma movimentação será excluída fisicamente.

## Snapshot Histórico

Os itens de pedido armazenarão os valores praticados no momento da compra:

- valor de catálogo;
- valor original;
- valor pago.

Mudanças futuras no cadastro do produto não alteram o histórico.

## Validade

A validade será registrada no **item recebido**.

Neste MVP, a venda não controlará a origem do lote consumido.

## Auditoria

Cada movimentação registrará:

- tipo;
- usuário;
- data/hora;
- referência (pedido, venda ou ajuste);
- observação opcional.

## Consequências Positivas

- Histórico completo.
- Facilidade para auditoria.
- Menor risco de inconsistências.
- Possibilidade de reconstrução do saldo.

## Trade-offs

- Maior quantidade de registros.
- Consultas de saldo exigem agregação das movimentações.

## Alternativas Consideradas

### Saldo único por produto

Rejeitada por dificultar auditoria e rastreabilidade.

### Controle completo por lote

Adiado para evolução futura por aumentar a complexidade do MVP.

## ADRs Relacionados

- ADR-004 — API First
- ADR-005 — Arquitetura Híbrida
- ADR-006 — PostgreSQL
- ADR-007 — Prisma ORM
