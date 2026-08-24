import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { isPasswordPolicyValid } from '../dto/register.dto';

@Injectable()
export class PasswordService {
  // Paramètres Argon2id stricts selon D-09 / §29.1 : m=64 Mio, t=3, p=4
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024, // 65536 KB = 64 MiB
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  validatePolicy(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length < 12) {
      errors.push('Le mot de passe doit contenir au moins 12 caractères.');
    }

    if (!isPasswordPolicyValid(password)) {
      errors.push(
        'Le mot de passe doit combiner au moins 3 classes parmi : minuscules, majuscules, chiffres, caractères spéciaux.',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
