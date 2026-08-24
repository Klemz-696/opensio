import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs = 10 * 60 * 1000; // 10 minutes par défaut

  /**
   * Récupère une entrée du cache si elle existe et n'est pas expirée.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Enregistre une valeur dans le cache avec un TTL optionnel.
   */
  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalide une clé spécifique.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalide l'ensemble du cache catalogue (utilisé après la synchronisation de contenu).
   */
  invalidateAll(): void {
    const count = this.store.size;
    this.store.clear();
    this.logger.log(`🧹 [CatalogCache] Cache invalidé (${count} entrées purgées)`);
  }

  /**
   * Retourne le nombre d'entrées actuellement en cache.
   */
  size(): number {
    return this.store.size;
  }
}
