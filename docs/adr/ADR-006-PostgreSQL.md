# ADR-006 — PostgreSQL como Banco de Dados Oficial

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O sistema necessita de persistência confiável para substituir definitivamente a planilha utilizada pela cliente. O banco deve garantir integridade dos dados, suporte transacional e baixo custo operacional.

## Problema

Selecionar um banco de dados relacional que:

- seja amplamente suportado pelo ecossistema Node.js;
- integre-se ao Prisma ORM;
- possua excelente custo-benefício;
- seja compatível com a infraestrutura da Railway;
- permita crescimento futuro sem mudanças arquiteturais.

## Decisão

Adotar **PostgreSQL** como banco de dados oficial do sistema.

## Motivação

- Banco relacional maduro e consolidado.
- Excelente integração com Prisma.
- Suporte completo a transações ACID.
- Índices avançados e consultas eficientes.
- Compatível com hospedagem na Railway.
- Baixo custo para aplicações de pequeno porte.

## Diretrizes

- Toda persistência será realizada através do Prisma ORM.
- O acesso direto ao banco é proibido fora da camada Infrastructure.
- Todas as alterações de schema serão versionadas por migrations.
- Chaves primárias utilizarão UUID.
- Datas serão armazenadas em UTC.

## Modelagem

O modelo de dados seguirá princípios de normalização, preservando histórico através de snapshots em itens de pedido e movimentações de estoque.

## Backup

- Backup automático diário.
- Retenção mínima de 30 dias.
- Possibilidade de restauração completa do banco.

## Consequências Positivas

- Alta confiabilidade.
- Facilidade de manutenção.
- Escalabilidade suficiente para o projeto.
- Excelente compatibilidade com ferramentas modernas.

## Consequências Negativas

- Requer gerenciamento de migrations.
- Exige atenção à modelagem para manter desempenho.

## Alternativas Consideradas

### SQLite

Rejeitado por limitações de concorrência e escalabilidade.

### MySQL

Rejeitado por menor aderência ao ecossistema escolhido e preferência do projeto.

### MongoDB

Rejeitado por não refletir adequadamente o domínio relacional da aplicação.

## Relação com outros ADRs

- ADR-001 — Monorepo
- ADR-002 — NestJS
- ADR-004 — API First
- ADR-005 — Arquitetura Híbrida
- ADR-007 — Prisma ORM
