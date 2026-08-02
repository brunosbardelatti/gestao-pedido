# ADR-008 — Estratégia de Autenticação

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

O sistema será utilizado por um pequeno número de usuários autenticados e deverá permitir futuras integrações com agentes de IA e automações.

## Objetivo

Definir uma estratégia de autenticação simples, segura e compatível com uma arquitetura API First.

## Drivers Arquiteturais

- Simplicidade operacional.
- Segurança.
- Baixo custo de manutenção.
- Compatibilidade com navegadores.
- Separação entre autenticação humana e integrações.

## Decisão

Serão adotados dois mecanismos distintos:

### Usuários

- Login com usuário e senha.
- Sessão autenticada através de **cookie HTTP-only**, `Secure` e `SameSite`.
- O frontend nunca terá acesso direto ao cookie.

### Integrações

- API Keys específicas para integrações externas.
- As chaves serão independentes das contas dos usuários.
- Futuramente poderão possuir escopos (read/write).

## Fluxo

```text
Usuário
   │
Login
   │
Backend valida credenciais
   │
Cookie HTTP-only
   │
Requisições autenticadas
```

## Diretrizes

- Senhas armazenadas utilizando Argon2id.
- Nunca armazenar senhas em texto puro.
- Cookies enviados apenas via HTTPS em produção.
- Logout invalida a sessão.
- Redefinição de senha realizada pelo administrador no MVP.

## Auditoria

Todas as operações relevantes registrarão:

- usuário responsável;
- data/hora;
- ação executada.

Os registros ficarão disponíveis apenas em banco neste MVP.

## Impacto

### Positivo

- Menor superfície de ataque.
- Proteção contra acesso ao token por JavaScript.
- Boa experiência para usuários.
- Base preparada para integrações futuras.

### Trade-offs

- Integrações externas não reutilizam a sessão do navegador.
- Gerenciamento de API Keys será necessário em evoluções futuras.

## Alternativas Consideradas

### JWT armazenado no Local Storage

Rejeitado por maior exposição a ataques XSS.

### Um único mecanismo para usuários e integrações

Rejeitado para evitar acoplamento entre navegação web e automações.

## ADRs Relacionados

- ADR-002 — NestJS
- ADR-004 — API First
- ADR-005 — Arquitetura Híbrida
