import { expect, test } from 'bun:test';
import nats from '../../server/nats.server';

const { NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY } = process.env;

nats.config(NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY);

test('nats request', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY);
    const result = await nats.request('test.echo', 'testing');
    expect(result).toBe('testing');
    await nats.disconnect();
});

test('nats request object', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY);
    const result = await nats.request('test.echo', { success: true, message: 'testing' });
    expect(result).toMatchObject({ success: true, message: 'testing' });
    await nats.disconnect();
});


test('nats publish subscribe string', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY);
    const subscription = await nats.subscribe('test.echo', (data) => {
        expect(data).toBe('test');
    });
    nats.publish('test.echo', 'test');
    await nats.publish('test.echo', 'test');
    await nats.unsubscribe(subscription);
    await nats.disconnect();
});

test('nats publish subscribe object', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY);
    const subscription = await nats.subscribe('test.echo', (data) => {
        expect(data).toMatchObject({ success: true, message: 'test' });
    });
    nats.publish('test.echo', { success: true, message: 'test' });
    await nats.publish('test.echo', { success: true, message: 'test' });
    await nats.unsubscribe(subscription);
    await nats.disconnect();
});

test('nats pub/sub loop', async () => {
    nats.config(NATS_URL, NATS_USER, NATS_PASS, NATS_NKEY);
    let count = 0;
    const subscription = await nats.subscribe('test.echo', (data) => {
        if (data === 'cancel') {
            cancel();
        } else {
            count++;
        }
    });

    for (let i = 0; i < 10; i++) {
        const data = await nats.publish('test.echo', 'test');
    }
    await nats.publish('test.echo', 'cancel');

    async function cancel() {
        await nats.unsubscribe(subscription);
        expect(count).toBe(10);
        await nats.disconnect();
    }
});

