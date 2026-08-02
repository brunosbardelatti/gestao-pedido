# Documento 07 — Roadmap de Implementação (Epics → Features → User Stories)

## Objetivo

Organizar o desenvolvimento do MVP em uma estrutura incremental orientada por valor de negócio, servindo como base para o planejamento das fases, milestones e implementação assistida por IA.

---

# Epic 1 — Fundação da Plataforma

## Feature 1.1 — Estrutura do Projeto

### User Story

Como desenvolvedor, quero iniciar o projeto com a arquitetura definida para que todas as funcionalidades sigam um padrão consistente.

**Critérios de aceite**

- Monorepo criado.
- Frontend Next.js.
- Backend NestJS.
- PostgreSQL + Prisma.
- Docker Compose funcional.

---

## Feature 1.2 — Autenticação

### User Story

Como usuário, quero acessar o sistema com login e senha.

**Critérios**

- Login.
- Logout.
- Sessão por cookie HTTP-only.
- Auditoria de login.

---

# Epic 2 — Catálogo

## Feature 2.1 — Marcas

- Cadastrar marca.
- Editar.
- Inativar.

## Feature 2.2 — Categorias

- Cadastrar.
- Editar.
- Inativar.

## Feature 2.3 — Produtos

### User Story

Como revendedora, quero cadastrar produtos para utilizá-los em pedidos e vendas.

**Critérios**

- Código único por marca.
- Categoria obrigatória.
- Preço sugerido.
- Produto ativo/inativo.

---

# Epic 3 — Pedidos

## Feature 3.1 — Cadastro de Pedido

- Criar pedido.
- Adicionar itens.
- Editar enquanto aberto.

## Feature 3.2 — Recebimento

### User Story

Como revendedora, quero confirmar um pedido recebido para atualizar automaticamente o estoque.

**Critérios**

- Quantidade recebida.
- Validade.
- Movimentação de estoque.
- Snapshot de preços.

---

# Epic 4 — Estoque

## Feature 4.1 — Consulta

- Saldo atual.
- Movimentações.

## Feature 4.2 — Ajustes

- Correção.
- Uso pessoal.
- Devolução.

---

# Epic 5 — Vendas

## Feature 5.1 — Venda

### User Story

Como revendedora, quero registrar uma venda para reduzir automaticamente o estoque.

**Critérios**

- Carrinho.
- Cliente opcional.
- Preço editável.
- Snapshot.
- Forma de pagamento opcional.

---

# Epic 6 — Clientes

- Cadastro.
- Pesquisa.
- Associação opcional à venda.

---

# Epic 7 — Relatórios

- Estoque.
- Produtos próximos do vencimento.
- Vendas por período.
- Margem.

---

# Epic 8 — API Pública

- Documentação OpenAPI.
- Idempotência.
- API Keys.
- Endpoints REST.

---

# Epic 9 — Integração com IA

- Importação XML.
- Criação de rascunho.
- Validação humana.
- Confirmação.

---

# Dependências

1. Fundação
2. Catálogo
3. Pedidos
4. Estoque
5. Vendas
6. Clientes
7. Relatórios
8. API
9. IA

---

# Próximo Documento

Documento 08 — Plano de Fases e Milestones.
