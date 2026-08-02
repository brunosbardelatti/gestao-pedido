# ADR-014 — Estratégia de Backup e Recuperação de Dados

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O projeto nasceu após a perda da planilha que armazenava todo o histórico da operação da cliente. A ausência de backups gerou retrabalho e motivou a criação do sistema.

## Objetivo

Garantir que os dados do sistema possam ser recuperados em caso de falha operacional, erro humano ou indisponibilidade da infraestrutura.

## Drivers Arquiteturais

- Confiabilidade.
- Continuidade do negócio.
- Baixo custo.
- Simplicidade operacional.
- Recuperação rápida.

## Decisão

Adotar uma estratégia de backup baseada nos recursos nativos da Railway e do PostgreSQL, complementada por boas práticas de recuperação.

## Estratégia

### Banco de Dados

- Backup automático diário.
- Retenção mínima de 30 dias.
- Armazenamento gerenciado pelo provedor.

### Recuperação

Em caso de incidente:

1. Identificar o ponto de restauração.
2. Restaurar o banco em ambiente seguro.
3. Validar integridade dos dados.
4. Publicar novamente o ambiente.

## Diretrizes

- Toda alteração estrutural será realizada por migrations versionadas.
- Backups não substituem migrations.
- Nunca executar alterações diretamente em produção.
- Testes periódicos de restauração devem ser realizados.

## Responsabilidades

### Aplicação

- Garantir consistência transacional.
- Evitar corrupção de dados.

### Infraestrutura

- Garantir execução dos backups automáticos.
- Disponibilizar restauração quando necessária.

## Benefícios

- Redução do risco de perda de dados.
- Recuperação simplificada.
- Continuidade operacional.
- Baixo custo de manutenção.

## Trade-offs

- Dependência da política de backup do provedor.
- Restaurações exigem validação antes da retomada da operação.

## Alternativas Consideradas

### Sem política formal de backup

Rejeitada por repetir a causa que originou o projeto.

### Backups totalmente manuais

Rejeitada por depender da disciplina operacional do usuário.

### Infraestrutura própria para backups

Adiada por aumentar custo e complexidade do MVP.

## ADRs Relacionados

- ADR-006 — PostgreSQL
- ADR-012 — Infraestrutura e Deploy
- ADR-013 — Observabilidade, Logs e Tratamento de Erros
