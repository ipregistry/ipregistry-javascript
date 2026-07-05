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
    ApiResponseCredits,
    ApiResponseThrottling,
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
import {
    FilterOption,
    HostnameOption,
    IpregistryOption,
    LookupOptions,
} from './options.js'

import { isApiError, LookupError } from './errors.js'

/**
 * The maximum number of IP addresses or ASNs the Ipregistry API accepts in a
 * single batch request.
 */
export const DEFAULT_MAX_BATCH_SIZE = 1024

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
     * The timeout (in milliseconds) for API requests. Defaults to 5000.
     */
    public readonly timeout: number = 5000

    /**
     * The maximum number of automatic retries performed in addition to the
     * initial attempt. Applies to transport errors (timeouts, network
     * failures) and to the response statuses enabled by `retryOnServerError`
     * and `retryOnTooManyRequests`. Defaults to 3. Use 0 to disable retries.
     */
    public readonly maxRetries: number = 3

    /**
     * The base backoff (in milliseconds) between retries. Successive retries
     * use an exponentially increasing delay (retryInterval * 2^attempt). When
     * a response carries a Retry-After header, that value takes precedence.
     * Defaults to 1000.
     */
    public readonly retryInterval: number = 1000

    /**
     * Whether 5xx responses (and transient network errors) are retried.
     * Defaults to true.
     */
    public readonly retryOnServerError: boolean = true

    /**
     * Whether 429 Too Many Requests responses are retried, honoring the
     * Retry-After header when present. Ipregistry does not rate limit by
     * default (it is opt-in per API key), so this defaults to false.
     */
    public readonly retryOnTooManyRequests: boolean = false

    /**
     * The maximum number of values sent in a single batch request. Larger
     * batches are split into this many values per request. Capped at
     * `DEFAULT_MAX_BATCH_SIZE` (the API limit).
     */
    public readonly maxBatchSize: number = DEFAULT_MAX_BATCH_SIZE

    /**
     * How many batch sub-requests are dispatched concurrently when a batch is
     * large enough to be split into chunks. Defaults to 4.
     */
    public readonly batchConcurrency: number = 4

    /**
     * Constructs a new `IpregistryConfig` instance.
     * @param apiKey The API key for authenticating requests.
     * @param baseUrl Optional. The base URL of the Ipregistry API.
     * @param timeout Optional. The timeout for API requests in milliseconds.
     * @param maxRetries Optional. The maximum number of automatic retries.
     * @param retryInterval Optional. The base backoff between retries in milliseconds.
     * @param retryOnServerError Optional. Whether 5xx responses are retried.
     * @param retryOnTooManyRequests Optional. Whether 429 responses are retried.
     * @param maxBatchSize Optional. The maximum number of values per batch request.
     * @param batchConcurrency Optional. How many batch sub-requests run concurrently.
     */
    constructor(
        apiKey: string,
        baseUrl: string,
        timeout: number,
        maxRetries?: number,
        retryInterval?: number,
        retryOnServerError?: boolean,
        retryOnTooManyRequests?: boolean,
        maxBatchSize?: number,
        batchConcurrency?: number,
    ) {
        this.apiKey = apiKey

        if (baseUrl) {
            this.baseUrl = baseUrl
        }

        if (timeout) {
            this.timeout = timeout
        }

        if (maxRetries !== undefined && maxRetries >= 0) {
            this.maxRetries = maxRetries
        }

        if (retryInterval !== undefined && retryInterval > 0) {
            this.retryInterval = retryInterval
        }

        if (retryOnServerError !== undefined) {
            this.retryOnServerError = retryOnServerError
        }

        if (retryOnTooManyRequests !== undefined) {
            this.retryOnTooManyRequests = retryOnTooManyRequests
        }

        if (
            maxBatchSize !== undefined &&
            maxBatchSize > 0 &&
            maxBatchSize <= DEFAULT_MAX_BATCH_SIZE
        ) {
            this.maxBatchSize = maxBatchSize
        }

        if (batchConcurrency !== undefined && batchConcurrency > 0) {
            this.batchConcurrency = batchConcurrency
        }
    }
}

/**
 * Provides a builder pattern for constructing `IpregistryConfig` instances.
 * This class allows for setting the `apiKey`, `baseUrl`, and `timeout` before
 * building the final `IpregistryConfig` object.
 *
 * @deprecated Pass an `IpregistryClientOptions` object to the
 * `IpregistryClient` constructor instead, e.g.
 * `new IpregistryClient({ apiKey: 'KEY', timeout: 10000 })`.
 */
export class IpregistryConfigBuilder {
    private apiKey: string

    private baseUrl: string = 'https://api.ipregistry.co'

    private timeout: number = 5000

    private maxRetries: number = 3

    private retryInterval: number = 1000

    private retryOnServerError: boolean = true

    private retryOnTooManyRequests: boolean = false

    private maxBatchSize: number = DEFAULT_MAX_BATCH_SIZE

    private batchConcurrency: number = 4

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

    /**
     * Sets the maximum number of automatic retries performed in addition to
     * the initial attempt. Use 0 to disable retries.
     * @param maxRetries The maximum number of retries.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
    public withMaxRetries(maxRetries: number): IpregistryConfigBuilder {
        this.maxRetries = maxRetries
        return this
    }

    /**
     * Sets the base backoff between retries. Successive retries use an
     * exponentially increasing delay (retryInterval * 2^attempt). When a
     * response carries a Retry-After header, that value takes precedence.
     * @param retryInterval The base backoff in milliseconds.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
    public withRetryInterval(retryInterval: number): IpregistryConfigBuilder {
        this.retryInterval = retryInterval
        return this
    }

    /**
     * Controls whether 5xx responses (and transient network errors) are
     * retried. Defaults to true.
     * @param retryOnServerError Whether 5xx responses are retried.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
    public withRetryOnServerError(
        retryOnServerError: boolean,
    ): IpregistryConfigBuilder {
        this.retryOnServerError = retryOnServerError
        return this
    }

    /**
     * Controls whether 429 Too Many Requests responses are retried, honoring
     * the Retry-After header when present. Ipregistry does not rate limit by
     * default (it is opt-in per API key), so this defaults to false.
     * @param retryOnTooManyRequests Whether 429 responses are retried.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
    public withRetryOnTooManyRequests(
        retryOnTooManyRequests: boolean,
    ): IpregistryConfigBuilder {
        this.retryOnTooManyRequests = retryOnTooManyRequests
        return this
    }

    /**
     * Sets the maximum number of values sent in a single batch request. Batch
     * lookups split larger inputs into this many values per request. Values
     * are capped at `DEFAULT_MAX_BATCH_SIZE` (the API limit); a value <= 0 is
     * ignored.
     * @param maxBatchSize The maximum number of values per batch request.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
    public withMaxBatchSize(maxBatchSize: number): IpregistryConfigBuilder {
        this.maxBatchSize = maxBatchSize
        return this
    }

    /**
     * Sets how many batch sub-requests are dispatched concurrently when a
     * batch is large enough to be split into chunks. A value <= 0 is ignored.
     * Set it to 1 for strictly sequential dispatch, which is gentler on a
     * rate-limited API key.
     * @param batchConcurrency How many batch sub-requests run concurrently.
     * @returns The `IpregistryConfigBuilder` instance for chaining.
     */
    public withBatchConcurrency(
        batchConcurrency: number,
    ): IpregistryConfigBuilder {
        this.batchConcurrency = batchConcurrency
        return this
    }

    public build(): IpregistryConfig {
        return new IpregistryConfig(
            this.apiKey,
            this.baseUrl,
            this.timeout,
            this.maxRetries,
            this.retryInterval,
            this.retryOnServerError,
            this.retryOnTooManyRequests,
            this.maxBatchSize,
            this.batchConcurrency,
        )
    }
}

/**
 * Configuration options for constructing an `IpregistryClient`.
 */
export interface IpregistryClientOptions {
    /**
     * The API key used for authenticating requests to Ipregistry.
     */
    apiKey: string

    /**
     * The base URL of the Ipregistry API, or the shorthand 'eu' for the
     * European Union endpoint. Defaults to 'https://api.ipregistry.co'.
     */
    baseUrl?: string

    /**
     * The timeout (in milliseconds) for API requests. Defaults to 5000.
     */
    timeout?: number

    /**
     * The maximum number of automatic retries performed in addition to the
     * initial attempt. Defaults to 3. Use 0 to disable retries.
     */
    maxRetries?: number

    /**
     * The base backoff (in milliseconds) between retries. Defaults to 1000.
     */
    retryInterval?: number

    /**
     * Whether 5xx responses (and transient network errors) are retried.
     * Defaults to true.
     */
    retryOnServerError?: boolean

    /**
     * Whether 429 Too Many Requests responses are retried, honoring the
     * Retry-After header when present. Defaults to false.
     */
    retryOnTooManyRequests?: boolean

    /**
     * The maximum number of values sent in a single batch request. Capped at
     * `DEFAULT_MAX_BATCH_SIZE` (the API limit).
     */
    maxBatchSize?: number

    /**
     * How many batch sub-requests are dispatched concurrently when a batch is
     * split into chunks. Defaults to 4.
     */
    batchConcurrency?: number

    /**
     * The cache used to memoize lookups. Defaults to `NoCache`.
     */
    cache?: IpregistryCache

    /**
     * A custom handler for API requests.
     */
    requestHandler?: IpregistryRequestHandler
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
     * @param options The client configuration, including the API key.
     */
    constructor(options: IpregistryClientOptions)
    /**
     * Constructs an IpregistryClient instance for API operations.
     * @param keyOrConfig The API key as a string or an IpregistryConfig instance for custom configurations.
     * @param cache Optional. An instance implementing the IpregistryCache interface for caching responses.
     * @param requestHandler Optional. A custom handler for API requests.
     * @deprecated Pass an `IpregistryClientOptions` object instead, e.g.
     * `new IpregistryClient({ apiKey: 'KEY', cache: new InMemoryCache() })`.
     * The API-key-string form remains supported.
     */
    constructor(
        keyOrConfig: string | IpregistryConfig,
        cache?: IpregistryCache,
        requestHandler?: IpregistryRequestHandler,
    )
    constructor(
        keyOrConfigOrOptions:
            string | IpregistryConfig | IpregistryClientOptions,
        cache?: IpregistryCache,
        requestHandler?: IpregistryRequestHandler,
    ) {
        let options: IpregistryClientOptions | undefined

        if (
            keyOrConfigOrOptions &&
            typeof keyOrConfigOrOptions === 'object' &&
            !(keyOrConfigOrOptions instanceof IpregistryConfig)
        ) {
            options = keyOrConfigOrOptions
        }

        if (options) {
            this.config = new IpregistryConfig(
                options.apiKey,
                options.baseUrl === 'eu'
                    ? 'https://eu.api.ipregistry.co'
                    : (options.baseUrl ?? ''),
                options.timeout ?? 0,
                options.maxRetries,
                options.retryInterval,
                options.retryOnServerError,
                options.retryOnTooManyRequests,
                options.maxBatchSize,
                options.batchConcurrency,
            )
            cache = options.cache ?? cache
            requestHandler = options.requestHandler ?? requestHandler
        } else if (typeof keyOrConfigOrOptions === 'string') {
            this.config = new IpregistryConfigBuilder(
                keyOrConfigOrOptions,
            ).build()
        } else if (!keyOrConfigOrOptions) {
            this.config = new IpregistryConfigBuilder('tryout').build()
        } else {
            // The plain-options case was handled above, so an object here is
            // necessarily an IpregistryConfig instance.
            this.config = keyOrConfigOrOptions as IpregistryConfig
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
        options?: LookupOptions,
    ): Promise<ApiResponse<(AutonomousSystem | LookupError)[]>>
    /**
     * @deprecated Pass a `LookupOptions` object instead, e.g.
     * `client.batchLookupAsns(asns, { fields: 'name' })`.
     */
    async batchLookupAsns(
        asns: number[],
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<(AutonomousSystem | LookupError)[]>>
    async batchLookupAsns(
        asns: number[],
        ...options: (IpregistryOption | LookupOptions | undefined)[]
    ): Promise<ApiResponse<(AutonomousSystem | LookupError)[]>> {
        const { params, signal } = IpregistryClient.normalizeOptions(options)
        const sparseCache: Array<AutonomousSystem | null> =
            new Array<AutonomousSystem | null>(asns.length)
        const cacheMisses: Array<number> = []

        for (let i = 0; i < asns.length; i++) {
            const asn = asns[i]
            const cacheKey = IpregistryClient.buildCacheKey(
                asn.toString(),
                params,
            )
            const cacheValue = this.cache.get(cacheKey) as
                AutonomousSystem | undefined

            if (cacheValue) {
                sparseCache[i] = cacheValue
            } else {
                cacheMisses.push(asn)
            }
        }

        const result: Array<AutonomousSystem | LookupError> = new Array<
            AutonomousSystem | LookupError
        >(asns.length)

        const apiResponse = await this.dispatchBatchChunks(cacheMisses, chunk =>
            this.requestHandler.batchLookupAsns(chunk, params, signal),
        )
        const freshAutonomousSystem = apiResponse
            ? apiResponse.data.results
            : []

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
                    this.cache.put(
                        IpregistryClient.buildCacheKey(
                            cacheMisses[k].toString(),
                            params,
                        ),
                        freshAutonomousSystem[k] as AutonomousSystem,
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
        options?: LookupOptions,
    ): Promise<ApiResponse<(IpInfo | LookupError)[]>>
    /**
     * @deprecated Pass a `LookupOptions` object instead, e.g.
     * `client.batchLookupIps(ips, { fields: 'location' })`.
     */
    async batchLookupIps(
        ips: string[],
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<(IpInfo | LookupError)[]>>
    async batchLookupIps(
        ips: string[],
        ...options: (IpregistryOption | LookupOptions | undefined)[]
    ): Promise<ApiResponse<(IpInfo | LookupError)[]>> {
        const { params, signal } = IpregistryClient.normalizeOptions(options)
        const sparseCache: Array<IpInfo | null> = new Array<IpInfo | null>(
            ips.length,
        )
        const cacheMisses: Array<string> = []

        for (let i = 0; i < ips.length; i++) {
            const ip = ips[i]
            const cacheKey = IpregistryClient.buildCacheKey(ip, params)
            const cacheValue = this.cache.get(cacheKey) as IpInfo | undefined

            if (cacheValue) {
                sparseCache[i] = cacheValue
            } else {
                cacheMisses.push(ip)
            }
        }

        const result: Array<IpInfo | LookupError> = new Array<
            IpInfo | LookupError
        >(ips.length)

        const apiResponse = await this.dispatchBatchChunks(cacheMisses, chunk =>
            this.requestHandler.batchLookupIps(chunk, params, signal),
        )
        const freshIpInfo = apiResponse ? apiResponse.data.results : []

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
                    this.cache.put(
                        IpregistryClient.buildCacheKey(cacheMisses[k], params),
                        freshIpInfo[k] as IpInfo,
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
        options?: LookupOptions,
    ): Promise<ApiResponse<AutonomousSystem>>
    /**
     * @deprecated Pass a `LookupOptions` object instead, e.g.
     * `client.lookupAsn(asn, { fields: 'name' })`.
     */
    async lookupAsn(
        asn: number,
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<AutonomousSystem>>
    async lookupAsn(
        asn: number,
        ...options: (IpregistryOption | LookupOptions | undefined)[]
    ): Promise<ApiResponse<AutonomousSystem>> {
        const { params, signal } = IpregistryClient.normalizeOptions(options)
        const cacheKey = IpregistryClient.buildCacheKey(asn.toString(), params)
        const cacheValue = this.cache.get(cacheKey) as
            AutonomousSystem | undefined

        let result: ApiResponse<AutonomousSystem>

        if (!cacheValue) {
            result = await this.requestHandler.lookupAsn(asn, params, signal)
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
        options?: LookupOptions,
    ): Promise<ApiResponse<IpInfo>>
    /**
     * @deprecated Pass a `LookupOptions` object instead, e.g.
     * `client.lookupIp(ip, { fields: 'location', hostname: true })`.
     */
    async lookupIp(
        ip: string,
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<IpInfo>>
    async lookupIp(
        ip: string,
        ...options: (IpregistryOption | LookupOptions | undefined)[]
    ): Promise<ApiResponse<IpInfo>> {
        const { params, signal } = IpregistryClient.normalizeOptions(options)
        const cacheKey = IpregistryClient.buildCacheKey(ip, params)
        const cacheValue = this.cache.get(cacheKey) as IpInfo | undefined

        let result: ApiResponse<IpInfo>

        if (!cacheValue) {
            result = await this.requestHandler.lookupIp(ip, params, signal)
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
        options?: LookupOptions,
    ): Promise<ApiResponse<RequesterAutonomousSystem>>
    /**
     * @deprecated Pass a `LookupOptions` object instead, e.g.
     * `client.originLookupAsn({ fields: 'name' })`.
     */
    async originLookupAsn(
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<RequesterAutonomousSystem>>
    async originLookupAsn(
        ...options: (IpregistryOption | LookupOptions | undefined)[]
    ): Promise<ApiResponse<RequesterAutonomousSystem>> {
        const { params, signal } = IpregistryClient.normalizeOptions(options)
        return await this.requestHandler.originLookupAsn(params, signal)
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
        options?: LookupOptions,
    ): Promise<ApiResponse<RequesterIpInfo>>
    /**
     * @deprecated Pass a `LookupOptions` object instead, e.g.
     * `client.originLookupIp({ fields: 'location' })`.
     */
    async originLookupIp(
        ...options: IpregistryOption[]
    ): Promise<ApiResponse<RequesterIpInfo>>
    async originLookupIp(
        ...options: (IpregistryOption | LookupOptions | undefined)[]
    ): Promise<ApiResponse<RequesterIpInfo>> {
        const { params, signal } = IpregistryClient.normalizeOptions(options)
        return await this.requestHandler.originLookupIp(params, signal)
    }

    /**
     * Parses user agent strings and returns detailed information about them.
     * @param userAgents An array of user agent strings to parse.
     * @returns A Promise resolving to an ApiResponse containing an array of UserAgent information.
     */
    async parseUserAgents(
        userAgents: string[],
        options?: LookupOptions,
    ): Promise<ApiResponse<UserAgent[]>>
    /**
     * @deprecated Pass the user agents as an array instead, e.g.
     * `client.parseUserAgents([userAgent1, userAgent2])`.
     */
    async parseUserAgents(
        ...userAgents: string[]
    ): Promise<ApiResponse<UserAgent[]>>
    async parseUserAgents(
        ...args: (string | string[] | LookupOptions | undefined)[]
    ): Promise<ApiResponse<UserAgent[]>> {
        let userAgents: string[]
        let signal: AbortSignal | undefined

        if (Array.isArray(args[0])) {
            userAgents = args[0]
            const options = args[1] as LookupOptions | undefined
            signal = options?.signal
        } else {
            userAgents = args.filter(
                (value): value is string => typeof value === 'string',
            )
        }

        const response = await this.requestHandler.parseUserAgents(
            userAgents,
            signal,
        )
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

    /**
     * Resolves batch values, splitting inputs larger than `maxBatchSize` into
     * chunks dispatched with at most `batchConcurrency` requests in flight,
     * and concatenating their results in order. When a chunk fails, the first
     * error is thrown and no further chunk is dispatched (in-flight chunks
     * complete but their results are discarded). Returns null when there is
     * nothing to resolve.
     */
    private async dispatchBatchChunks<V, R>(
        values: V[],
        request: (chunk: V[]) => Promise<ApiResponse<BatchResult<R>>>,
    ): Promise<ApiResponse<BatchResult<R>> | null> {
        if (values.length === 0) {
            return null
        }

        const { batchConcurrency, maxBatchSize } = this.config

        if (values.length <= maxBatchSize) {
            return await request(values)
        }

        const chunks: V[][] = []
        for (let start = 0; start < values.length; start += maxBatchSize) {
            chunks.push(values.slice(start, start + maxBatchSize))
        }

        const responses: ApiResponse<BatchResult<R>>[] = new Array(
            chunks.length,
        )
        let nextChunk = 0
        let firstError: unknown = null

        const worker = async () => {
            while (firstError === null) {
                const index = nextChunk++
                if (index >= chunks.length) {
                    return
                }
                try {
                    responses[index] = await request(chunks[index])
                } catch (error) {
                    firstError = firstError ?? error
                    return
                }
            }
        }

        await Promise.all(
            Array.from(
                { length: Math.min(batchConcurrency, chunks.length) },
                () => worker(),
            ),
        )

        if (firstError !== null) {
            throw firstError
        }

        const results: R[] = []
        for (const response of responses) {
            results.push(...response.data.results)
        }

        return {
            credits: IpregistryClient.aggregateCredits(responses),
            data: { results },
            throttling: IpregistryClient.mostConstrainedThrottling(responses),
        }
    }

    private static aggregateCredits(
        responses: ApiResponse<unknown>[],
    ): ApiResponseCredits {
        const consumed = responses
            .map(response => response.credits.consumed)
            .filter((value): value is number => value !== null)
        const remaining = responses
            .map(response => response.credits.remaining)
            .filter((value): value is number => value !== null)

        return {
            consumed: consumed.length
                ? consumed.reduce((total, value) => total + value, 0)
                : null,
            remaining: remaining.length ? Math.min(...remaining) : null,
        }
    }

    private static mostConstrainedThrottling(
        responses: ApiResponse<unknown>[],
    ): ApiResponseThrottling | null {
        let result: ApiResponseThrottling | null = null

        for (const response of responses) {
            const throttling = response.throttling
            if (
                throttling &&
                (!result || throttling.remaining < result.remaining)
            ) {
                result = throttling
            }
        }

        return result
    }

    /**
     * Normalizes the supported option shapes (a single `LookupOptions` object
     * or legacy variadic `IpregistryOption` instances) into query parameters
     * and an optional abort signal. Param entries from `LookupOptions#params`
     * are sorted by name so equivalent options produce identical cache keys.
     */
    private static normalizeOptions(
        options: (IpregistryOption | LookupOptions | undefined)[],
    ): { params: IpregistryOption[]; signal?: AbortSignal } {
        const provided = options.filter(
            (option): option is IpregistryOption | LookupOptions =>
                option !== undefined && option !== null,
        )

        if (
            provided.length === 1 &&
            !(provided[0] instanceof IpregistryOption)
        ) {
            const lookupOptions = provided[0]
            const params: IpregistryOption[] = []

            if (lookupOptions.fields !== undefined) {
                params.push(new FilterOption(lookupOptions.fields))
            }

            if (lookupOptions.hostname !== undefined) {
                params.push(new HostnameOption(lookupOptions.hostname))
            }

            if (lookupOptions.params) {
                for (const name of Object.keys(lookupOptions.params).sort()) {
                    params.push(
                        new IpregistryOption(
                            name,
                            String(lookupOptions.params[name]),
                        ),
                    )
                }
            }

            return { params, signal: lookupOptions.signal }
        }

        return { params: provided as IpregistryOption[] }
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
export * from './version.js'

export { UserAgents } from './util.js'
