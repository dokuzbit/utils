import { expect, test } from 'bun:test';
import cache from '../../server/cache.server';

test('cache', async () => {
    cache.set('test', 'test');
    expect(cache.get('test')).toBe('test');
    expect(cache.getMeta('test')).toBeDefined();
    expect(cache.getSize()).toBeGreaterThan(0);
    cache.clear();
    expect(cache.getSize()).toBe(0);
});
