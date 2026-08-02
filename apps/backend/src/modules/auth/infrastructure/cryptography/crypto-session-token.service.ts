import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type {
  GeneratedSessionToken,
  SessionTokenService,
} from '../../application/ports/session-token.service';

@Injectable()
export class CryptoSessionTokenService implements SessionTokenService {
  generate(): GeneratedSessionToken {
    const plainText = randomBytes(32).toString('base64url');

    return {
      plainText,
      hash: this.hash(plainText),
    };
  }

  hash(plainText: string): string {
    return createHash('sha256').update(plainText).digest('hex');
  }
}
