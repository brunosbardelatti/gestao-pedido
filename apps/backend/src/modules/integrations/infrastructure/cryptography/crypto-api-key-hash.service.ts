import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type {
  ApiKeyHashService,
  GeneratedApiKey,
} from '../../application/ports/api-key-hash.service';

@Injectable()
export class CryptoApiKeyHashService implements ApiKeyHashService {
  generate(): GeneratedApiKey {
    const plainText = randomBytes(32).toString('base64url');
    const prefix = plainText.slice(0, 8);

    return {
      plainText,
      prefix,
      hash: this.hash(plainText),
    };
  }

  hash(plainText: string): string {
    return createHash('sha256').update(plainText).digest('hex');
  }
}
