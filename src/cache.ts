import {IpInfo} from './model';

import * as LRUCache from 'lru-cache';


export interface IpregistryCache {

    get(key: string): IpInfo | undefined;

    put(key: string, data: IpInfo): void;

    invalidate(key: string): void;

    invalidateAll(): void;

}

export class DefaultCache implements IpregistryCache {

    private readonly maximumSize;

    private readonly expireAfter;

    private readonly cache: LRUCache<string, IpInfo>;

    constructor(maximumSize: number = typeof window !== 'undefined' ? 16 : 2048, expireAfter: number = 86400 * 1000) {
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
