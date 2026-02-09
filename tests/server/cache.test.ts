import { expect, test } from 'bun:test';
import { cache } from "../../server";
import { sleep } from 'bun';

test("cache", async () => {
    cache.set('test', 'test', 10);
    expect(cache.get('test')).toBe('test');
    expect(cache.getMeta('test')).toBeDefined();
    expect(cache.getSize()).toBeGreaterThan(0);
    cache.clear();
    expect(cache.getSize()).toBe(0);
});


test("dbcache", async () => {
    cache.set('test', 'test1', 1, '+2s');
    cache.set('test2', 'test2', 1, '+2s');
    cache.set('test3', 'test3', 1, '2025-12-2');
    await sleep(1000);
    expect(cache.get('test')).toBe('test1');
    await sleep(1500);
    expect(cache.get('test')).toBeNull();
    cache.set('test', 'test2', 1, '+2s');
    cache.remove('test');
    expect(cache.get('test')).toBeNull();
    expect(cache.get('test2')).toBeNull();
});
