# ADR-012 — Infraestrutura e Deploy (Docker + Railway)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O sistema será uma aplicação web de pequeno porte, hospedada na Railway, priorizando simplicidade operacional, baixo custo e facilidade de manutenção.

## Objetivo

Definir uma estratégia única para desenvolvimento local, empacotamento e deploy, garantindo que o ambiente de desenvolvimento seja o mais próximo possível do ambiente de produção.

## Drivers Arquiteturais

- Baixo custo.
- Facilidade de deploy.
- Reprodutibilidade.
- Simplicidade operacional.
- Evolução futura.

## Decisão

Adotar:

- Docker para empacotamento das aplicações.
- Docker Compose para desenvolvimento local.
- Railway como plataforma oficial de hospedagem.
- PostgreSQL gerenciado na Railway, preferencialmente em região no Brasil quando disponível.

## Ambientes

### Desenvolvimento

- Docker Compose
- Backend
- Frontend
- PostgreSQL

### Produção

- Railway
- Banco PostgreSQL gerenciado
- Deploy automatizado a partir do repositório Git

Não haverá ambiente de homologação no MVP.

## Estrutura

```text
docker/
docker-compose.yml

apps/
  frontend/
  backend/
```

## Diretrizes

- Todas as aplicações devem iniciar via Docker.
- Configurações por variáveis de ambiente.
- Segredos nunca serão versionados.
- Imagens de produção devem ser enxutas.
- Health checks devem ser expostos pelo backend.

## Backup

- Backup diário do banco.
- Retenção mínima de 30 dias.
- Possibilidade de restauração completa.

## Benefícios

- Ambiente consistente entre desenvolvimento e produção.
- Facilidade para novos desenvolvedores.
- Deploy simplificado.
- Baixo custo de infraestrutura.

## Trade-offs

- Dependência da Railway para o ambiente de produção.
- Necessidade de manutenção das imagens Docker.

## Alternativas Consideradas

### Deploy sem containers

Rejeitado por reduzir a reprodutibilidade.

### Kubernetes

Rejeitado por adicionar complexidade desnecessária ao MVP.

### VPS própria

Rejeitada neste momento devido ao maior custo operacional.

## ADRs Relacionados

- ADR-001 — Monorepo
- ADR-006 — PostgreSQL
- ADR-007 — Prisma ORM
- ADR-011 — SDD + TDD
