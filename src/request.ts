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

import { ApiError, ClientError, LookupError } from './errors.js'
import {
    AutonomousSystem,
    IpregistryConfig,
    RequesterAutonomousSystem,
} from './index.js'
import { IpInfo, RequesterIpInfo, UserAgent } from './model.js'
import { IpregistryOption } from './options.js'

import {customFetch} from './fetch.js'

export interface ApiResponse<T> {
    credits: ApiResponseCredits
    data: T
    throttling: ApiResponseThrottling | null
}

export interface ApiResponseCredits {
    /**
     * The number of credits consumed to produce this response.
     */
    consumed: number | null
    /**
     * The estimated number of credits remaining on the account associated with
     * the API key that was used to make the request.
     */
    remaining: number | null
}

export interface ApiResponseThrottling {
    /**
     * Indicates how many requests is allowed per hour (time window).
     */
    limit: number

    /**
     * Indicates how many requests are remaining for the current window.
     */
    remaining: number

    /**
     * Indicates when the current window ends, in seconds from the current time.
     */
    reset: number
}

export interface BatchResult<T> {
    results: Array<T>
}

export interface IpregistryRequestHandler {
    batchLookupAsns(
        asns: number[],
        options: IpregistryOption[],
    ): Promise<ApiResponse<BatchResult<AutonomousSystem | LookupError>>>

    batchLookupIps(
        ipAddresses: string[],
        options: IpregistryOption[],
    ): Promise<ApiResponse<BatchResult<IpInfo | LookupError>>>

    lookupAsn(
        asn: number,
        options: IpregistryOption[],
    ): Promise<ApiResponse<AutonomousSystem>>

    lookupIp(
        ipAddress: string,
        options: IpregistryOption[],
    ): Promise<ApiResponse<IpInfo>>

    originLookupAsn(
        options: IpregistryOption[],
    ): Promise<ApiResponse<RequesterAutonomousSystem>>

    originLookupIp(
        options: IpregistryOption[],
    ): Promise<ApiResponse<RequesterIpInfo>>

    parseUserAgents(
        userAgents: string[],
    ): Promise<ApiResponse<BatchResult<UserAgent>>>
}

export class DefaultRequestHandler implements IpregistryRequestHandler {
    private static USER_AGENT: string = 'Ipregistry/JavaScript/4.0.0'
    private config: IpregistryConfig

    constructor(config: IpregistryConfig) {
        this.config = config
    }

    async batchLookupAsns(
        asns: number[],
        options: IpregistryOption[],
    ): Promise<ApiResponse<BatchResult<AutonomousSystem | LookupError>>> {
        try {
            const response = await customFetch(this.buildApiUrl('', options), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(asns.map(asn => `AS${asn}`)),
                timeout: this.config.timeout
            })

            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    async batchLookupIps(
        ips: string[],
        options: IpregistryOption[],
    ): Promise<ApiResponse<BatchResult<IpInfo | LookupError>>> {
        try {
            const response = await customFetch(this.buildApiUrl('', options), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(ips),
                timeout: this.config.timeout
            })

            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    async lookupAsn(
        asn: number,
        options: IpregistryOption[],
    ): Promise<ApiResponse<AutonomousSystem>> {
        try {
            const response = await customFetch(
                this.buildApiUrl(`AS${asn}`, options),
                {
                    method: 'GET',
                    headers: this.getHeaders(),
                    timeout: this.config.timeout
                },
            )
            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    async lookupIp(
        ip: string,
        options: IpregistryOption[],
    ): Promise<ApiResponse<IpInfo>> {
        try {
            const response = await customFetch(this.buildApiUrl(ip, options), {
                method: 'GET',
                headers: this.getHeaders(),
                timeout: this.config.timeout
            })
            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    async originLookupAsn(
        options: IpregistryOption[],
    ): Promise<ApiResponse<RequesterAutonomousSystem>> {
        try {
            const response = await customFetch(this.buildApiUrl('AS', options), {
                method: 'GET',
                headers: this.getHeaders(),
                timeout: this.config.timeout
            })
            return this.buildApiResponse(response)
        } catch (error: unknown) {
            throw await this.handleError(error)
        }
    }

    async originLookupIp(
        options: IpregistryOption[],
    ): Promise<ApiResponse<RequesterIpInfo>> {
        try {
            const response = await customFetch(this.buildApiUrl('', options), {
                method: 'GET',
                headers: this.getHeaders(),
                timeout: this.config.timeout
            })
            return this.buildApiResponse(response)
        } catch (error: unknown) {
            throw await this.handleError(error)
        }
    }

    async parseUserAgents(
        userAgents: string[],
    ): Promise<ApiResponse<BatchResult<UserAgent>>> {
        try {
            const response = await customFetch(this.buildApiUrl('user_agent'), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(userAgents),
                timeout: this.config.timeout
            })
            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    protected getHeaders() {
        const headers: Record<string, string> = {
            authorization: `ApiKey ${this.config.apiKey}`,
            'content-type': 'application/json',
        }

        if (typeof window === 'undefined') {
            headers['user-agent'] = DefaultRequestHandler.USER_AGENT
        }

        return headers
    }

    protected async buildApiResponse(
        response: Response,
    ): Promise<ApiResponse<any>> {
        const data = await response.json();

        const throttlingLimit = DefaultRequestHandler.parseInt(
            response.headers.get('x-rate-limit-limit'),
        )
        const throttlingRemaining = DefaultRequestHandler.parseInt(
            response.headers.get('x-rate-limit-remaining'),
        )
        const throttlingReset = DefaultRequestHandler.parseInt(
            response.headers.get('x-rate-limit-reset'),
        )

        return {
            credits: {
                consumed: DefaultRequestHandler.parseInt(
                    response.headers.get('ipregistry-credits-consumed'),
                ),
                remaining: DefaultRequestHandler.parseInt(
                    response.headers.get('ipregistry-credits-remaining'),
                ),
            },
            data: data,
            throttling:
                throttlingLimit == null &&
                throttlingRemaining == null &&
                throttlingReset == null
                    ? null
                    : {
                          limit: throttlingLimit ?? 0,
                          remaining: throttlingRemaining ?? 0,
                          reset: throttlingReset ?? 0,
                      },
        }
    }

    protected async handleError(error: any) {
        if (error instanceof ApiError) {
            throw error
        }

        if (error.name === 'AbordError') {
            throw new ClientError('Request timed out');
        }

        return new ClientError(error.message)
    }

    protected static parseInt(value: string | null): number | null {
        if (value === null) return null
        const result = parseInt(value)
        return isNaN(result) ? null : result
    }

    protected buildApiUrl(path: string, options?: IpregistryOption[]) {
        let result = `${this.config.baseUrl}/${path ? path : ''}`

        if (options) {
            const searchParams = new URLSearchParams()
            options.forEach(option =>
                searchParams.append(option.name, option.value),
            )
            result += `?${searchParams.toString()}`
        }

        return result
    }
}
