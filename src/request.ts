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

import ky, { HTTPError, KyResponse } from 'ky'

import { ApiError, ClientError, LookupError } from './errors.js'
import {
    AutonomousSystem,
    IpregistryConfig,
    RequesterAutonomousSystem,
} from './index.js'
import { IpInfo, RequesterIpInfo, UserAgent } from './model.js'
import { IpregistryOption } from './options.js'

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
    private static USER_AGENT: string = 'Ipregistry/JavaScript/3.0.0'
    private config: IpregistryConfig

    constructor(config: IpregistryConfig) {
        this.config = config
    }

    async batchLookupAsns(
        asns: number[],
        options: IpregistryOption[],
    ): Promise<ApiResponse<BatchResult<AutonomousSystem | LookupError>>> {
        try {
            const response: KyResponse = await ky.post(
                this.buildApiUrl('', options),
                {
                    json: asns.map(asn => `AS${asn}`),
                    ...this.getKyConfig(),
                },
            )

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
            const response: KyResponse = await ky.post(
                this.buildApiUrl('', options),
                {
                    json: ips,
                    ...this.getKyConfig(),
                },
            )

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
            const response: KyResponse = await ky.get(
                this.buildApiUrl(`AS${asn}`, options),
                this.getKyConfig(),
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
            const response: KyResponse = await ky.get(
                this.buildApiUrl(ip, options),
                this.getKyConfig(),
            )
            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    async originLookupAsn(
        options: IpregistryOption[],
    ): Promise<ApiResponse<RequesterAutonomousSystem>> {
        try {
            const response: KyResponse = await ky.get(
                this.buildApiUrl('AS', options),
                this.getKyConfig(),
            )
            return this.buildApiResponse(response)
        } catch (error: unknown) {
            throw await this.handleError(error)
        }
    }

    async originLookupIp(
        options: IpregistryOption[],
    ): Promise<ApiResponse<RequesterIpInfo>> {
        try {
            const response: KyResponse = await ky.get(
                this.buildApiUrl('', options),
                this.getKyConfig(),
            )
            return this.buildApiResponse(response)
        } catch (error: unknown) {
            throw await this.handleError(error)
        }
    }

    async parseUserAgents(
        userAgents: string[],
    ): Promise<ApiResponse<BatchResult<UserAgent>>> {
        try {
            const response: KyResponse = await ky.post(
                this.buildApiUrl('user_agent'),
                {
                    json: userAgents,
                    ...this.getKyConfig(),
                },
            )
            return this.buildApiResponse(response)
        } catch (error) {
            throw await this.handleError(error)
        }
    }

    protected getKyConfig() {
        const headers = {
            authorization: `ApiKey ${this.config.apiKey}`,
            'content-type': 'application/json',
        }

        try {
            if (window === undefined) {
                headers['user-agent'] = DefaultRequestHandler.USER_AGENT
            }
        } catch (error) {
            // ignore
        }

        return {
            headers: headers,
            timeout: this.config.timeout,
        }
    }

    protected async buildApiResponse(
        response: KyResponse,
    ): Promise<ApiResponse<any>> {
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
            data: await response.json(),
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
        if (error instanceof HTTPError) {
            const json = await error.response.json()
            return new ApiError(json.code, json.message, json.resolution)
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
