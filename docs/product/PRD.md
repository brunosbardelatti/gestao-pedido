# PRD — Sistema de Gestão para Revendedora de Cosméticos

## Visão Geral

Sistema web para substituir a planilha utilizada por uma revendedora de cosméticos (Avon, Natura e futuras marcas), mantendo a simplicidade do fluxo atual e eliminando os riscos de perda de dados.

## Problema

O controle da operação era realizado por uma planilha armazenada apenas em um pen drive. Após sua perda, foi necessário recuperar parcialmente os dados e relançar diversos pedidos manualmente.

O sistema nasce para oferecer:

- Persistência confiável.
- Controle de estoque automático.
- Registro de pedidos e vendas.
- Relatórios básicos.
- Base preparada para crescimento.

## Objetivos do MVP

- Cadastro de produtos, marcas e categorias.
- Registro de pedidos de compra.
- Recebimento de pedidos com entrada automática em estoque.
- Controle de estoque por movimentações.
- Registro de vendas com baixa automática.
- Cadastro simples de clientes.
- Alertas de vencimento.
- Relatórios básicos de vendas, estoque e margem.

## Escopo

### Incluído

- Produtos
- Marcas
- Categorias
- Pedidos
- Estoque
- Clientes
- Vendas
- Relatórios
- Login
- Auditoria
- API REST

### Fora do escopo

- NF-e
- Controle financeiro completo
- Contas a receber (fiado)
- Perfis complexos de usuários
- Importação por planilha dentro do sistema

## Usuários

Inicialmente:

- Proprietária
- Marido

O sistema, porém, será preparado para suportar múltiplos usuários.

## Princípios

- Simplicidade acima de tudo.
- Fluxo semelhante ao da planilha.
- Poucos cliques.
- Interface limpa.
- Regras de negócio centralizadas no backend.
- API First.

## Fluxo Principal

1. Cadastrar produtos.
2. Criar pedido.
3. Receber pedido.
4. Atualizar estoque automaticamente.
5. Registrar venda.
6. Baixar estoque automaticamente.
7. Consultar relatórios.

## Evoluções Previstas

- Importação assistida por IA via XML.
- Integrações externas pela API.
- Aplicativo móvel.
- Relatórios avançados.
- Dashboard gerencial.

## Documentos Relacionados

- PRD Técnico
- ADRs
- Arquitetura
- Especificações Funcionais (SDD)
