# Especificações Funcionais — SDD

Este pacote contém as especificações funcionais do MVP do sistema de Gestão de Pedidos.

## Como utilizar

1. Leia os ADRs e o modelo de domínio antes de implementar.
2. Escolha uma especificação funcional.
3. Valide regras, critérios de aceite e dependências.
4. Escreva os testes primeiro para regras críticas.
5. Implemente o caso de uso.
6. Atualize OpenAPI e documentação.

## Organização

- [Auth](auth/README.md)
- [Brands](brands/README.md)
- [Categories](categories/README.md)
- [Products](products/README.md)
- [Orders](orders/README.md)
- [Inventory](inventory/README.md)
- [Customers](customers/README.md)
- [Sales](sales/README.md)
- [Reports](reports/README.md)
- [Integrations](integrations/README.md)

## Convenções

- Uma especificação representa um caso de uso.
- O status inicial é `Proposta`.
- Após revisão, alterar para `Aceito`.
- Alterações relevantes de regra devem atualizar a especificação antes do código.
- Operações críticas devem ser transacionais, auditadas e idempotentes quando indicado.
