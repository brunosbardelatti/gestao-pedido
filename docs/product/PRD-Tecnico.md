# Documento 01 — PRD Técnico

**Sistema:** Gestão de Pedidos para Revendedora de Cosméticos  
**Versão:** 1.0

## 1. Objetivo

Definir a especificação técnica do MVP do sistema, estabelecendo arquitetura, tecnologias, princípios de desenvolvimento e requisitos não funcionais que servirão de base para implementação.

## 2. Objetivo do Produto

Substituir a planilha atual por uma aplicação web simples, confiável e extensível, mantendo o fluxo operacional da usuária e reduzindo retrabalho.

## 3. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js, TypeScript, NestJS |
| Frontend | Next.js, React, TypeScript, shadcn/ui, Tailwind CSS |
| Banco de Dados | PostgreSQL |
| ORM | Prisma |
| Infraestrutura | Railway, Docker, Docker Compose |
| Documentação da API | OpenAPI / Swagger |

## 4. Arquitetura

Será utilizada uma arquitetura híbrida entre **Clean Architecture** e **Vertical Slice**.

Cada módulo (Produtos, Pedidos, Estoque, Vendas, Clientes, Autenticação e Auditoria) será organizado nas seguintes camadas:

- Domain
- Application
- Infrastructure
- Presentation

**Controllers não conterão regras de negócio.**

## 5. Organização do Monorepo

```text
apps/
  frontend/
  backend/

packages/
  shared-types/
  shared-utils/

docs/
  product/
  architecture/
  adr/
  planning/
  specifications/
```

## 6. Comunicação

- Frontend consumirá exclusivamente a API REST.
- Arquitetura API First.
- API preparada para consumo por agentes de IA e integrações externas.

## 7. Segurança

- Login e senha.
- Sessão segura via Cookie HTTP-only.
- Contas individuais.
- Redefinição manual de senha pelo administrador.
- Auditoria persistida em banco de dados.

## 8. Persistência

- PostgreSQL.
- Backup diário.
- Produtos armazenam informações permanentes.
- Itens de pedido armazenam snapshots históricos.
- Estoque baseado em movimentações.

## 9. Desenvolvimento

- Specification-Driven Development (SDD).
- Test-Driven Development (TDD) para regras críticas.
- Testes unitários.
- Testes de integração.
- Testes End-to-End.

## 10. Escopo do MVP

- Cadastro de Produtos
- Pedidos
- Recebimento de Pedidos
- Controle de Estoque
- Vendas
- Clientes (opcional)
- Relatórios básicos
- API REST documentada

## 11. Integrações Futuras

- API preparada para ChatGPT, Gemini e outros agentes.
- Importação assistida de XML via IA.
- Revisão humana obrigatória antes da confirmação.

## 12. Fora do Escopo

- ERP completo.
- Financeiro.
- Contas a receber.
- Emissão fiscal.
- Funcionamento offline.
- Perfis avançados de permissão.
- Dashboards avançados.

---

> Este documento consolida as decisões técnicas do projeto. As decisões arquiteturais detalhadas encontram-se na pasta `docs/adr/`, enquanto as especificações funcionais estão em `docs/specifications/`.
