# ADR-003 — Adoção do Next.js

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O sistema terá uma interface web simples, com foco na produtividade da usuária e consumo exclusivo da API REST do backend.

O frontend deve permanecer desacoplado da camada de negócio para permitir evolução independente e futuras integrações.

## Problema

Escolher uma tecnologia que ofereça:

- Excelente experiência de desenvolvimento;
- Organização escalável;
- Boa integração com React e TypeScript;
- Facilidade de deploy;
- Compatibilidade com componentes modernos.

## Decisão

Adotar **Next.js** como framework oficial do frontend.

O frontend será tratado como um cliente independente da API REST, sem acesso direto ao banco de dados.

## Motivação

- Ecossistema maduro.
- Excelente integração com React.
- Estrutura organizada para aplicações de médio porte.
- Ótima experiência com TypeScript.
- Facilidade de deploy.
- Suporte à evolução futura sem mudanças estruturais.

## Diretrizes

- Toda comunicação ocorrerá via API REST.
- Nenhuma regra de negócio ficará no frontend.
- O frontend será responsável apenas por:
  - apresentação;
  - validação de interface;
  - gerenciamento de estado da UI;
  - experiência do usuário.

## Tecnologias complementares

- React
- TypeScript
- shadcn/ui
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query

## Consequências Positivas

- Separação clara entre frontend e backend.
- Componentização reutilizável.
- Interface consistente.
- Facilidade para manutenção.

## Consequências Negativas

- Necessidade de manter dois projetos (frontend e backend), embora no mesmo monorepo.

## Alternativas Consideradas

### React + Vite

Rejeitado por oferecer menos recursos nativos para evolução da aplicação.

### SPA acoplada ao backend

Rejeitado para preservar a arquitetura API First.

## Relação com outros ADRs

- ADR-001 — Monorepo
- ADR-002 — NestJS
- ADR-004 — API First
- ADR-005 — Arquitetura Híbrida
