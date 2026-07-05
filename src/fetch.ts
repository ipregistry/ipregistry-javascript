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

import { ApiError, ClientError } from './errors.js'

interface Options extends RequestInit {
    maxRetries?: number
    retryInterval?: number
    retryOnServerError?: boolean
    retryOnTooManyRequests?: boolean
    timeout?: number
}

const DEFAULT_OPTIONS = {
    maxRetries: 3,
    retryInterval: 1000,
    retryOnServerError: true,
    retryOnTooManyRequests: false,
    timeout: 5000,
}

/**
 * Performs an HTTP request with automatic retries. Transport errors (timeouts
 * and network failures) are retried up to `maxRetries` regardless of the
 * retry-on-status flags; 429 and 5xx responses are retried according to those
 * flags, honoring the Retry-After header when present. Non-ok responses are
 * converted to `ApiError`.
 */
export async function customFetch(
    url: string,
    providedOptions: Options,
): Promise<Response> {
    const options = {
        ...DEFAULT_OPTIONS,
        ...Object.fromEntries(
            Object.entries(providedOptions).filter(
                ([, value]) => value !== undefined,
            ),
        ),
    } as Required<Pick<Options, keyof typeof DEFAULT_OPTIONS>> & Options

    for (let attempt = 0; ; attempt++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), options.timeout)

        let response: Response
        try {
            response = await fetch(url, {
                ...options,
                signal: controller.signal,
            })
        } catch {
            // Transport errors are retried up to maxRetries regardless of the
            // retry-on-status flags, matching the other Ipregistry clients.
            if (attempt < options.maxRetries) {
                await backoff(options.retryInterval, attempt, 0)
                continue
            }
            throw new ClientError(
                `Request failed after ${options.maxRetries} retries`,
            )
        } finally {
            clearTimeout(timeoutId)
        }

        if (response.ok) {
            return response
        }

        if (
            shouldRetryStatus(response.status, options) &&
            attempt < options.maxRetries
        ) {
            const retryAfter = parseRetryAfter(
                response.headers.get('retry-after'),
            )
            await backoff(options.retryInterval, attempt, retryAfter)
            continue
        }

        let data
        try {
            data = await response.json()
        } catch {
            throw new ApiError(
                '',
                `Unexpected HTTP status ${response.status}`,
                '',
            )
        }

        throw new ApiError(data.code, data.message, data.resolution)
    }
}

/**
 * Reports whether a non-ok status is eligible for retry given the
 * configuration.
 */
function shouldRetryStatus(
    status: number,
    options: { retryOnServerError: boolean; retryOnTooManyRequests: boolean },
): boolean {
    if (status === 429) {
        return options.retryOnTooManyRequests
    }

    if (status >= 500 && status < 600) {
        return options.retryOnServerError
    }

    return false
}

/**
 * Parses a Retry-After header expressed as an integer number of seconds and
 * returns the corresponding delay in milliseconds. Returns 0 when the header
 * is absent or not a valid non-negative integer (the HTTP-date form is not
 * supported, matching the other Ipregistry clients).
 */
function parseRetryAfter(value: string | null): number {
    if (!value || !/^\d+$/.test(value)) {
        return 0
    }

    return parseInt(value) * 1000
}

/**
 * Waits before the next retry attempt, honoring an explicit Retry-After delay
 * when positive and otherwise using exponential backoff
 * (retryInterval * 2^attempt).
 */
async function backoff(
    retryInterval: number,
    attempt: number,
    retryAfter: number,
): Promise<void> {
    let delay = retryAfter

    if (delay <= 0) {
        delay = retryInterval * 2 ** Math.min(attempt, 30)
    }

    await new Promise(resolve => setTimeout(resolve, delay))
}
