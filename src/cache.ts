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

import {IpInfo} from './model';

import * as LRUCache from 'lru-cache';


export interface IpregistryCache {

    get(key: string): any | undefined;

    put(key: string, data: any): void;

    invalidate(key: string): void;

    invalidateAll(): void;

}

export class DefaultCache implements IpregistryCache {

    private readonly maximumSize;

    private readonly expireAfter;

    private readonly cache: LRUCache<string, IpInfo>;

    constructor(maximumSize: number = typeof window !== 'undefined' ? 16 : 2048, expireAfter: number = 600 * 1000) {
        this.maximumSize = maximumSize;
        this.expireAfter = expireAfter;

        const options : LRUCache.Options<string, IpInfo> = {
            max: maximumSize,
            maxAge: expireAfter
        };

        this.cache = new LRUCache(options);
    }

    get(key: string): IpInfo | undefined {
        return this.cache.get(key);
    }

    invalidate(key: string): void {
        this.cache.del(key);
    }

    invalidateAll(): void {
        this.cache.reset();
    }

    put(key: string, data: IpInfo): void {
        this.cache.set(key, data);
    }

}

export class NoCache implements IpregistryCache {

    get(key: string): IpInfo | undefined {
        return undefined;
    }

    invalidate(key: string): void {
        // do nothing
    }

    invalidateAll(): void {
        // do nothing
    }

    put(key: string, data: IpInfo): void {
        // do nothing
    }

}
