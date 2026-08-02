export class OrderBrandInactiveError extends Error {
  readonly code = 'ORDER_BRAND_INACTIVE';

  constructor() {
    super('A marca informada está inativa e não pode receber novos pedidos.');
    this.name = 'OrderBrandInactiveError';
  }
}
