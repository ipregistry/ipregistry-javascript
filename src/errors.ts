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

export class IpregistryError extends Error {

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }

}

export class ApiError extends IpregistryError {

    public readonly code: string;

    public readonly message: string;

    public readonly resolution: string;

    constructor(code: string, message: string, resolution: string) {
        super(message);
        this.code = code;
        this.message = message;
        this.resolution = resolution;
        Object.setPrototypeOf(this, new.target.prototype);
    }

}

export class ClientError extends IpregistryError {

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }

}

export class LookupError extends ApiError {

    constructor(code: string, message: string, resolution: string) {
        super(code, message, resolution);
    }

}

export enum ErrorCode {

    BAD_REQUEST = 'BAD_REQUEST',
    DISABLED_API_KEY = 'DISABLED_API_KEY',
    FORBIDDEN_IP = 'FORBIDDEN_IP',
    FORBIDDEN_ORIGIN = 'FORBIDDEN_ORIGIN',
    FORBIDDEN_IP_ORIGIN = 'FORBIDDEN_IP_ORIGIN',
    INTERNAL = 'INTERNAL',
    INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
    INVALID_API_KEY = 'INVALID_API_KEY',
    INVALID_FILTER_SYNTAX = 'INVALID_FILTER_SYNTAX',
    INVALID_IP_ADDRESS = 'INVALID_IP_ADDRESS',
    MISSING_API_KEY = 'MISSING_API_KEY',
    RESERVED_IP_ADDRESS = 'RESERVED_IP_ADDRESS',
    TOO_MANY_IPS = 'TOO_MANY_IPS',
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
    TOO_MANY_USER_AGENTS = 'TOO_MANY_USER_AGENTS'

}

export function isError(object: any): boolean {
    return object && 'message' in object;
}

export function isApiError(object: any): boolean {
    return isError(object) && 'code' in object;
}
