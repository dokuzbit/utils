/**
 * Safely execute a function and return the result with error handling
 * @lastModified 09.10.2025
 * 
 * @example
 * import { tryCatch } from "@dokuzbit/utils/common";
 * 
 * const result = tryCatch(() => JSON.parse(str));
 * if (result.error) console.error(result.error);
 * 
 * const { data, error } = await tryCatch(async () => fetch('/api/data'));
 * if (error) console.error(error);
 * 
 */

export type Result<T> = {
    data: T;
    error: Error | null;
}

export type AsyncResult<T> = Promise<Result<Awaited<T>>>;

// Sync overload
export function tryCatch<T>(fn: () => T): Result<T>;
// Async overload
export function tryCatch<T>(fn: () => Promise<T>): AsyncResult<T>;

// Implementation
export function tryCatch<T>(fn: () => T | Promise<T>): Result<T> | AsyncResult<T> {
    try {
        const result = fn();

        // Check if result is a Promise
        if (result instanceof Promise) {
            return result
                .then(data => ({ data, error: null }))
                .catch(error => {
                    console.error(error);
                    return { data: null as Awaited<T>, error: error as Error };
                }) as AsyncResult<T>;
        }

        return { data: result, error: null };
    } catch (error) {
        console.error(error);
        return { data: null as T, error: error as Error };
    }
}