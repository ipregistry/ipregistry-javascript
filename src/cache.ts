import {IpInfo} from './model';
import {Options} from 'lru-cache';

import * as LRUCache from 'lru-cache';


export interface IpregistryCache {

    get(ip: string): IpInfo | undefined;

    put(ip: string, data: IpInfo): void;

    invalidate(ip: string): void;

    invalidateAll(): void;

}

export class DefaultCache implements IpregistryCache {

    private readonly maximumSize;

    private readonly expireAfter;

    private readonly cache: LRUCache<string, IpInfo>;

    constructor(maximumSize: number = 8096, expireAfter: number = 86400 * 1000) {
        this.maximumSize = maximumSize;
        this.expireAfter = expireAfter;

        const options : Options<string, IpInfo> = {
            max: maximumSize,
            maxAge: expireAfter
        };

        this.cache = new LRUCache(options);
    }

    get(ip: string): IpInfo | undefined {
        return this.cache.get(ip);
    }

    invalidate(ip: string): void {
        this.cache.del(ip);
    }

    invalidateAll(): void {
        this.cache.reset();
    }

    put(ip: string, data: IpInfo): void {
        this.cache.set(ip, data);
    }

}

export class EmptyCache implements IpregistryCache {

    get(ip: string): IpInfo | undefined {
        return undefined;
    }

    invalidate(ip: string): void {
    }

    invalidateAll(): void {
    }

    put(ip: string, data: IpInfo): void {
    }

}
