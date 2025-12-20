/**
 * @description tryCatch test
 * @lastModified 09.10.2025
 * 
 * Pass 15 / 15 tests
 */

import { describe, expect, test } from "bun:test";
import { tryCatch } from "../../common/tryCatch";

describe("tryCatch", () => {
    test("returns data and null error when function succeeds", () => {
        const result = tryCatch(() => 42);

        expect(result.data).toBe(42);
        expect(result.error).toBeNull();
    });

    test("handles function returning string", () => {
        const result = tryCatch(() => "hello");

        expect(result.data).toBe("hello");
        expect(result.error).toBeNull();
    });

    test("handles function returning object", () => {
        const result = tryCatch(() => ({ name: "test", value: 123 }));

        expect(result.data).toEqual({ name: "test", value: 123 });
        expect(result.error).toBeNull();
    });

    test("returns null data and error when function throws", () => {
        const result = tryCatch(() => {
            throw new Error("Test error");
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe("Test error");
    });

    test("handles function throwing string error", () => {
        const result = tryCatch(() => {
            throw "String error";
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
    });

    test("handles function with complex computation", () => {
        const result = tryCatch(() => {
            const arr = [1, 2, 3, 4, 5];
            return arr.reduce((sum, num) => sum + num, 0);
        });

        expect(result.data).toBe(15);
        expect(result.error).toBeNull();
    });

    test("handles function returning undefined", () => {
        const result = tryCatch(() => undefined);

        expect(result.data).toBeUndefined();
        expect(result.error).toBeNull();
    });

    test("handles function returning null", () => {
        const result = tryCatch(() => null);

        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
    });

    test("catches synchronous error in async context", () => {
        const result = tryCatch(() => {
            throw new Error("Synchronous error");
            return Promise.resolve(42);
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(Error);
    });

    test("handles async function that resolves successfully", async () => {
        const result = await tryCatch(async () => {
            return Promise.resolve(42);
        });

        expect(result.data).toBe(42);
        expect(result.error).toBeNull();
    });

    test("handles async function with await that succeeds", async () => {
        const result = await tryCatch(async () => {
            const value = await Promise.resolve("async value");
            return value;
        });

        expect(result.data).toBe("async value");
        expect(result.error).toBeNull();
    });

    test("catches async function that rejects", async () => {
        const result = await tryCatch(async () => {
            throw new Error("Async error");
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe("Async error");
    });

    test("catches Promise.reject", async () => {
        const result = await tryCatch(() => {
            return Promise.reject(new Error("Promise rejected"));
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe("Promise rejected");
    });

    test("handles async function with complex operations", async () => {
        const result = await tryCatch(async () => {
            const arr = [1, 2, 3, 4, 5];
            const sum = await Promise.resolve(arr.reduce((sum, num) => sum + num, 0));
            return sum * 2;
        });

        expect(result.data).toBe(30);
        expect(result.error).toBeNull();
    });

    test("handles async function returning object", async () => {
        const result = await tryCatch(async () => {
            return { id: 1, name: "async test" };
        });

        expect(result.data).toEqual({ id: 1, name: "async test" });
        expect(result.error).toBeNull();
    });
});
