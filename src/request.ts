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
import {IpInfo, Account, RequesterIpInfo} from './model';
import {IpregistryConfig} from './index';
import {IpregistryOption} from './options';

import axios from 'axios';

export interface IpregistryRequestHandler {

    lookup(ip: string, options: IpregistryOption[]): Promise<IpInfo>;

    batchLookup(ips: string[], options: IpregistryOption[]): Promise<IpInfo[]>;

    originLookup(options: IpregistryOption[]): Promise<RequesterIpInfo>;

}

export class DefaultRequestHandler implements IpregistryRequestHandler {

    private static USER_AGENT: string = 'Ipregistry/Javascript/1.0.0';

    private config: IpregistryConfig;

    constructor(config: IpregistryConfig) {
        this.config = config;
    }

    async lookup(ip: string, options: IpregistryOption[]): Promise<IpInfo> {
        try {
            const response =
                await axios.get(
                    this.buildApiUrl(ip, options),
                    this.getAxiosConfig()
                );
            const ipData = response.data as IpInfo;
            ipData.account = {
                remaining_credits: response.headers['ipregistry-credits'],
                rate_limit: response.headers['x-rate-limit-limit'],
                rate_limit_remaining: response.headers['x-rate-limit-remaining']
            } as Account;
            return ipData
        } catch (error) {
            if (error.isAxiosError && error.response) {
                const data = error.response.data;
                throw new ApiError(data.code, data.message, data.resolution);
            }

            throw new ClientError(error.message);
        }
    }

    async batchLookup(ips: string[], options: IpregistryOption[]): Promise<IpInfo[]> {
        try {
            const response =
                await axios.post(
                    this.buildApiUrl('', options),
                    JSON.stringify(ips),
                    this.getAxiosConfig()
                );
            return response.data.results;
        } catch (error) {
            if (error.isAxiosError && error.response) {
                const data = error.response.data;
                throw new ApiError(data.code, data.message, data.resolution);
            }

            throw new ClientError(error.message);
        }
    }

    async originLookup(options: IpregistryOption[]): Promise<RequesterIpInfo> {
        try {
            const response =
                await axios.get(
                    this.buildApiUrl('', options),
                    this.getAxiosConfig()
                );
            return response.data as RequesterIpInfo;
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
        } catch(error) {
            // ignore
        }

        return {
            headers: headers,
            timeout: this.config.timeout
        };
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
