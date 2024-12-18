import { expect, test } from 'bun:test';
import memcached from '../../server/memcached.server';

test('memcached empty get', async () => {
    const deleteResult = await memcached.delete('test');
    expect(deleteResult).toBeBoolean();
    const getResult = await memcached.get('test');
    expect(getResult).toBeNull();
});

test('memcached set get', async () => {
    const setResult = await memcached.set('test', 'test');
    expect(setResult).toBe(true);
    const getResult = await memcached.get('test');
    expect(getResult).toBeString();
    expect(getResult).toBe('test');
});
