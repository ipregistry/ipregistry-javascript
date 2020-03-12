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

import {DefaultCache, IpregistryCache} from './cache';
import {DefaultRequestHandler, IpregistryRequestHandler} from './request';
import {IpregistryOption} from './options';
import {IpInfo, RequesterIpInfo} from './model';
import {LookupError, isApiError} from './errors';

export class IpregistryConfig {

    public readonly apiKey: string;

    public readonly apiUrl: string = 'https://api.ipregistry.co';

    public readonly timeout: number = 3000;

    constructor(apiKey: string, apiUrl: string, timeout: number) {
        this.apiKey = apiKey;

        if (apiUrl) {
            this.apiUrl = apiUrl;
        }

        if (timeout) {
            this.timeout = timeout;
        }
    }

}

export class IpregistryConfigBuilder {

    private apiKey: string;

    private apiUrl: string = 'https://api.ipregistry.co';

    private timeout: number = 3000;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    public withApiUrl(apiUrl: string): IpregistryConfigBuilder {
        this.apiUrl = apiUrl;
        return this;
    }

    public withTimeout(timeout: number): IpregistryConfigBuilder {
        this.timeout = timeout;
        return this;
    }

    public build(): IpregistryConfig {
        return new IpregistryConfig(this.apiKey, this.apiUrl, this.timeout);
    }

}

export class IpregistryClient {

    private config: IpregistryConfig;

    private cache: IpregistryCache;

    private requestHandler: IpregistryRequestHandler;

    constructor(
        keyOrConfig: string | IpregistryConfig,
        cache?: IpregistryCache,
        requestHandler?: IpregistryRequestHandler) {

        if (typeof keyOrConfig === 'string') {
            this.config = new IpregistryConfigBuilder(keyOrConfig).build();
        } else if (!keyOrConfig) {
            this.config = new IpregistryConfigBuilder('tryout').build();
        } else {
            this.config = keyOrConfig;
        }

        if (cache) {
            this.cache = cache;
        } else {
            this.cache = new DefaultCache();
        }

        if (requestHandler) {
            this.requestHandler = requestHandler;
        } else {
            this.requestHandler = new DefaultRequestHandler(this.config);
        }
    }

    async lookup(ip: string, ...options: IpregistryOption[]): Promise<IpInfo> {
        const cacheKey = this.buildCacheKey(ip, options);
        let cacheValue = this.cache.get(cacheKey);

        if (!cacheValue) {
            cacheValue = await this.requestHandler.lookup(ip, options);
            const clone = {...cacheValue}
            delete clone.account
            this.cache.put(cacheKey, clone);
        }

        return cacheValue;
    }

    async batchLookup(ips: string[], ...options: IpregistryOption[]): Promise<(IpInfo | LookupError)[]> {
        const sparseCache: Array<(IpInfo | null)> = new Array<IpInfo | null>(ips.length);
        const cacheMisses: Array<string> = [];

        for (let i = 0; i < ips.length; i++) {
            const ip = ips[i];
            const cacheKey = this.buildCacheKey(ip, options);
            const cacheValue = this.cache.get(cacheKey);

            if (cacheValue) {
                sparseCache[i] = cacheValue;
            } else {
                cacheMisses.push(ip);
            }
        }

        const result: Array<(IpInfo | LookupError)> = new Array<IpInfo | LookupError>(ips.length);
        const freshIpInfo = await this.requestHandler.batchLookup(cacheMisses, options);

        let j = 0;
        let k = 0;

        for (const cachedIpInfo of sparseCache) {
            if (!cachedIpInfo) {
                if (isApiError(freshIpInfo[k])) {
                    const lookupError = freshIpInfo[k];
                    result[j] = new LookupError(lookupError['code'], lookupError['message'], lookupError['resolution']);
                } else {
                    const ipInfo = freshIpInfo[k];
                    this.cache.put(this.buildCacheKey(ipInfo.ip, options), ipInfo);
                    result[j] = freshIpInfo[k];
                }

                k++;
            } else {
                result[j] = cachedIpInfo;
            }

            j++;
        }

        return result;
    }

    async originLookup(...options: IpregistryOption[]): Promise<RequesterIpInfo> {
        const cacheKey = this.buildCacheKey('', options);
        let cacheValue = this.cache.get(cacheKey) as RequesterIpInfo;

        if (!cacheValue) {
            cacheValue = await this.requestHandler.originLookup(options);
            this.cache.put(cacheKey, cacheValue);
        }

        return cacheValue;
    }

    public getCache(): IpregistryCache {
        return this.cache;
    }

    private buildCacheKey(ip: string, options: IpregistryOption[]): string {
        let result = ip ? ip : '';

        if (options) {
            for (const option of options) {
                result += `;${option.name}=${option.value}`;
            }
        }

        return result;
    }

}

export * from './cache';
export * from './errors';
export * from './model';
export * from './options';
export * from './request';

export {UserAgent} from './util';
