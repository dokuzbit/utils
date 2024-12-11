import { expect, test } from 'bun:test';
import nats from '../../server/nats';

const { NATS_URL, NATS_USER, NATS_PASS } = process.env;

nats.config(NATS_URL, NATS_USER, NATS_PASS);

test('nats request', async () => {
    const result = await nats.request('public.ping', 'test');
    expect(result).toMatchObject({ success: true, message: 'test' });
});

test('nats publish subscribe', async () => {
    const subscription = await nats.subscribe('public.ping', (data) => {
        expect(data).toMatchObject({ success: true, message: 'test' });
    });
    nats.publish('public.ping', { success: true, message: 'test' });
    await nats.unsubscribe(subscription);
});


test('nats pub/sub loop', async () => {
    let count = 0;
    const subscription = await nats.subscribe('public.ping', (data) => {
        if (data === 'cancel') {
            cancel();
        } else {
            count++;
            console.log('count', count);
        }
    });

    for (let i = 0; i < 10; i++) {
        const data = await nats.publish('public.ping', 'test');
    }
    await nats.publish('public.ping', 'cancel');

    function cancel() {
        nats.unsubscribe(subscription);
        expect(count).toBe(10);
    }
});

