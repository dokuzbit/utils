/**
 * @description api test
 * @lastModified 09.10.2025
 * 
 * Pass 7 / 7 tests
 */

import { expect, test, describe } from 'bun:test';
import api from '../../client/api';

describe('api', () => {
    test('api GET', async () => {
        api.setBaseUrl('https://jsonplaceholder.typicode.com/');
        const getResult = await api.get('posts/1');
        expect(getResult.data).toBeObject();
        expect(getResult.error).toBeNull();
    });
    test('api GET with params', async () => {
        api.setBaseUrl('https://jsonplaceholder.typicode.com/');
        const getResult = await api.get('comments', { postId: '1' });
        expect(getResult.data).toBeObject();
        expect(getResult.error).toBeNull();
        const getResult2 = await api.get('comments', 'postId=1');
        expect(getResult2.data).toBeObject();
        expect(getResult2.error).toBeNull();
    });

    test('api GET Error', async () => {
        api.setBaseUrl('https://jsonplaceholder.typicode.com/');
        const getResult = await api.get('postsError/1');

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

    test('api PUT', async () => {
        api.setBaseUrl('https://jsonplaceholder.typicode.com/');
        const putResult = await api.put('posts/2', {
            title: 'Test',
            body: 'Test'
        });
        expect(putResult.data).toBeObject();
        expect(putResult.error).toBeNull();
    });

    test('api PATCH', async () => {
        api.setBaseUrl('https://jsonplaceholder.typicode.com/');
        const patchResult = await api.patch('posts/2', {
            title: 'Test'
        });
        expect(patchResult.data).toBeObject();
        expect(patchResult.error).toBeNull();
    });

    test('api DELETE', async () => {
        api.setBaseUrl('https://jsonplaceholder.typicode.com/');
        const deleteResult = await api.delete('posts/2');
        expect(deleteResult.data).toBeObject();
        expect(deleteResult.error).toBeNull();
    });
});
