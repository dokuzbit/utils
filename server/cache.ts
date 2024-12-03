/**
 * Cache sınıfı, bellekte verileri saklamak ve erişim hızını artırmak için kullanılır.
 * 
 * @method set: Veriyi cache'e ekler.
 * @method get: Cache'teki veriyi döndürür.
 * @method getMeta: Cache'teki verinin meta bilgilerini döndürür.
 * @method clear: Cache'i temizler.
 * @method getSize: Cache'teki verilerin toplam boyutunu döndürür.
 */


interface CacheItem<T> {
    value: T;
    size: number;
    expiryTime: number;
    timeStamp: number
}

export class Cache<T> {
    private cache: Map<string, CacheItem<T>>;
    private currentSize: number
    private maxItemSize: number
    private maxTotalSize: number
    private defaultTTL: number

    constructor() {
        this.cache = new Map();
        this.currentSize = 0;
        this.maxItemSize = 10 * 1024 * 1024; // varsayılan 10MB
        this.maxTotalSize = 300 * 1024 * 1024; // varsayılan 300MB
        this.defaultTTL = 300; // varsayılan 300 saniye
    }

    public config(options?: { maxItemSizeMB?: number, maxTotalSizeMB?: number, defaultTTLSec?: number }): { maxItemSizeMB: number, maxTotalSizeMB: number, defaultTTLSec: number } {
        if (options) {
            this.maxItemSize = (options.maxItemSizeMB ?? (this.maxItemSize / 1024 / 1024)) * 1024 * 1024;
            this.maxTotalSize = (options.maxTotalSizeMB ?? (this.maxTotalSize / 1024 / 1024)) * 1024 * 1024;
            this.defaultTTL = options.defaultTTLSec ?? this.defaultTTL;
        }
        return {
            maxItemSizeMB: this.maxItemSize / 1024 / 1024,
            maxTotalSizeMB: this.maxTotalSize / 1024 / 1024,
            defaultTTLSec: this.defaultTTL
        }
    }

    private getMySQLDateTime(timestamp: number): string {
        const date = new Date(timestamp);
        // const offset = date.getTimezoneOffset();
        // const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    public set(key: string, value: T, ttl?: number): void {
        this.removeExpired();
        this.removeUntilFreeSpace();

        const valueSize = this.calculateSize(value);

        if (valueSize > this.maxItemSize) {
            console.log("Max item size exceeded");
            return;
        }

        // Eski değeri varsa sil
        if (this.cache.has(key)) {
            this.currentSize -= this.cache.get(key)!.size;
            this.cache.delete(key);
        }

        // Yeni değeri ekle
        const now = Date.now();
        const expiryTime = now + (ttl ?? this.defaultTTL) * 1000;
        this.cache.set(key, {
            value,
            size: valueSize,
            expiryTime,
            timeStamp: Math.floor(new Date(now).getTime() / 1000)
        });
        this.currentSize += valueSize;
    }

    public get(key: string): T | null {
        this.removeExpired();

        const item = this.cache.get(key);
        if (!item) return null;

        // LRU mantığı için değeri yeniden ekle
        this.cache.delete(key);
        this.cache.set(key, item);

        return item.value;
    }

    public getMeta(key: string): Partial<CacheItem<T>> | null {
        this.removeExpired();
        return {
            timeStamp: this.cache.get(key)?.timeStamp,
            expiryTime: this.cache.get(key)?.expiryTime,
            size: this.cache.get(key)?.size,
        };
    }


    private removeExpired(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (item.expiryTime <= now) {
                this.currentSize -= item.size;
                this.cache.delete(key);
                console.log('🗑️ src/lib/server/cache.ts 👉 106 👀 expired ➤ ', key);
            }
        }
    }

    private removeUntilFreeSpace(): void {
        while (this.currentSize > this.maxTotalSize && this.cache.size > 0) {
            const firstKey = this.cache.keys().next().value;
            const firstItem = this.cache.get(firstKey)!;
            this.currentSize -= firstItem.size;
            this.cache.delete(firstKey);
            console.log('🗑️ src/lib/server/cache.ts 👉 110 👀 removed ➤ ', firstKey);
        }
    }

    private calculateSize(value: T): number {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    }

    public clear(): void {
        this.cache.clear();
        this.currentSize = 0;
    }

    public getSize(): number {
        return this.currentSize;
    }
}

export default new Cache<any>();
