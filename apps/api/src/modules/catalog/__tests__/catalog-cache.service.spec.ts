import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogCacheService } from '../catalog-cache.service';

describe('CatalogCacheService (§41)', () => {
  let cache: CatalogCacheService;

  beforeEach(() => {
    cache = new CatalogCacheService();
  });

  it('enregistre et restitue une valeur en cache', () => {
    cache.set('key-1', { message: 'hello' });
    const result = cache.get<{ message: string }>('key-1');
    expect(result).toEqual({ message: 'hello' });
  });

  it('retourne undefined pour une clé inexistante ou expirée', () => {
    expect(cache.get('unknown')).toBeUndefined();

    // Expire immédiatement avec TTL de -1ms
    cache.set('expired-key', 'data', -1);
    expect(cache.get('expired-key')).toBeUndefined();
  });

  it('invalide une clé unique avec invalidate()', () => {
    cache.set('key-1', 'value-1');
    cache.set('key-2', 'value-2');

    cache.invalidate('key-1');
    expect(cache.get('key-1')).toBeUndefined();
    expect(cache.get('key-2')).toBe('value-2');
  });

  it('p険ge l\'ensemble du cache avec invalidateAll()', () => {
    cache.set('key-1', 'value-1');
    cache.set('key-2', 'value-2');
    expect(cache.size()).toBe(2);

    cache.invalidateAll();
    expect(cache.size()).toBe(0);
    expect(cache.get('key-1')).toBeUndefined();
    expect(cache.get('key-2')).toBeUndefined();
  });
});
