# Documento 05 — Especificação da API REST (v1)

## Objetivo

Definir os contratos da API REST consumida pelo frontend e por integrações externas.

## Convenções

- Base URL: `/api/v1`
- Formato: JSON UTF-8
- Versionamento por URL.
- Datas em ISO-8601 (UTC).
- UUID para identificadores.

## Autenticação

### Usuários

- Login via usuário e senha.
- Sessão por cookie HTTP-only.

### Integrações

- API Key no header:

```http
X-API-Key: <key>
```

## Resposta de Sucesso

```json
{
  "data": {},
  "meta": {}
}
```

## Resposta de Erro

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Pedido não encontrado."
  }
}
```

## Códigos HTTP

| Código | Uso |
|---------|-----|
|200|Consulta|
|201|Criação|
|204|Sem conteúdo|
|400|Requisição inválida|
|401|Não autenticado|
|403|Sem permissão|
|404|Não encontrado|
|409|Conflito|
|422|Regra de negócio|
|500|Erro interno|

## Recursos

### Auth

| Método | Endpoint | Descrição |
|---------|----------|-----------|
|POST|/auth/login|Autentica usuário|
|POST|/auth/logout|Encerra sessão|
|GET|/auth/me|Usuário autenticado|

---

### Produtos

| Método | Endpoint |
|---------|----------|
|GET|/products|
|GET|/products/{id}|
|POST|/products|
|PUT|/products/{id}|
|PATCH|/products/{id}/active|

---

### Pedidos

| Método | Endpoint |
|---------|----------|
|GET|/orders|
|GET|/orders/{id}|
|POST|/orders|
|PUT|/orders/{id}|
|POST|/orders/{id}/receive|
|POST|/orders/{id}/cancel|

---

### Estoque

| Método | Endpoint |
|---------|----------|
|GET|/inventory|
|GET|/inventory/movements|
|POST|/inventory/adjustments|

---

### Vendas

| Método | Endpoint |
|---------|----------|
|GET|/sales|
|GET|/sales/{id}|
|POST|/sales|
|POST|/sales/{id}/cancel|

---

### Clientes

| Método | Endpoint |
|---------|----------|
|GET|/customers|
|POST|/customers|
|PUT|/customers/{id}|

## Paginação

```http
GET /products?page=1&pageSize=20
```

Resposta:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

## Filtros

Exemplos:

```http
GET /orders?status=OPEN
GET /sales?startDate=2026-01-01&endDate=2026-01-31
GET /products?brand=avon
```

## Idempotência

Operações críticas aceitam:

```http
Idempotency-Key: UUID
```

Aplicável a:

- criação de pedidos;
- recebimento;
- vendas.

## Regras

- Nunca retornar stack trace.
- Nunca retornar password hash.
- Nunca expor cookies.
- Toda regra de negócio deve retornar erro padronizado.

## Próximo Documento

Documento 06 — Convenções de Desenvolvimento.
