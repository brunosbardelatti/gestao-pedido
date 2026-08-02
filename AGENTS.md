# AGENTS.md

## 1. Finalidade

Este arquivo orienta agentes de desenvolvimento, especialmente Codex, sobre como trabalhar neste repositório.

O objetivo é garantir que qualquer alteração:

- respeite a documentação do projeto;
- mantenha a arquitetura definida;
- preserve as regras de negócio;
- inclua testes automatizados;
- não introduza escopo ou tecnologia sem aprovação;
- permaneça simples e adequada ao MVP.

O sistema é uma aplicação web de gestão para uma pequena revendedora de cosméticos.

---

## 2. Visão do Produto

O sistema substitui uma planilha perdida e deve oferecer uma experiência simples, confiável e semelhante a uma planilha moderna.

O MVP cobre:

- autenticação;
- marcas;
- categorias;
- produtos;
- pedidos de compra;
- recebimento de pedidos;
- estoque por movimentações;
- clientes opcionais;
- vendas;
- recibo simples em PDF;
- relatórios básicos;
- auditoria;
- API REST;
- integrações por API Key;
- importação assistida de XML com aprovação humana.

O sistema não deve se transformar em um ERP completo.

---

## 3. Fontes de Verdade

Antes de implementar qualquer funcionalidade, consulte os documentos relevantes.

### Produto

```text
docs/product/PRD.md
docs/product/01-PRD-Tecnico.md
```

### Arquitetura

```text
docs/architecture/02-Arquitetura-Geral-do-Sistema.md
docs/architecture/03-Modelo-de-Dominio.md
docs/architecture/04-Modelo-de-Dados.md
docs/architecture/05-Especificacao-API-REST.md
docs/architecture/06-Convencoes-de-Desenvolvimento.md
```

### Decisões arquiteturais

```text
docs/adr/
```

### Planejamento

```text
docs/planning/07-Roadmap-de-Implementacao.md
docs/planning/08-Plano-Executivo-de-Entrega.md
```

### Especificações funcionais

```text
docs/specifications/
```

### Contrato da API

```text
docs/api/openapi.yaml
```

### Modelo físico do banco

```text
apps/backend/prisma/schema.prisma
```

---

## 4. Precedência entre Documentos

Não resolva divergências silenciosamente.

Use a seguinte regra:

1. Para comportamento funcional, siga a especificação SDD do caso de uso.
2. Para decisões arquiteturais, siga os ADRs.
3. Para contratos HTTP, siga `docs/api/openapi.yaml`.
4. Para persistência, siga `apps/backend/prisma/schema.prisma`.
5. Para convenções de código, siga o documento de convenções.
6. Para escopo e objetivos, siga os PRDs.

Quando dois artefatos entrarem em conflito:

- prefira o documento mais específico;
- prefira uma decisão aceita e numerada em ADR;
- não invente uma terceira solução;
- registre claramente a inconsistência;
- atualize documentação e código na mesma alteração quando a decisão for resolvida.

---

## 5. Stack Obrigatória

### Backend

- Node.js
- TypeScript
- NestJS
- Prisma
- PostgreSQL
- API REST
- OpenAPI / Swagger

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Infraestrutura

- Docker
- Docker Compose
- Railway

### Testes

- Vitest
- Supertest
- Playwright
- Testcontainers

Não substitua essas tecnologias sem novo ADR.

---

## 6. Organização do Repositório

Estrutura esperada:

```text
apps/
├── backend/
└── frontend/

packages/
├── shared-types/
└── shared-utils/

docs/
├── product/
├── architecture/
├── adr/
├── planning/
├── specifications/
└── api/
```

Use o gerenciador de pacotes e a ferramenta de workspace já configurados no repositório.

Não introduza um segundo gerenciador de pacotes.

---

## 7. Arquitetura do Backend

A arquitetura é híbrida:

- Vertical Slice por módulo;
- Clean Architecture dentro de cada módulo.

Módulos principais:

```text
auth
users
brands
categories
products
orders
inventory
customers
sales
reports
audit
integrations
```

Estrutura conceitual de cada módulo:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### Domain

Deve conter:

- entidades;
- objetos de valor;
- regras invariantes;
- erros de domínio;
- contratos de repositório quando necessários.

Não deve importar:

- NestJS;
- Prisma;
- HTTP;
- bibliotecas de interface;
- detalhes de banco de dados.

### Application

Deve conter:

- casos de uso;
- comandos;
- consultas;
- portas;
- DTOs internos;
- coordenação transacional.

Não deve conter detalhes de HTTP.

### Infrastructure

Deve conter:

- Prisma;
- implementações de repositórios;
- hashing;
- geração de PDF;
- armazenamento;
- integrações externas;
- adaptadores.

### Presentation

Deve conter:

- controllers;
- DTOs HTTP;
- guards;
- pipes;
- interceptors;
- presenters.

Controllers devem ser finos.

Controllers não devem conter regras de negócio.

---

## 8. Regras Gerais de Implementação

- Use TypeScript em modo estrito.
- Evite `any`.
- Prefira tipos explícitos nas fronteiras.
- Não exponha entidades do Prisma diretamente pela API.
- Não use modelos de persistência como entidades de domínio.
- Não coloque regras de negócio em controllers.
- Não consulte o Prisma diretamente em controllers.
- Não crie dependências circulares entre módulos.
- Não introduza abstrações sem necessidade real.
- Prefira soluções simples e legíveis.
- Mantenha funções pequenas e focadas.
- Use nomes em inglês no código.
- Use português apenas em textos exibidos ao usuário e documentação de negócio.
- Datas devem ser persistidas em UTC.
- Identificadores devem usar UUID.
- Valores monetários não devem usar `number` para cálculos de domínio sem tratamento decimal explícito.

---

## 9. Regras de Domínio Obrigatórias

### Produtos

- A identidade comercial é composta por marca e código normalizado.
- O mesmo código pode existir em marcas diferentes.
- Produtos não devem ser apagados fisicamente.
- Produtos inativos permanecem disponíveis no histórico.
- Preços atuais pertencem ao cadastro do produto.
- Alterar um produto não pode alterar operações históricas.

### Pedidos

- Um pedido pertence a uma única marca.
- O ciclo é texto livre no MVP.
- Um pedido deve possuir ao menos um item.
- O pedido inicia com status `OPEN`.
- Apenas pedidos `OPEN` podem ser editados.
- O recebimento deve ocorrer em uma única transação.
- O recebimento gera movimentações de entrada de estoque.
- Pedido recebido ou cancelado não deve ser apagado.
- Itens de pedido preservam snapshots de preços.

### Estoque

- O estoque é calculado pela soma das movimentações.
- Não mantenha um campo de saldo editável como fonte de verdade.
- Movimentações são imutáveis.
- Correções devem gerar novas movimentações.
- Entradas usam quantidade positiva.
- Saídas usam quantidade negativa.
- Estoque negativo é permitido somente com aviso e confirmação explícita.
- Não implementar alocação de venda por lote no MVP.
- Validade pertence ao item recebido.
- Relatório de vencimento é indicativo porque não há consumo por lote.

Tipos de movimentação:

```text
PURCHASE
SALE
SALE_CANCELLATION
CORRECTION
PERSONAL_USE
RETURN
```

### Vendas

- Cliente é opcional.
- Forma de pagamento é opcional.
- Preço sugerido vem do produto, mas pode ser alterado manualmente.
- Desconto é representado pelo preço efetivamente informado no item.
- A venda deve preservar o preço unitário vendido.
- A venda deve preservar o custo utilizado para cálculo de margem.
- A criação da venda e a baixa de estoque devem ser transacionais.
- Cancelamento gera movimentações de estorno.
- Venda não deve ser apagada fisicamente.
- O recibo em PDF não é documento fiscal.

### Clientes

- Cadastro de cliente é opcional para a venda.
- Colete somente os dados necessários.
- Evite obrigatoriedade de CPF, telefone ou endereço.

### Integrações

- API Keys são independentes das sessões humanas.
- Armazene somente o hash da chave.
- O segredo deve ser exibido uma única vez.
- Chaves devem poder ser revogadas.
- Importação de XML deve criar rascunho.
- Importação nunca deve movimentar estoque automaticamente.
- Aprovação humana é obrigatória antes da criação definitiva do pedido.
- Aprovar o pedido importado ainda não significa recebê-lo.

---

## 10. Transações e Concorrência

Use transações para operações que precisam ser atômicas.

Obrigatoriamente transacionais:

- recebimento de pedido;
- criação de venda;
- cancelamento de venda;
- ajustes críticos de estoque;
- aprovação de importação quando criar múltiplos registros relacionados.

Uma falha no meio da operação não pode deixar:

- pedido recebido sem movimentação;
- movimentação sem item de origem;
- venda sem todos os itens;
- baixa parcial de estoque;
- estorno parcial.

Considere concorrência em operações de estoque.

Não confie apenas no saldo calculado antes da transação.

---

## 11. Idempotência

Operações críticas devem aceitar `Idempotency-Key` conforme o OpenAPI.

Casos principais:

- criar pedido;
- receber pedido;
- registrar venda;
- cancelar venda;
- ajustar estoque;
- importar XML;
- aprovar pedido importado.

Comportamento esperado:

- a mesma chave e o mesmo payload retornam o resultado anterior;
- a mesma chave com payload diferente retorna conflito;
- requisições em processamento não criam duplicatas;
- registros expirados podem ser removidos por rotina controlada.

---

## 12. Segurança

### Autenticação humana

- Login e senha.
- Sessão por cookie HTTP-only.
- Cookie `Secure` em produção.
- Configurar `SameSite` adequadamente.
- Nunca retornar hash de senha.
- Nunca registrar senha em logs.
- Usar algoritmo de hash seguro, preferencialmente Argon2id.
- Redefinição de senha é manual pelo administrador no MVP.

### Autorização

Perfis mínimos:

```text
ADMIN
OPERATOR
```

Não implemente sistema complexo de permissões sem novo requisito ou ADR.

### API Keys

- Nunca persistir a chave em texto puro.
- Nunca exibir novamente o segredo.
- Validar situação e validade.
- Registrar utilização relevante em auditoria.

### Dados pessoais

- Aplicar minimização de dados.
- Não registrar CPF, telefone ou endereço completo em logs.
- Não expor dados pessoais em mensagens de erro.

---

## 13. Auditoria

Registre operações relevantes, incluindo:

- criação e alteração de produtos;
- criação, recebimento e cancelamento de pedidos;
- ajustes de estoque;
- criação e cancelamento de vendas;
- redefinição de senha;
- criação e revogação de API Keys;
- importações e aprovações;
- operações administrativas.

A auditoria deve informar, quando aplicável:

- tipo do ator;
- usuário ou API Key;
- ação;
- entidade;
- identificador da entidade;
- data e hora;
- Request ID;
- metadados seguros.

Não armazene segredos ou dados pessoais desnecessários nos metadados.

---

## 14. API REST

O contrato está em:

```text
docs/api/openapi.yaml
```

Toda alteração de endpoint deve atualizar o OpenAPI na mesma entrega.

Regras:

- Prefixo `/api/v1`.
- JSON para requisições e respostas, exceto arquivos.
- Datas em ISO-8601.
- Valores monetários serializados como string decimal.
- Erros em envelope padronizado.
- Paginação padronizada.
- Request ID nos logs e respostas.
- Não expor stack trace.
- Não inventar endpoints fora do contrato sem atualizar a especificação.

Formato de sucesso esperado:

```json
{
  "data": {}
}
```

Formato paginado esperado:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Formato de erro esperado:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Recurso não encontrado.",
    "requestId": "..."
  }
}
```

---

## 15. Prisma e Banco de Dados

Modelo:

```text
apps/backend/prisma/schema.prisma
```

Regras:

- Não usar `prisma db push` em produção.
- Mudanças estruturais devem gerar migration versionada.
- Nunca editar uma migration já aplicada.
- Não remover dados históricos por cascade sem análise explícita.
- Manter `onDelete: Restrict` em registros de negócio históricos.
- Usar `Decimal` para valores monetários.
- Normalizar valores usados em constraints de unicidade.
- Adicionar índices com base em consultas reais.
- Não duplicar saldo de estoque como fonte de verdade.

Após alterações:

```bash
npx prisma format --schema apps/backend/prisma/schema.prisma
npx prisma validate --schema apps/backend/prisma/schema.prisma
```

Ao criar migration:

```bash
npx prisma migrate dev --schema apps/backend/prisma/schema.prisma --name <descricao>
```

Revise manualmente a migration SQL.

Adicione `CHECK CONSTRAINTS` quando o Prisma não representar diretamente uma regra importante.

---

## 16. Testes

Nenhuma funcionalidade crítica está concluída sem testes.

### Unitários

Testar:

- entidades;
- objetos de valor;
- regras de domínio;
- casos de uso;
- cálculos;
- transições de status;
- validações de estoque;
- idempotência.

### Integração

Testar:

- repositórios Prisma;
- transações;
- migrations;
- constraints;
- endpoints;
- autenticação;
- autorização;
- serialização.

Use banco real isolado com Testcontainers quando necessário.

### End-to-End

Testar os fluxos principais:

1. autenticar;
2. cadastrar marca, categoria e produto;
3. criar pedido;
4. receber pedido;
5. consultar estoque;
6. registrar venda;
7. cancelar venda;
8. verificar estorno;
9. consultar relatórios.

### Regressão obrigatória

Sempre crie teste para corrigir um bug.

O teste deve falhar antes da correção e passar depois.

---

## 17. Frontend

O frontend é cliente independente da API REST.

Regras:

- Não acessar banco diretamente.
- Não duplicar regras críticas do backend.
- Validar formulários para experiência do usuário, mas repetir validação no backend.
- Gerar tipos a partir do OpenAPI quando o fluxo for configurado.
- Usar componentes shadcn/ui e Tailwind.
- Priorizar desktop sem impedir uso em telas móveis.
- Manter aparência simples, próxima de uma planilha moderna.
- Evitar dashboards complexos no MVP.
- Exibir alertas claros para estoque negativo.
- Exigir confirmação explícita quando a operação puder gerar estoque negativo.
- Tratar estados de carregamento, vazio e erro.

---

## 18. Logs e Observabilidade

Logs devem ser estruturados.

Cada requisição deve possuir Request ID.

Registrar:

- método;
- rota;
- status;
- duração;
- ator;
- erro sanitizado;
- operação de negócio relevante.

Não registrar:

- senhas;
- tokens;
- cookies;
- API Keys;
- XML completo sem sanitização;
- dados pessoais desnecessários.

Endpoints mínimos:

```text
GET /api/v1/health
GET /api/v1/health/ready
```

---

## 19. Fluxo de Trabalho para Cada Especificação

Antes de implementar:

1. Leia a especificação em `docs/specifications/`.
2. Leia ADRs relacionados.
3. Confira o contrato em `docs/api/openapi.yaml`.
4. Confira o modelo em `schema.prisma`.
5. Liste regras e cenários de erro.
6. Escreva ou atualize testes.
7. Implemente a menor solução completa.
8. Execute verificações.
9. Atualize documentação afetada.

Não implemente uma pasta inteira de uma vez quando puder entregar um caso de uso vertical completo.

Prefira slices pequenos, por exemplo:

```text
create-brand
list-brands
update-brand
deactivate-brand
```

---

## 20. Definition of Done

Uma tarefa só está concluída quando:

- a especificação foi atendida;
- regras de negócio estão fora dos controllers;
- testes relevantes foram adicionados;
- todos os testes passam;
- lint passa;
- typecheck passa;
- Prisma valida;
- migration foi revisada quando aplicável;
- OpenAPI foi atualizado quando aplicável;
- documentação foi atualizada;
- logs não expõem informações sensíveis;
- auditoria foi considerada;
- idempotência foi considerada;
- nenhum TODO crítico ficou escondido.

---

## 21. Verificações Antes de Finalizar

Execute os comandos disponíveis no projeto equivalentes a:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
```

Para Prisma:

```bash
npx prisma format --schema apps/backend/prisma/schema.prisma
npx prisma validate --schema apps/backend/prisma/schema.prisma
```

Não invente scripts ausentes.

Quando um script não existir:

- informe claramente;
- crie-o apenas se fizer parte da tarefa;
- mantenha o padrão do workspace.

---

## 22. Proibições

Não faça nenhuma destas ações sem aprovação explícita:

- trocar NestJS, Next.js, Prisma ou PostgreSQL;
- adicionar GraphQL;
- criar microsserviços;
- adicionar filas ou mensageria sem necessidade documentada;
- implementar financeiro completo;
- implementar contas a receber;
- emitir documento fiscal;
- criar sistema complexo de permissões;
- adicionar suporte offline;
- apagar pedidos, vendas ou movimentações;
- manter saldo de estoque editável como fonte de verdade;
- receber automaticamente pedido importado;
- armazenar senha, token ou API Key em texto puro;
- ignorar o OpenAPI;
- alterar regras de domínio apenas para simplificar uma implementação.

---

## 23. Política de Dependências

Antes de adicionar uma biblioteca:

1. Verifique se a plataforma já oferece a capacidade.
2. Verifique se existe biblioteca equivalente no repositório.
3. Avalie manutenção, licença e segurança.
4. Evite dependências para tarefas triviais.
5. Documente dependências arquiteturalmente relevantes.

Não atualize versões principais de dependências sem necessidade da tarefa.

---

## 24. Commits e Alterações

Mantenha alterações pequenas e coerentes.

Não misture:

- refatoração ampla;
- funcionalidade nova;
- atualização massiva de dependências;
- formatação de arquivos não relacionados.

Mensagens de commit recomendadas:

```text
feat(products): create product use case
fix(inventory): prevent duplicate sale movement
test(orders): cover idempotent receiving
docs(api): update sale cancellation contract
refactor(auth): isolate password hashing adapter
```

---

## 25. Relatório Final do Agente

Ao concluir uma tarefa, informe:

- o que foi implementado;
- arquivos principais alterados;
- testes adicionados;
- comandos executados;
- resultado dos testes;
- migrations criadas;
- documentação atualizada;
- riscos, limitações ou pendências reais.

Não declare sucesso sem executar as verificações disponíveis.

Se algo não puder ser validado, diga exatamente o que ficou sem validação.

---

## 26. Princípio Final

Este projeto deve permanecer:

- simples;
- confiável;
- auditável;
- testável;
- extensível;
- coerente com a documentação.

A melhor implementação não é a mais sofisticada.

É a menor implementação correta que atende às regras aprovadas e mantém o sistema fácil de evoluir.
