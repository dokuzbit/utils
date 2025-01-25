import { connect, StringCodec, JSONCodec } from 'nats';
import type { NatsConnection, Subscription, PublishOptions, RequestOptions } from 'nats';

/**
 * NATS bağlantısını yöneten sınıf
 * @method connect: NATS bağlantısını kurma
 * @method publish: Mesaj gönderme
 * @method request: Mesaj isteği
 * @method subscribe: Mesaj dinleme
 * @method disconnect: NATS bağlantısını kapatma
 */

export class NatsWrapper {
	private nc: NatsConnection | null = null;
	private jc = JSONCodec();
	private sc = StringCodec();

	private servers: string | string[] = '';
	private user: string = '';
	private pass: string = '';

	config(servers: string | string[] = '', user: string = '', pass: string = ''): void {
		this.servers = servers;
		this.user = user;
		this.pass = pass;
	}

	private async connect(): Promise<void> {
		try {
			if (!this.nc) {
				this.nc = await connect({
					servers: this.servers,
					user: this.user,
					pass: this.pass
				});
				console.log('NATS bağlantısı başarılı');
			}
		} catch (error) {
			console.error('NATS bağlantı hatası:', error);
			throw error;
		}
	}

	async publish(subject: string, data: string | object, options?: PublishOptions): Promise<void> {
		if (!this.nc) await this.connect();
		const encodedData = typeof data === 'string'
			? this.sc.encode(data)
			: this.jc.encode(data);
		this.nc!.publish(subject, encodedData, options);
		await this.nc!.flush();
	}

	async request(subject: string, data: string | object, options?: RequestOptions): Promise<any> {
		if (!this.nc) await this.connect();
		const encodedData = typeof data === 'string'
			? this.sc.encode(data)
			: this.jc.encode(data);
		const response = await this.nc!.request(subject, encodedData, options);
		return this.jc.decode(response.data);
	}

	async subscribe(subject: string, callback: (data: any) => void): Promise<Subscription> {
		if (!this.nc) await this.connect();
		const subscription = this.nc!.subscribe(subject);
		(async () => {
			for await (const message of subscription) {
				let decoded: string | object;
				try {
					decoded = message.json();
				} catch (error) {
					decoded = message.string();
				}
				callback(decoded);
			}
		})();
		return subscription;
	}

	async unsubscribe(subscription: Subscription): Promise<void> {
		await subscription.drain();
		subscription.unsubscribe();
	}

	async disconnect(): Promise<void> {
		if (this.nc) {
			await this.nc.close();
			this.nc = null;
			console.log('NATS bağlantısı kapatıldı');
		}
	}
}

export const nats = new NatsWrapper();
export default nats;