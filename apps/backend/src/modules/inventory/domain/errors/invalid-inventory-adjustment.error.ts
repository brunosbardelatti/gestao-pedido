export class InvalidInventoryAdjustmentError extends Error {
  readonly code = 'INVALID_INVENTORY_ADJUSTMENT';

  constructor() {
    super('O ajuste de estoque informado é inválido.');
  }
}
