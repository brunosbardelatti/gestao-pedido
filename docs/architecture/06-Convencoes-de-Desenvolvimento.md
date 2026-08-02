# Documento 06 — Convenções de Desenvolvimento

## Objetivo

Padronizar a implementação do projeto para garantir consistência, legibilidade, testabilidade e facilitar o desenvolvimento assistido por IA.

---

# Princípios

- Simplicidade acima de abstrações desnecessárias.
- Código orientado ao domínio.
- API First.
- Specification-Driven Development (SDD).
- Test-Driven Development (TDD) para regras críticas.
- Clean Code.

---

# Estrutura do Monorepo

```text
apps/
  frontend/
  backend/

packages/
  shared-types/
  shared-utils/

docs/
```

---

# Convenções Gerais

## Idioma

- Código em inglês.
- Documentação em português.
- Mensagens para usuário em português.

## Nomeação

Classes:

```text
CreateOrderUseCase
```

Interfaces:

```text
OrderRepository
```

DTOs

```text
CreateOrderDto
```

Controllers

```text
OrdersController
```

Repositories

```text
PrismaOrderRepository
```

---

# Organização dos Casos de Uso

Cada caso de uso representa uma ação do negócio.

Exemplos:

- CreateOrder
- ReceiveOrder
- RegisterSale
- AdjustInventory

Cada caso de uso deve possuir:

- implementação;
- testes;
- critérios de aceite vinculados à especificação.

---

# Controllers

Controllers devem:

- validar entrada;
- delegar ao caso de uso;
- retornar resposta HTTP.

Nunca devem:

- acessar Prisma;
- implementar regra de negócio;
- realizar cálculos.

---

# Domínio

O domínio não pode conhecer:

- NestJS;
- Prisma;
- HTTP;
- Railway.

O domínio conhece apenas:

- entidades;
- value objects;
- contratos;
- regras de negócio.

---

# Persistência

Todo acesso ao banco ocorrerá através de repositories.

É proibido utilizar Prisma diretamente fora da camada Infrastructure.

---

# Testes

## Unitários

Obrigatórios para:

- regras de domínio;
- casos de uso;
- value objects.

## Integração

Obrigatórios para:

- repositories;
- endpoints REST.

## End-to-End

Fluxos mínimos:

- login;
- pedido;
- recebimento;
- venda.

---

# Commits

Padrão:

```text
feat:
fix:
refactor:
docs:
test:
chore:
```

---

# Pull Requests

Todo PR deverá conter:

- objetivo;
- impacto;
- testes executados;
- documentação atualizada quando aplicável.

---

# Definition of Done

Uma funcionalidade somente será considerada concluída quando:

- especificação aprovada;
- implementação concluída;
- testes passando;
- documentação atualizada;
- revisão realizada.

---

# Próximo Documento

Documento 07 — Plano de Fases e Milestones.
