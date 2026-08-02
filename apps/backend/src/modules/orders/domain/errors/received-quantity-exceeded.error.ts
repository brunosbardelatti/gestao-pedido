export class ReceivedQuantityExceededError extends Error {
  readonly code = 'RECEIVED_QUANTITY_EXCEEDED';

  constructor() {
    super('A quantidade recebida não pode exceder a quantidade pedida.');
    this.name = 'ReceivedQuantityExceededError';
  }
}
