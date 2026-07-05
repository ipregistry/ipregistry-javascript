/*
 * Copyright 2019 Ipregistry (https://ipregistry.co).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AutonomousSystem, IpInfo } from './model.js'

/**
 * The union of value types the Ipregistry client stores in its cache.
 */
export type IpregistryCacheValue = IpInfo | AutonomousSystem

export interface IpregistryCache<V = IpregistryCacheValue> {
    get(key: string): V | undefined

    put(key: string, data: V): void

    invalidate(key: string): void

    invalidateAll(): void
}

interface CacheEntry<V> {
    expiresAt: number
    value: V
}

/**
 * An in-process cache with time-based expiration and a bounded size using
 * least-recently-used eviction. Entries expire `expireAfter` milliseconds
 * after insertion; reading an entry refreshes its recency for eviction
 * purposes but does not extend its lifetime.
 */
export class InMemoryCache<
    V = IpregistryCacheValue,
> implements IpregistryCache<V> {
    private readonly maximumSize: number

    private readonly expireAfter: number

    // Iteration order of a Map is insertion order; the first key is therefore
    // the least recently used, since reads re-insert their entry.
    private readonly cache: Map<string, CacheEntry<V>> = new Map()

    constructor(
        maximumSize: number = typeof window !== 'undefined' ? 16 : 2048,
        expireAfter: number = 600 * 1000,
    ) {
        this.maximumSize = maximumSize
        this.expireAfter = expireAfter
    }

    get(key: string): V | undefined {
        const entry = this.cache.get(key)

        if (!entry) {
            return undefined
        }

        if (Date.now() >= entry.expiresAt) {
            this.cache.delete(key)
            return undefined
        }

        this.cache.delete(key)
        this.cache.set(key, entry)

        return entry.value
    }

    invalidate(key: string): void {
        this.cache.delete(key)
    }

    invalidateAll(): void {
        this.cache.clear()
    }

    put(key: string, data: V): void {
        this.cache.delete(key)
        this.cache.set(key, {
            expiresAt: Date.now() + this.expireAfter,
            value: data,
        })

        if (this.cache.size > this.maximumSize) {
            const leastRecentlyUsed = this.cache.keys().next().value
            if (leastRecentlyUsed !== undefined) {
                this.cache.delete(leastRecentlyUsed)
            }
        }
    }
}

export class NoCache<V = IpregistryCacheValue> implements IpregistryCache<V> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get(key: string): V | undefined {
        return undefined
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invalidate(key: string): void {
        // do nothing
    }

    invalidateAll(): void {
        // do nothing
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    put(key: string, data: V): void {
        // do nothing
    }
}
