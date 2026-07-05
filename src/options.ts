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

/**
 * Options accepted by lookup methods.
 */
export interface LookupOptions {
    /**
     * Selects the fields to include in the response, as a comma-separated
     * list of field paths (e.g. 'location.country,security').
     */
    fields?: string

    /**
     * Whether to resolve and include the hostname the IP address points to.
     */
    hostname?: boolean

    /**
     * Additional query parameters to send with the request.
     */
    params?: Record<string, string | number | boolean>

    /**
     * Cancels the request (including retries and, for batch lookups, pending
     * chunks) when aborted.
     */
    signal?: AbortSignal
}

/**
 * @deprecated Use `LookupOptions` instead, e.g.
 * `client.lookupIp(ip, { fields: 'location', hostname: true })`.
 */
export class IpregistryOption {
    public readonly name: string

    public readonly value: string

    constructor(name: string, value: string) {
        this.name = name
        this.value = value
    }
}

/**
 * @deprecated Use `LookupOptions#fields` instead.
 */
export class FilterOption extends IpregistryOption {
    constructor(expression: string) {
        super('fields', expression)
    }
}

/**
 * @deprecated Use `LookupOptions#hostname` instead.
 */
export class HostnameOption extends IpregistryOption {
    constructor(hostname: boolean) {
        super('hostname', String(hostname))
    }
}

/**
 * @deprecated Use `LookupOptions` instead, e.g.
 * `client.lookupIp(ip, { fields: 'location', hostname: true })`.
 */
export class IpregistryOptions {
    public static filter(fields: string): FilterOption {
        return new FilterOption(fields)
    }

    public static hostname(hostname: boolean): HostnameOption {
        return new HostnameOption(hostname)
    }

    public static from(name: string, value: string): IpregistryOption {
        return new IpregistryOption(name, value)
    }
}
