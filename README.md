# Gestão de Pedidos

Aplicação web para pedidos, estoque e vendas de uma pequena revendedora de cosméticos.

## Requisitos

- Node.js 22+
- npm 10+
- Docker com Docker Compose

## Ambiente local

Instale as dependências e inicie o PostgreSQL:

```bash
npm install
npm run db:up
```

Prepare o banco e o usuário administrador inicial:

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/gestao_pedidos?schema=public'
export INITIAL_ADMIN_PASSWORD='defina-uma-senha-segura'
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
npm run prisma:seed --workspace @gestao-pedidos/backend
```

Inicie backend e frontend em terminais separados:

```bash
DATABASE_URL="$DATABASE_URL" npm run dev:backend
NEXT_PUBLIC_API_URL='http://localhost:3001' npm run dev:frontend
```

O frontend fica disponível em `http://localhost:3000` e a API em `http://localhost:3001/api/v1`.

## Autenticação disponível

- `POST /api/v1/auth/login`: cria a sessão HTTP-only.
- `GET /api/v1/auth/me`: retorna o usuário da sessão atual.
- `POST /api/v1/auth/logout`: revoga a sessão atual e remove o cookie.

## Verificações

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
npm run build
```

Os testes de integração usam PostgreSQL isolado via Testcontainers. O E2E usa o serviço `postgres-e2e` definido no Docker Compose.
