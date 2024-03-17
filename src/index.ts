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
import {
    AutonomousSystem,
    IpInfo,
    RequesterAutonomousSystem,
    RequesterIpInfo,
    UserAgent,
} from './model.js'
import { IpregistryCache, NoCache } from './cache.js'
import { IpregistryOption } from './options.js'

import { isApiError, LookupError } from './errors.js'

/**
 * Represents the configuration for the Ipregistry API client.
 * This class holds the API key, base URL, and timeout setting used for API requests.
 */
export class IpregistryConfig {
    /**
     * The API key used for authenticating requests to Ipregistry.
     */
    public readonly apiKey: string

    /**
     * The base URL of the Ipregistry API. Defaults to 'https://api.ipregistry.co'.
     */
    public readonly baseUrl: string = 'https://api.ipregistry.co'

    /**
     * The timeout (in milliseconds) for API requests. Defaults to 15000.
     */
    public readonly timeout: number = 15000

    /**
     * Constructs a new `IpregistryConfig` instance.
     * @param apiKey The API key for authenticating requests.
     * @param baseUrl Optional. The base URL of the Ipregistry API.
     * @param timeout Optional. The timeout for API requests in milliseconds.
     */
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

/**
 * Provides a builder pattern for constructing `IpregistryConfig` instances.
 * This class allows for setting the `apiKey`, `baseUrl`, and `timeout` before
 * building the final `IpregistryConfig` object.
 */
export class IpregistryConfigBuilder {
    private apiKey: string

    private baseUrl: string = 'https://api.ipregistry.co'

    private timeout: number = 15000

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    /**
     * Sets the base URL for the Ipregistry API.
     * @param baseUrl The base URL to use for API requests.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
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

/**
 * The main client for interacting with the Ipregistry API.
 * This class provides methods for looking up IP information, ASN details, parsing user agents, and more.
 */
export class IpregistryClient {
    private readonly config: IpregistryConfig

    private readonly cache: IpregistryCache

    private requestHandler: IpregistryRequestHandler

    /**
     * Constructs an IpregistryClient instance for API operations.
     * @param keyOrConfig The API key as a string or an IpregistryConfig instance for custom configurations.
     * @param cache Optional. An instance implementing the IpregistryCache interface for caching responses.
     * @param requestHandler Optional. A custom handler for API requests.
     */
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

    /**
     * Performs a batch lookup of Autonomous System Numbers (ASNs) and returns their information or errors.
     * This method can leverage caching to avoid unnecessary API requests.
     * @param asns An array of ASNs (Autonomous System Numbers) to lookup.
     * @param options Optional. Additional options for the lookup operation.
     * @returns A Promise resolving to an ApiResponse containing an array of AutonomousSystem or LookupError objects.
     */
    async batchLookupAsns(
        asns: number[],
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<(AutonomousSystem | LookupError)[]>> {
        const sparseCache: Array<AutonomousSystem | null> =
            new Array<AutonomousSystem | null>(asns.length)
        const cacheMisses: Array<number> = []

        for (let i = 0; i < asns.length; i++) {
            const asn = asns[i]
            const cacheKey = IpregistryClient.buildCacheKey(
                asn.toString(),
                options,
            )
            const cacheValue = this.cache.get(cacheKey)

            if (cacheValue) {
                sparseCache[i] = cacheValue
            } else {
                cacheMisses.push(asn)
            }
        }

        const result: Array<AutonomousSystem | LookupError> = new Array<
            AutonomousSystem | LookupError
        >(asns.length)

        let apiResponse: ApiResponse<
            BatchResult<AutonomousSystem | LookupError>
        > | null
        let freshAutonomousSystem: (AutonomousSystem | LookupError)[]

        if (cacheMisses.length > 0) {
            apiResponse = await this.requestHandler.batchLookupAsns(
                cacheMisses,
                options,
            )
            freshAutonomousSystem = apiResponse.data.results
        } else {
            apiResponse = null
            freshAutonomousSystem = []
        }

        let j = 0
        let k = 0

        for (const cachedAutonomousSystem of sparseCache) {
            if (!cachedAutonomousSystem) {
                if (isApiError(freshAutonomousSystem[k])) {
                    const lookupError = freshAutonomousSystem[k] as LookupError
                    result[j] = new LookupError(
                        lookupError.code,
                        lookupError.message,
                        lookupError.resolution,
                    )
                } else {
                    const as = freshAutonomousSystem[k] as AutonomousSystem
                    this.cache.put(
                        IpregistryClient.buildCacheKey(
                            as.asn.toString(),
                            options,
                        ),
                        as,
                    )
                    result[j] = freshAutonomousSystem[k]
                }

                k++
            } else {
                result[j] = cachedAutonomousSystem
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

    /**
     * Performs a batch lookup of IP addresses and returns their information or errors.
     * Similar to `batchLookupAsns`, this method also supports caching.
     * @param ips An array of IP addresses to lookup.
     * @param options Optional. Additional options for the lookup operation.
     * @returns A Promise resolving to an ApiResponse containing an array of IpInfo or LookupError objects.
     */
    async batchLookupIps(
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
            apiResponse = await this.requestHandler.batchLookupIps(
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

    /**
     * Looks up information for a single Autonomous System Number (ASN).
     * @param asn The ASN to lookup.
     * @param options Optional. Additional options for the lookup operation.
     * @returns A Promise resolving to an ApiResponse containing the AutonomousSystem information.
     */
    async lookupAsn(
        asn: number,
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<AutonomousSystem>> {
        const cacheKey = IpregistryClient.buildCacheKey(asn.toString(), options)
        const cacheValue = this.cache.get(cacheKey) as AutonomousSystem

        let result: ApiResponse<AutonomousSystem>

        if (!cacheValue) {
            result = await this.requestHandler.lookupAsn(asn, options)
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

    /**
     * Looks up information for a single IP address.
     * @param ip The IP address to lookup.
     * @param options Optional. Additional options for the lookup operation.
     * @returns A Promise resolving to an ApiResponse containing the IpInfo.
     */
    async lookupIp(
        ip: string,
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<IpInfo>> {
        const cacheKey = IpregistryClient.buildCacheKey(ip, options)
        const cacheValue = this.cache.get(cacheKey) as IpInfo

        let result: ApiResponse<IpInfo>

        if (!cacheValue) {
            result = await this.requestHandler.lookupIp(ip, options)
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

    /**
     * Performs a lookup for the ASN information of the originating request's IP address.
     * This is particularly useful for understanding the ASN of the caller itself.
     * Note: Caching is incompatible with this method. Every call will incur a remote request to the Ipregistry API,
     * which may consume credits or incur costs depending on your plan.
     * @param options Optional. Additional options for the lookup operation.
     * @returns A Promise resolving to an ApiResponse containing the RequesterAutonomousSystem information.
     */
    async originLookupAsn(
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<RequesterAutonomousSystem>> {
        return await this.requestHandler.originLookupAsn(options)
    }

    /**
     * Performs a lookup for the IP information of the originating request's IP address.
     * Useful for obtaining the caller's own IP information.
     * Similar to `originLookupAsn`, this method does not support caching, and each invocation results in a remote
     * API request to Ipregistry. This ensures that the most current information is retrieved but also means that
     * each call will consume credits.
     * @param options Optional. Additional options for the lookup operation.
     * @returns A Promise resolving to an ApiResponse containing the RequesterIpInfo.
     */
    async originLookupIp(
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<RequesterIpInfo>> {
        return await this.requestHandler.originLookupIp(options)
    }

    /**
     * Parses user agent strings and returns detailed information about them.
     * @param userAgents An array of user agent strings to parse.
     * @returns A Promise resolving to an ApiResponse containing an array of UserAgent information.
     */
    async parseUserAgents(
        ...userAgents: string[]
    ): Promise<ApiResponse<UserAgent[]>> {
        const response = await this.requestHandler.parseUserAgents(userAgents)
        return {
            credits: response.credits,
            data: response.data.results,
            throttling: response.throttling,
        }
    }

    /**
     * Retrieves the current cache instance used by the client.
     * @returns The IpregistryCache instance used for caching responses.
     */
    public getCache(): IpregistryCache {
        return this.cache
    }

    private static buildCacheKey(
        primaryKey: string,
        options: IpregistryOption[],
    ): string {
        let result = primaryKey ? primaryKey : ''

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

export { UserAgents } from './util.js'
