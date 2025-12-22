/**
 * Cache class to store data in memory and access it faster
 * @lastModified 09.10.2025
 * 
 * @example
 * // Setup
 * import { cache } from "@dokuzbit/utils/client";
 * cache.config({ maxItemSizeMB: 1, maxTotalSizeMB: 300, defaultTTLSec: 60 });
 * 
 * // Set data with cache stores default ttl 60 seconds
 * cache.set("user-123", { name: "John", age: 30 });
 * const user = cache.get("user-123");
 * 
 * // Set data with cache stores 10 seconds ttl
 * cache.set("user-123", { name: "John", age: 30 }, 10);
 * const user = cache.get("user-123");
 * 
 * // Remove data from cache
 * cache.remove("user-123");
 * 
 * // Clear all cache data
 * cache.clear();
 * 
 * // Get current size of cache
 * const size = cache.getSize();
 * console.log(size);
 * 
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


    /*
    * @method config: Configure cache.
    * @param options: { maxItemSizeMB?: number, maxTotalSizeMB?: number, defaultTTLSec?: number } - Cache configuration.
    * @returns { maxItemSizeMB: number, maxTotalSizeMB: number, defaultTTLSec: number } - Cache configuration.
    */
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


    /*
    * @method set: Add data to cache.
    * @param key: string - The key of the data to be added to cache.
    * @param value: T - The data to be added to cache.
    * @param ttl?: number - Optional Time-To-Live in seconds (uses defaultTTL if not specified)
    * @returns { void }
    */
    public set(key: string, value: T, ttl?: number): void {
        this.removeExpired();
        this.removeUntilFreeSpace();

        const valueSize = this.calculateSize(value);

        if (valueSize > this.maxItemSize) {
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

    /*
    * @method get: Get data from cache.
    * @param key: string - The key of the data to be retrieved from cache.
    * @returns { T | null } - The data from cache or null if not found/expired.
    */
    public get(key: string): T | null {
        this.removeExpired();

        const node = this.cache.get(key);
        if (!node) return null;

        // Düğümü başa taşı
        this.removeNode(node);
        this.addNodeToHead(node);

        return node.value.value;
    }

    /*
    * @method remove: Remove data from cache.
    * @param key: string - The key of the data to be removed from cache.
    * @returns { void }
    */
    public remove(key: string): void {
        this.removeExpired();
        if (this.cache.has(key)) {
            this.currentSize -= this.cache.get(key)!.value.size;
            this.removeNode(this.cache.get(key)!);
            this.cache.delete(key);
        }
    }

    /*
    * @method getMeta: Get metadata about cached item.
    * @param key: string - The key of the data to get metadata from cache.
    * @returns { Partial<CacheItem<T>> | null } - The metadata of the cached item or null if not found/expired.
    */
    public getMeta(key: string): Partial<CacheItem<T>> | null {
        this.removeExpired();
        return {
            timeStamp: this.cache.get(key)?.value.timeStamp,
            expiryTime: this.cache.get(key)?.value.expiryTime,
            size: this.cache.get(key)?.value.size,
        };
    }

    /*
    * @method clear: Clear cache storage.
    * @returns { void }
    */
    public clear(): void {
        this.cache.clear();
        this.currentSize = 0;
    }

    /*
    * @method getSize: Get current size of cache storage.
    * @returns { number } - The current size of cache.
    */
    public getSize(): number {
        return this.currentSize;
    }

    private removeExpired(): void {
        const now = Date.now();
        for (const [key, node] of this.cache.entries()) {
            if (node.value.expiryTime <= now) {
                this.currentSize -= node.value.size;
                this.removeNode(node);
                this.cache.delete(key);
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
        }
    }

    private calculateSize(value: T): number {
        return new TextEncoder().encode(JSON.stringify(value)).length;
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

export const cache = new Cache<any>();
export default cache;

