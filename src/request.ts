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
                    `${this.config.apiUrl}/${ip}?key=${this.config.apiKey}`,
                    this.getAxiosConfig()
                );
            return response.data as IpInfo;
        } catch (error) {
            if (error.isAxiosError) {
                if (error.response) {
                    const data = error.response.data;
                    throw new ApiError(data.code, data.message, data.resolution);
                }

                throw new ClientError(error.message);
            } else {
                throw new ClientError(error.message);
            }
        }
    }

    async batchLookup(ip: string, options: IpregistryOption[]): Promise<IpInfo[]> {
        return Promise.resolve({} as IpInfo[]);
    }

    async originLookup(options: IpregistryOption[]): Promise<RequesterIpInfo> {
        try {
            const response =
                await axios.get(
                    `${this.config.apiUrl}/?key=${this.config.apiKey}`,
                    this.getAxiosConfig()
                );
            return response.data as RequesterIpInfo;
        } catch (error) {
            if (error.isAxiosError) {
                if (error.response) {
                    const data = error.response.data;
                    throw new ApiError(data.code, data.message, data.resolution);
                }

                throw new ClientError(error.message);
            } else {
                throw new ClientError(error.message);
            }
        }
    }

    private getAxiosConfig() {
        return {
            headers: {'User-Agent': DefaultRequestHandler.USER_AGENT},
            timeout: this.config.timeout
        };
    }

}
