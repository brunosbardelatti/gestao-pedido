export class InvalidNfeXmlError extends Error {
  readonly code = 'INVALID_NFE_XML';
  constructor(reason: string) {
    super(`XML de NF-e inválido: ${reason}`);
  }
}
