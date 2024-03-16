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

import {
    ApiResponse,
    BatchResult,
    DefaultRequestHandler,
    IpregistryRequestHandler,
} from './request.js'
import { IpInfo, RequesterIpInfo, UserAgent } from './model.js'
import { IpregistryCache, NoCache } from './cache.js'
import { IpregistryOption } from './options.js'

import { isApiError, LookupError } from './errors.js'

export class IpregistryConfig {
    public readonly apiKey: string

    public readonly baseUrl: string = 'https://api.ipregistry.co'

    public readonly timeout: number = 15000

    constructor(apiKey: string, baseUrl: string, timeout: number) {
        this.apiKey = apiKey

        if (baseUrl) {
            this.baseUrl = baseUrl
        }

        if (timeout) {
            this.timeout = timeout
        }
    }
}

export class IpregistryConfigBuilder {
    private apiKey: string

    private baseUrl: string = 'https://api.ipregistry.co'

    private timeout: number = 15000

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    public withBaseUrl(baseUrl: string): IpregistryConfigBuilder {
        this.baseUrl = baseUrl
        return this
    }

    public withEuBaseUrl(): IpregistryConfigBuilder {
        this.baseUrl = 'https://eu.api.ipregistry.co'
        return this
    }

    public withTimeout(timeout: number): IpregistryConfigBuilder {
        this.timeout = timeout
        return this
    }

    public build(): IpregistryConfig {
        return new IpregistryConfig(this.apiKey, this.baseUrl, this.timeout)
    }
}

export class IpregistryClient {
    private config: IpregistryConfig

    private cache: IpregistryCache

    private requestHandler: IpregistryRequestHandler

    constructor(
        keyOrConfig: string | IpregistryConfig,
        cache?: IpregistryCache,
        requestHandler?: IpregistryRequestHandler,
    ) {
        if (typeof keyOrConfig === 'string') {
            this.config = new IpregistryConfigBuilder(keyOrConfig).build()
        } else if (!keyOrConfig) {
            this.config = new IpregistryConfigBuilder('tryout').build()
        } else {
            this.config = keyOrConfig
        }

        if (cache) {
            this.cache = cache
        } else {
            this.cache = new NoCache()
        }

        if (requestHandler) {
            this.requestHandler = requestHandler
        } else {
            this.requestHandler = new DefaultRequestHandler(this.config)
        }
    }

    async batchLookup(
        ips: string[],
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<(IpInfo | LookupError)[]>> {
        const sparseCache: Array<IpInfo | null> = new Array<IpInfo | null>(
            ips.length,
        )
        const cacheMisses: Array<string> = []

        for (let i = 0; i < ips.length; i++) {
            const ip = ips[i]
            const cacheKey = IpregistryClient.buildCacheKey(ip, options)
            const cacheValue = this.cache.get(cacheKey)

            if (cacheValue) {
                sparseCache[i] = cacheValue
            } else {
                cacheMisses.push(ip)
            }
        }

        const result: Array<IpInfo | LookupError> = new Array<
            IpInfo | LookupError
        >(ips.length)

        let apiResponse: ApiResponse<BatchResult<IpInfo | LookupError>> | null
        let freshIpInfo: (IpInfo | LookupError)[]

        if (cacheMisses.length > 0) {
            apiResponse = await this.requestHandler.batchLookup(
                cacheMisses,
                options,
            )
            freshIpInfo = apiResponse.data.results
        } else {
            apiResponse = null
            freshIpInfo = []
        }

        let j = 0
        let k = 0

        for (const cachedIpInfo of sparseCache) {
            if (!cachedIpInfo) {
                if (isApiError(freshIpInfo[k])) {
                    const lookupError = freshIpInfo[k] as LookupError
                    result[j] = new LookupError(
                        lookupError.code,
                        lookupError.message,
                        lookupError.resolution,
                    )
                } else {
                    const ipInfo = freshIpInfo[k] as IpInfo
                    this.cache.put(
                        IpregistryClient.buildCacheKey(ipInfo.ip, options),
                        ipInfo,
                    )
                    result[j] = freshIpInfo[k]
                }

                k++
            } else {
                result[j] = cachedIpInfo
            }

            j++
        }

        return {
            credits: apiResponse
                ? apiResponse.credits
                : {
                      consumed: 0,
                      remaining: null,
                  },
            data: result,
            throttling: apiResponse ? apiResponse.throttling : null,
        }
    }

    async lookup(
        ip: string,
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<IpInfo>> {
        const cacheKey = IpregistryClient.buildCacheKey(ip, options)
        const cacheValue = this.cache.get(cacheKey) as IpInfo

        let result: ApiResponse<IpInfo>

        if (!cacheValue) {
            result = await this.requestHandler.lookup(ip, options)
            this.cache.put(cacheKey, result.data)
        } else {
            result = {
                credits: {
                    consumed: 0,
                    remaining: null,
                },
                data: cacheValue,
                throttling: null,
            }
        }

        return result
    }

    async originLookup(
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<RequesterIpInfo>> {
        const cacheKey = IpregistryClient.buildCacheKey('', options)
        const cacheValue = this.cache.get(cacheKey) as RequesterIpInfo

        let result: ApiResponse<RequesterIpInfo>

        if (!cacheValue) {
            result = await this.requestHandler.originLookup(options)
            this.cache.put(cacheKey, result.data)
        } else {
            result = {
                credits: {
                    consumed: 0,
                    remaining: null,
                },
                data: cacheValue,
                throttling: null,
            }
        }

        return result
    }

    async parse(...userAgents: string[]): Promise<ApiResponse<UserAgent[]>> {
        const response = await this.requestHandler.parse(userAgents)
        return {
            credits: response.credits,
            data: response.data.results,
            throttling: response.throttling,
        }
    }

    public getCache(): IpregistryCache {
        return this.cache
    }

    private static buildCacheKey(
        ip: string,
        options: IpregistryOption[],
    ): string {
        let result = ip ? ip : ''

        if (options) {
            for (const option of options) {
                result += `;${option.name}=${option.value}`
            }
        }

        return result
    }
}

export * from './cache.js'
export * from './errors.js'
export * from './model.js'
export * from './options.js'
export * from './request.js'

export { UserAgent } from './util.js'
