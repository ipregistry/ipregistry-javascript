import {EmptyCache, IpregistryCache} from './cache';
import {DefaultRequestHandler, IpregistryRequestHandler} from './request';
import {IpregistryOption} from './options';
import {IpInfo, RequesterIpInfo} from './model';

export class IpregistryClient {

    private config: IpregistryConfig;

    private cache: IpregistryCache;

    private requestHandler: IpregistryRequestHandler;

    constructor(
        keyOrConfig: string | IpregistryConfig,
        cache?: IpregistryCache,
        requestHandler?: IpregistryRequestHandler) {

        if (typeof keyOrConfig === 'string') {
            this.config = new IpregistryConfigBuilder(keyOrConfig).build();
        } else if (!keyOrConfig) {
            this.config = new IpregistryConfigBuilder('tryout').build();
        } else {
            this.config = keyOrConfig;
        }

        if (cache) {
            this.cache = cache;
        } else {
            this.cache = new EmptyCache();
        }

        if (requestHandler) {
            this.requestHandler = requestHandler;
        } else {
            this.requestHandler = new DefaultRequestHandler(this.config);
        }
    }

    lookup(ip: string, ...options: IpregistryOption[]): Promise<IpInfo> {
        return this.requestHandler.lookup(ip, options);
    }

    batchLookup(ip: string, ...options: IpregistryOption[]): Promise<IpInfo[]> {
        return this.requestHandler.batchLookup(ip, options);
    }

    originLookup(...options: IpregistryOption[]): Promise<RequesterIpInfo> {
        return this.requestHandler.originLookup(options);
    }

}

export class IpregistryConfig {

    public readonly apiKey: string;

    public readonly apiUrl: string = 'https://api.ipregistry.co';

    public readonly timeout: number = 1000;

    constructor(apiKey: string, apiUrl: string, timeout: number) {
        this.apiKey = apiKey;

        if (apiUrl) {
            this.apiUrl = apiUrl;
        }

        if (timeout) {
            this.timeout = timeout;
        }
    }

}

export class IpregistryConfigBuilder {

    private apiKey: string;

    private apiUrl: string = 'https://api.ipregistry.co';

    private timeout: number = 1000;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    public withApiUrl(apiUrl: string): IpregistryConfigBuilder {
        this.apiUrl = apiUrl;
        return this;
    }

    public withTimeout(timeout: number): IpregistryConfigBuilder {
        this.timeout = timeout;
        return this;
    }

    public build(): IpregistryConfig {
        return new IpregistryConfig(this.apiKey, this.apiUrl, this.timeout);
    }

}

export * from './cache';
export * from './errors';
export * from './model';
export * from './options';
export * from './request';
