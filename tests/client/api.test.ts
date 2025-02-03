import { expect, test } from 'bun:test';
import api from '../../client/api';

test('api GET', async () => {
    api.setBaseUrl('https://jsonplaceholder.typicode.com/');
    const getResult = await api.get('posts/1');
    expect(getResult.data).toBeObject();
    expect(getResult.error).toBeNull();
});

test('api GET Error', async () => {
    api.setBaseUrl('https://jsonplaceholder.typicode.com/2');
    const getResult = await api.get('posts/1');
    console.log(getResult);

    expect(getResult.data).toBeNull();
    expect(getResult.error).toBeDefined();
});

test('api POST', async () => {
    api.setBaseUrl('https://jsonplaceholder.typicode.com/');

    const postResult = await api.post('posts', {
        title: 'test',
        body: 'test'
    });

    expect(postResult.data).toBeObject();
    expect(postResult.error).toBeNull();
});
