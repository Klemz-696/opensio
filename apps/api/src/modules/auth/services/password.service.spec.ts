import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  describe('Hachage et Vérification Argon2id (D-09 / §29.1)', () => {
    it('génère un hash Argon2id valide et vérifie le mot de passe en clair', async () => {
      const password = 'SuperSecret123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
      expect(hash).toContain('m=65536');
      expect(hash).toContain('t=3');
      expect(hash).toContain('p=4');

      const isValid = await service.verify(hash, password);
      expect(isValid).toBe(true);
    });

    it('rejette un mauvais mot de passe', async () => {
      const password = 'SuperSecret123!';
      const hash = await service.hash(password);

      const isValid = await service.verify(hash, 'MauvaisMotDePasse456!');
      expect(isValid).toBe(false);
    });
  });

  describe('Politique de mot de passe (≥ 12 caractères et ≥ 3 classes)', () => {
    it('valide un mot de passe fort conforme', () => {
      const result = service.validatePolicy('CorrectP@ssword1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejette un mot de passe trop court (< 12 caractères)', () => {
      const result = service.validatePolicy('Short1!Aa');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('12 caractères'))).toBe(true);
    });

    it('rejette un mot de passe avec seulement 2 classes de caractères', () => {
      // 14 caractères mais seulement minuscules et chiffres (2 classes)
      const result = service.validatePolicy('alllowercase12345');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('3 classes'))).toBe(true);
    });

    it('valide différentes combinaisons de 3 classes', () => {
      // Minuscules + Majuscules + Chiffres
      expect(service.validatePolicy('Abcdefghijk1').valid).toBe(true);
      // Minuscules + Majuscules + Spéciaux
      expect(service.validatePolicy('Abcdefghijk!').valid).toBe(true);
      // Minuscules + Chiffres + Spéciaux
      expect(service.validatePolicy('abcdefghijk1!').valid).toBe(true);
      // Majuscules + Chiffres + Spéciaux
      expect(service.validatePolicy('ABCDEFGHIJK1!').valid).toBe(true);
    });
  });

  describe('Jetons sécurisés et hachage SHA-256', () => {
    it('génère un jeton aléatoire de 256 bits (64 caractères hexadécimaux)', () => {
      const token = service.generateSecureToken(32);
      expect(token).toHaveLength(64);
    });

    it('calcule une empreinte SHA-256 déterministe', () => {
      const token = 'test-token-value';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 en hex = 64 caractères
    });
  });
});
