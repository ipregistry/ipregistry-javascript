import {ApiError, ClientError} from './errors';
import {IpInfo, RequesterIpInfo} from './model';
import {IpregistryConfig} from './index';
import {IpregistryOption} from './options';

import axios from 'axios';

export interface IpregistryRequestHandler {

    lookup(ip: string, options: IpregistryOption[]): Promise<IpInfo>;

    batchLookup(ip: string, options: IpregistryOption[]): Promise<IpInfo[]>;

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
            return response.data as IpInfo;
        } catch (error) {
            if (error.isAxiosError && error.response) {
                const data = error.response.data;
                throw new ApiError(data.code, data.message, data.resolution);
            }

            throw new ClientError(error.message);
        }
    }

    async batchLookup(ip: string, options: IpregistryOption[]): Promise<IpInfo[]> {
        return Promise.resolve({} as IpInfo[]);
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
        return {
            headers: {'User-Agent': DefaultRequestHandler.USER_AGENT},
            timeout: this.config.timeout
        };
    }

    protected buildApiUrl(ip: string, options: IpregistryOption[]) {
        let result = `${this.config.apiUrl}/${ip ? ip : ''}?key=${this.config.apiKey}`;

        if (options) {
            for (let option of options) {
                result += `&${option.name}=${encodeURIComponent(option.value)}`;
            }
        }

        return result;
    }

}
