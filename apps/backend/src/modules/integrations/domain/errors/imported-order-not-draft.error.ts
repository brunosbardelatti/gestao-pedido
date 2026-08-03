export class ImportedOrderNotDraftError extends Error {
  readonly code = 'IMPORTED_ORDER_NOT_DRAFT';
  constructor() {
    super('Somente rascunhos podem ser aprovados ou rejeitados.');
  }
}
