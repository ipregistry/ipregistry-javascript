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

import {ApiError, ClientError} from './errors';
import {IpInfo, RequesterIpInfo} from './model';
import {IpregistryConfig} from './index';
import {IpregistryOption} from './options';

import axios, {AxiosResponse} from 'axios';


export interface ApiResponse<T> {

    credits: ApiResponseCredits;

    data: T;

    throttling: ApiResponseThrottling | null;

}

export interface ApiResponseCredits {

    /**
     * The number of credits consumed to produce this response.
     */
    consumed: number;

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

    lookup(ip: string, options: IpregistryOption[]): Promise<ApiResponse<IpInfo>>;

    batchLookup(ips: string[], options: IpregistryOption[]): Promise<ApiResponse<IpInfo[]>>;

    originLookup(options: IpregistryOption[]): Promise<ApiResponse<RequesterIpInfo>>;

}

export class DefaultRequestHandler implements IpregistryRequestHandler {

    private static USER_AGENT: string = 'Ipregistry/Javascript/1.0.0';

    private config: IpregistryConfig;

    constructor(config: IpregistryConfig) {
        this.config = config;
    }

    async lookup(ip: string, options: IpregistryOption[]): Promise<ApiResponse<IpInfo>> {
        try {
            const response =
                await axios.get(
                    this.buildApiUrl(ip, options),
                    this.getAxiosConfig()
                );

            return {
                credits: {
                    consumed: 1,
                    remaining: this.getRemainingCredits(response)
                },
                data: response.data as IpInfo,
                throttling: this.getThrottlingData(response)
            };
        } catch (error) {
            if (error.isAxiosError && error.response) {
                const data = error.response.data;
                throw new ApiError(data.code, data.message, data.resolution);
            }

            throw new ClientError(error.message);
        }
    }

    async batchLookup(ips: string[], options: IpregistryOption[]): Promise<ApiResponse<IpInfo[]>> {
        try {
            const response =
                await axios.post(
                    this.buildApiUrl('', options),
                    JSON.stringify(ips),
                    this.getAxiosConfig()
                );

            return {
                credits: {
                    consumed: ips.length,
                    remaining: this.getRemainingCredits(response)
                },
                data: response.data.results,
                throttling: this.getThrottlingData(response)
            };
        } catch (error) {
            if (error.isAxiosError && error.response) {
                const data = error.response.data;
                throw new ApiError(data.code, data.message, data.resolution);
            }

            throw new ClientError(error.message);
        }
    }

    async originLookup(options: IpregistryOption[]): Promise<ApiResponse<RequesterIpInfo>> {
        try {
            const response =
                await axios.get(
                    this.buildApiUrl('', options),
                    this.getAxiosConfig()
                );

            return {
                credits: {
                    consumed: 1,
                    remaining: this.getRemainingCredits(response)
                },
                data: response.data as RequesterIpInfo,
                throttling: this.getThrottlingData(response)
            };
        } catch (error) {
            if (error.isAxiosError && error.response) {
                const data = error.response.data;
                throw new ApiError(data.code, data.message, data.resolution);
            }

            throw new ClientError(error.message);
        }
    }

    protected getAxiosConfig() {
        const headers = {
            'content-type': 'application/json',
        };

        try {
            if (window === undefined) {
                headers['user-agent'] = DefaultRequestHandler.USER_AGENT;
            }
        } catch (error) {
            // ignore
        }

        return {
            headers: headers,
            timeout: this.config.timeout
        };
    }

    protected getRemainingCredits(response: AxiosResponse): number | null {
        return DefaultRequestHandler.parseInt(response.headers['ipregistry-credits-remaining']);
    }

    protected getThrottlingData(response: AxiosResponse): ApiResponseThrottling | null {
        const ratelimit = response.headers['x-rate-limit-limit'];

        if (!ratelimit) {
            return null;
        }

        return {
            limit: DefaultRequestHandler.parseInt(ratelimit),
            remaining: DefaultRequestHandler.parseInt(response.headers['x-rate-limit-remaining']),
            reset: DefaultRequestHandler.parseInt(response.headers['x-rate-limit-reset'])
        }
    }

    protected static parseInt(value: string): number | null {
        const result = parseInt(value);

        if (isNaN(result)) {
            return null;
        }

        return result;
    }

    protected buildApiUrl(ip: string, options: IpregistryOption[]) {
        let result = `${this.config.apiUrl}/${ip ? ip : ''}?key=${this.config.apiKey}`;

        if (options) {
            for (const option of options) {
                result += `&${option.name}=${encodeURIComponent(option.value)}`;
            }
        }

        return result;
    }

}
