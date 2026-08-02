# Documentação — Sistema de Gestão para Revendedora de Cosméticos

Este diretório concentra toda a documentação funcional, arquitetural e técnica do projeto.

## Estrutura

```text
docs/
├── product/
├── architecture/
├── adr/
├── planning/
├── specifications/
└── api/
    └── openapi.yaml
```

## Ordem recomendada de leitura

### Produto

1. `product/PRD.md`
2. `product/PRD-Tecnico.md`

### Arquitetura

3. `adr/`
4. `architecture/02-Arquitetura-Geral-do-Sistema.md`
5. `architecture/03-Modelo-de-Dominio.md`
6. `architecture/04-Modelo-de-Dados.md`
7. `architecture/05-Especificacao-API-REST.md`
8. `architecture/06-Convencoes-de-Desenvolvimento.md`

### Planejamento

9. `planning/07-Roadmap-de-Implementacao.md`
10. `planning/08-Plano-Executivo-de-Entrega.md`

### API

11. `api/openapi.yaml` — Especificação contratual da API (OpenAPI 3.x)

### Implementação

12. `specifications/`

## Objetivo da documentação

- Registrar decisões arquiteturais.
- Definir regras de negócio.
- Guiar a implementação.
- Servir como fonte de verdade do projeto.
- Apoiar desenvolvimento orientado por IA (SDD + TDD).

## Convenções

- Documentação em Markdown.
- ADRs registram decisões permanentes.
- Especificações funcionais descrevem casos de uso.
- Alterações de regras de negócio devem atualizar primeiro a documentação.
