# Documento 08 — Plano Executivo de Entrega (Phases & Milestones)

## Objetivo

Planejar a execução do MVP em fases incrementais, com entregas pequenas, testáveis e prontas para validação.

---

# Visão Geral

| Fase | Objetivo | Marco |
|------|----------|-------|
| Fase 1 | Fundação técnica | Ambiente operacional |
| Fase 2 | Catálogo | Produtos cadastráveis |
| Fase 3 | Pedidos | Fluxo completo de compras |
| Fase 4 | Estoque | Controle automático |
| Fase 5 | Vendas | Fluxo operacional completo |
| Fase 6 | Relatórios | Indicadores do negócio |
| Fase 7 | API e IA | Plataforma preparada para integrações |

---

# Fase 1 — Fundação

## Objetivo

Construir toda a infraestrutura do projeto.

### Entregáveis

- Monorepo
- Next.js
- NestJS
- Prisma
- PostgreSQL
- Docker Compose
- Railway
- Login
- Auditoria básica
- Pipeline inicial

### Milestone M1

**Aplicação executando em produção com autenticação funcional.**

**Critério de saída**

- Deploy realizado.
- Login funcional.
- Banco operacional.
- Testes iniciais passando.

---

# Fase 2 — Catálogo

### Entregáveis

- Marcas
- Categorias
- Produtos

### Milestone M2

Cadastro completo de produtos disponível.

---

# Fase 3 — Pedidos

### Entregáveis

- Criar pedido
- Editar pedido
- Receber pedido
- Snapshot histórico

### Milestone M3

Fluxo completo de compras implementado.

---

# Fase 4 — Estoque

### Entregáveis

- Movimentações
- Ajustes
- Consulta de saldo

### Milestone M4

Estoque atualizado automaticamente.

---

# Fase 5 — Vendas

### Entregáveis

- Carrinho
- Cliente opcional
- Venda
- PDF simples
- Baixa automática

### Milestone M5

Fluxo operacional completo.

---

# Fase 6 — Relatórios

### Entregáveis

- Estoque
- Vendas
- Margem
- Produtos próximos do vencimento

### Milestone M6

Gestão operacional disponível.

---

# Fase 7 — API e IA

### Entregáveis

- OpenAPI
- API Keys
- Idempotência
- Importação assistida por XML
- Criação de pedidos em rascunho

### Milestone M7

Arquitetura preparada para integrações externas.

---

# Critérios Gerais de Entrada

- Especificação aprovada.
- ADR correspondente definido.
- Dependências concluídas.

# Critérios Gerais de Saída

- Critérios de aceite atendidos.
- Testes unitários aprovados.
- Testes de integração aprovados.
- Documentação atualizada.
- Revisão concluída.

---

# Riscos

- Escopo além do MVP.
- Acoplamento entre frontend e backend.
- Crescimento descontrolado das regras de negócio.
- Ausência de testes automatizados.

---

# Métricas de Sucesso

- Fluxo completo de pedido → recebimento → venda.
- Estoque consistente.
- Nenhuma operação manual fora do sistema.
- Documentação sincronizada com a implementação.
- Base pronta para evolução incremental.

---

## Próximos Artefatos Recomendados

1. Especificações detalhadas de cada caso de uso.
2. OpenAPI completa.
3. Schema Prisma.
4. Backlog técnico (Tasks).
5. Plano de migração da planilha.
