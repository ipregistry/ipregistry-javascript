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

import ky from 'ky'

import { ApiError, ClientError } from './errors.js'
import { IpregistryConfig } from './index.js'
import { IpInfo, RequesterIpInfo, UserAgent } from './model.js'
import { IpregistryOption } from './options.js'


export interface ApiResponse<T> {
    credits: ApiResponseCredits;
    data: T;
    throttling: ApiResponseThrottling | null;
}

export interface ApiResponseCredits {
    /**
     * The number of credits consumed to produce this response.
     */
    consumed: number | null;
    /**
     * The estimated number of credits remaining on the account associated with
     * the API key that was used to make the request.
     */
    remaining: number | null;
}

export interface ApiResponseThrottling {
    /**
     * Indicates how many requests is allowed per hour (time window).
     */
    limit: number | null;

    /**
     * Indicates how many requests are remaining for the current window.
     */
    remaining: number | null;

    /**
     * Indicates when the current window ends, in seconds from the current time.
     */
    reset: number | null;
}

export interface IpregistryRequestHandler {
    batchLookup(ipAddresses: string[], options: IpregistryOption[]): Promise<ApiResponse<IpInfo[]>>;

    lookup(ipAddress: string, options: IpregistryOption[]): Promise<ApiResponse<IpInfo>>;

    originLookup(options: IpregistryOption[]): Promise<ApiResponse<RequesterIpInfo>>;

    parse(userAgents: string[]): Promise<ApiResponse<UserAgent[]>>;
}

export class DefaultRequestHandler implements IpregistryRequestHandler {
    private static USER_AGENT: string = 'Ipregistry/JavaScript/3.0.0'
    private config: IpregistryConfig

    constructor(config: IpregistryConfig) {
        this.config = config
    }

    async batchLookup(ips: string[], options: IpregistryOption[]): Promise<ApiResponse<IpInfo[]>> {
        try {
            const response = await ky.post(this.buildApiUrl('', options), {
                json: ips,
                ...this.getKyConfig()
            }).json()

            return this.buildApiResponse(response)
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async lookup(ip: string, options: IpregistryOption[]): Promise<ApiResponse<IpInfo>> {
        try {
            const response = await ky.get(this.buildApiUrl(ip, options), this.getKyConfig()).json()

            return this.buildApiResponse(response)
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async originLookup(options: IpregistryOption[]): Promise<ApiResponse<RequesterIpInfo>> {
        try {
            const response = await ky.get(this.buildApiUrl('', options), this.getKyConfig()).json()

            return this.buildApiResponse(response)
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async parse(userAgents: string[]): Promise<ApiResponse<UserAgent[]>> {
        try {
            const response = await ky.post(this.buildApiUrl('user_agent'), {
                json: userAgents,
                ...this.getKyConfig()
            }).json()

            return this.buildApiResponse(response)
        } catch (error) {
            throw this.handleError(error)
        }
    }

    protected getKyConfig() {
        const headers = {
            'authorization': `ApiKey ${this.config.apiKey}`,
            'content-type': 'application/json'
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
            timeout: this.config.timeout
        }
    }

    protected buildApiResponse(response: any): ApiResponse<any> {
        return {
            credits: {
                consumed: DefaultRequestHandler.parseInt(response.headers.get('ipregistry-credits-consumed')),
                remaining: DefaultRequestHandler.parseInt(response.headers.get('ipregistry-credits-remaining'))
            },
            data: response.data,
            throttling: {
                limit: DefaultRequestHandler.parseInt(response.headers.get('x-rate-limit-limit')),
                remaining: DefaultRequestHandler.parseInt(response.headers.get('x-rate-limit-remaining')),
                reset: DefaultRequestHandler.parseInt(response.headers.get('x-rate-limit-reset'))
            }
        }
    }

    protected handleError(error: any) {
        if (error.response) {
            throw new ApiError(error.response.status, error.response.statusText, '')
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
            options.forEach(option => searchParams.append(option.name, option.value))
            result += `?${searchParams.toString()}`
        }

        return result
    }
}
