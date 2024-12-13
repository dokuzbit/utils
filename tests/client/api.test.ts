import { expect, test } from 'bun:test';
import api from '../../client/api';

test('api GET', async () => {
    api.setBaseUrl('https://jsonplaceholder.typicode.com/');
    const getResult = await api.fetch('posts/1');
    expect(getResult.result).toBeObject();
    expect(getResult.error).toBeNull();
});

test('api GET Error', async () => {
    api.setBaseUrl('https://jsonplaceholder.typicode.com/2');
    const getResult = await api.fetch('posts/1');
    expect(getResult.result).toBeNull();
    expect(getResult.error).toBeDefined();
});

test('api POST', async () => {
    api.setBaseUrl('https://jsonplaceholder.typicode.com/');

    const postResult = await api.fetch('posts', {
        title: 'test',
        body: 'test'
    });

    expect(postResult.result).toBeObject();
    expect(postResult.error).toBeNull();
});
