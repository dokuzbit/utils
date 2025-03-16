/**
 * @version 0.1.1
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

class CacheNode<T> {
    key: string;
    value: CacheItem<T>;
    prev: CacheNode<T> | null;
    next: CacheNode<T> | null;

    constructor(key: string, value: CacheItem<T>) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

export class Cache<T> {
    private cache: Map<string, CacheNode<T>>;
    private currentSize: number
    private maxItemSize: number
    private maxTotalSize: number
    private defaultTTL: number
    private head: CacheNode<T> | null
    private tail: CacheNode<T> | null

    constructor() {
        this.cache = new Map();
        this.currentSize = 0;
        this.maxItemSize = 10 * 1024 * 1024; // varsayılan 10MB
        this.maxTotalSize = 300 * 1024 * 1024; // varsayılan 300MB
        this.defaultTTL = 300; // varsayılan 300 saniye
        this.head = null;
        this.tail = null;
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
            this.currentSize -= this.cache.get(key)!.value.size;
            this.removeNode(this.cache.get(key)!);
        }

        // Yeni değeri ekle
        const now = Date.now();
        const expiryTime = now + (ttl ?? this.defaultTTL) * 1000;
        const newNode = new CacheNode<T>(key, {
            value,
            size: valueSize,
            expiryTime,
            timeStamp: Math.floor(new Date(now).getTime() / 1000)
        });
        this.cache.set(key, newNode);
        this.addNodeToHead(newNode);
        this.currentSize += valueSize;
    }

    public get(key: string): T | null {
        this.removeExpired();

        const node = this.cache.get(key);
        if (!node) return null;

        // Düğümü başa taşı
        this.removeNode(node);
        this.addNodeToHead(node);

        return node.value.value;
    }

    public remove(key: string): void {
        this.removeExpired();
        if (this.cache.has(key)) {
            this.currentSize -= this.cache.get(key)!.value.size;
            this.removeNode(this.cache.get(key)!);
            this.cache.delete(key);
        }
    }

    public getMeta(key: string): Partial<CacheItem<T>> | null {
        this.removeExpired();
        return {
            timeStamp: this.cache.get(key)?.value.timeStamp,
            expiryTime: this.cache.get(key)?.value.expiryTime,
            size: this.cache.get(key)?.value.size,
        };
    }


    private removeExpired(): void {
        const now = Date.now();
        for (const [key, node] of this.cache.entries()) {
            if (node.value.expiryTime <= now) {
                this.currentSize -= node.value.size;
                this.removeNode(node);
                this.cache.delete(key);
                console.log('🗑️ src/lib/server/cache.ts 👉 106 👀 expired ➤ ', key);
            }
        }
    }

    private removeUntilFreeSpace(): void {
        while (this.currentSize > this.maxTotalSize && this.cache.size > 0) {
            const tail = this.tail;
            if (!tail) break;
            this.currentSize -= tail.value.size;
            this.removeNode(tail);
            this.cache.delete(tail.key);
            console.log('🗑️ src/lib/server/cache.ts 👉 110 👀 removed ➤ ', tail.key);
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

    private removeNode(node: CacheNode<T>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
    }

    private addNodeToHead(node: CacheNode<T>): void {
        node.next = this.head;
        node.prev = null;

        if (this.head) {
            this.head.prev = node;
        }

        this.head = node;

        if (!this.tail) {
            this.tail = node;
        }
    }
}

export const cache = new Cache<unknown>();
export default cache;

