import { expect, test } from 'bun:test';
import nats from '../../server/nats.server';

const { NATS_URL, NATS_USER, NATS_PASS } = process.env;

nats.config(NATS_URL, NATS_USER, NATS_PASS);

test('nats request', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS);
    const result = await nats.request('public.ping', 'test');
    console.log(result);
    expect(result).toMatchObject({ success: true, message: 'test' });
    await nats.disconnect();
});

test('nats publish subscribe', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS);
    const subscription = await nats.subscribe('public.ping', (data) => {
        expect(data).toMatchObject({ success: true, message: 'test' });
    });
    nats.publish('public.ping', { success: true, message: 'test' });
    await nats.publish('public.ping', { success: true, message: 'test' });
    await nats.unsubscribe(subscription);
    await nats.disconnect();
});

test('nats pub/sub loop', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS);
    let count = 0;
    const subscription = await nats.subscribe('public.ping', (data) => {
        if (data === 'cancel') {
            cancel();
        } else {
            count++;
        }
    });

    for (let i = 0; i < 10; i++) {
        const data = await nats.publish('public.ping', 'test');
    }
    await nats.publish('public.ping', 'cancel');

    async function cancel() {
        await nats.unsubscribe(subscription);
        expect(count).toBe(10);
        await nats.disconnect();
    }
});

