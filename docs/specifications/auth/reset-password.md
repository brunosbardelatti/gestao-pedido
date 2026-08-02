# Redefinição manual de senha

- **Status:** Aceita
- **Domínio:** auth
- **Tipo:** Especificação Funcional SDD
- **Versão:** 1.1

## Objetivo

Permitir que um administrador redefina manualmente a senha de outro usuário.

## Atores

- Usuário autenticado.
- Integração autenticada, quando aplicável.

## Pré-condições

- Aplicação disponível.
- Ator autenticado e autorizado.
- Dados de referência existentes quando exigidos.

## Regras de Negócio

- Não haverá recuperação automática por e-mail no MVP.
- Somente um administrador autenticado por sessão pode executar a operação.
- O administrador deve redefinir a senha de outro usuário, não a própria.
- A nova senha deve possuir entre 8 e 128 caracteres.
- A nova senha deve ser armazenada somente como hash.
- A alteração da senha e a auditoria devem ocorrer na mesma transação.
- A operação deve registrar auditoria `USER_PASSWORD_RESET` com administrador, usuário alvo e Request ID.

## Fluxo Principal

1. O ator inicia a operação.
2. O sistema valida autenticação, entrada e pré-condições.
3. O caso de uso executa as regras de negócio.
4. O sistema persiste as alterações em uma única transação quando necessário.
5. O sistema registra auditoria.
6. O sistema retorna uma resposta padronizada.

## Fluxos Alternativos e Erros

- Dados inválidos retornam `400 Bad Request`.
- Sessão ausente ou inválida retorna `401 Unauthorized`.
- Usuário sem perfil de administrador retorna `403 Forbidden`.
- Usuário alvo inexistente retorna `404 Not Found`.
- Tentativa de redefinir a própria senha retorna `422 Unprocessable Entity`.
- Conflito de unicidade ou idempotência retorna `409 Conflict`.
- Violação de regra de negócio retorna `422 Unprocessable Entity`.
- Erros internos não expõem stack trace.

## Critérios de Aceite

- Administrador consegue redefinir a senha.
- Usuário comum não consegue redefinir senha de terceiros.
- A senha anterior deixa de autenticar e a nova senha passa a autenticar.
- Tentativas rejeitadas não alteram a senha nem registram auditoria de redefinição.

## Cenários de Teste

```gherkin
Scenario: Operação realizada com sucesso
  Given que o ator está autenticado
  And que os dados informados são válidos
  When a operação é solicitada
  Then o sistema deve concluir a ação
  And registrar auditoria
  And retornar o código HTTP esperado

Scenario: Dados inválidos
  Given que o ator está autenticado
  When a operação é solicitada com dados inválidos
  Then o sistema deve rejeitar a operação
  And não persistir alterações parciais
```

## Endpoints Relacionados

- `POST /api/v1/users/{id}/reset-password`

## Entidades Impactadas

A implementação deve identificar e atualizar apenas as entidades e agregados necessários, respeitando os ADRs de arquitetura, persistência, auditoria e estoque.

## Eventos de Domínio

Eventos devem ser adicionados somente quando trouxerem valor real à coordenação entre módulos ou auditoria.

## Requisitos Não Funcionais

- Resposta JSON padronizada, exceto downloads.
- Datas em ISO-8601 UTC.
- Logs estruturados com Request ID.
- Testes unitários para regras críticas.
- Testes de integração para persistência e endpoint.
- Idempotência em operações críticas, quando definida.

## Definition of Done

- Especificação aprovada.
- Testes automatizados implementados e passando.
- Endpoint documentado no OpenAPI.
- Auditoria registrada quando aplicável.
- Documentação atualizada.
