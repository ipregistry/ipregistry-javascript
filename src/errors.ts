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

    DISABLED_API_KEY,
    FORBIDDEN_IP,
    FORBIDDEN_ORIGIN,
    INTERNAL,
    INSUFFICIENT_CREDITS,
    INVALID_API_KEY,
    INVALID_FILTER_SYNTAX,
    INVALID_IP_ADDRESS,
    MISSING_API_KEY,
    PRIVATE_IP_ADDRESS,
    TOO_MANY_IPS,
    TOO_MANY_REQUESTS

}

export function isError(object: any): boolean {
    return object && 'message' in object;
}

export function isApiError(object: any): boolean {
    return isError(object) && 'code' in object;
}
