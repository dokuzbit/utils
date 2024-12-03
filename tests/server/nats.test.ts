import { expect, test } from 'bun:test';
import nats from '../../server/nats';

test('nats', async () => {
    const result = await nats.request('public.ping', 'pong');
    expect(result).toBe('pong');

    const subscription = await nats.subscribe('public.ping', (data) => {
        expect(data).toBe('pong');
    });

    nats.publish('public.ping', 'pong');

    await new Promise(resolve => setTimeout(resolve, 1000));
});
