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

import {
    ApiError,
    ClientError,
    DefaultRequestHandler,
    IpregistryConfigBuilder,
} from '../dist/index.mjs'

import { afterEach, describe, it } from 'node:test'
import { expect } from 'chai'

const originalFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = originalFetch
})

function newHandler(
    timeout: number = 5000,
    configure: (
        builder: IpregistryConfigBuilder,
    ) => IpregistryConfigBuilder = builder => builder,
): DefaultRequestHandler {
    return new DefaultRequestHandler(
        configure(
            new IpregistryConfigBuilder('tryout')
                .withTimeout(timeout)
                .withRetryInterval(1),
        ).build(),
    )
}

function jsonResponse(
    body: unknown,
    headers: Record<string, string> = {},
    status: number = 200,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    })
}

function errorBody(code: string) {
    return { code, message: `error ${code}`, resolution: 'try again later' }
}

function abortingFetch(onAttempt: () => Response | null): typeof fetch {
    return ((_url: unknown, init: RequestInit) =>
        new Promise((resolve, reject) => {
            const response = onAttempt()
            if (response) {
                resolve(response)
                return
            }
            init.signal?.addEventListener('abort', () =>
                reject(
                    Object.assign(new Error('This operation was aborted'), {
                        name: 'AbortError',
                    }),
                ),
            )
        })) as typeof fetch
}

function countingFetch(responses: (() => Response)[]): {
    attempts: () => number
} {
    let attempts = 0
    globalThis.fetch = (async () => {
        const index = Math.min(attempts, responses.length - 1)
        attempts++
        return responses[index]()
    }) as typeof fetch
    return { attempts: () => attempts }
}

describe('retry configuration', () => {
    it('defaults match the other Ipregistry clients', () => {
        const config = new IpregistryConfigBuilder('tryout').build()

        expect(config.maxRetries).to.equal(3)
        expect(config.retryInterval).to.equal(1000)
        expect(config.retryOnServerError).to.be.true
        expect(config.retryOnTooManyRequests).to.be.false
    })

    it('ignores invalid values', () => {
        const config = new IpregistryConfigBuilder('tryout')
            .withMaxRetries(-1)
            .withRetryInterval(0)
            .build()

        expect(config.maxRetries).to.equal(3)
        expect(config.retryInterval).to.equal(1000)
    })
})

describe('DefaultRequestHandler response building', () => {
    it('parses credits and throttling response headers', async () => {
        globalThis.fetch = async () =>
            jsonResponse(
                { ip: '8.8.8.8' },
                {
                    'ipregistry-credits-consumed': '2',
                    'ipregistry-credits-remaining': '998',
                    'x-rate-limit-limit': '100',
                    'x-rate-limit-remaining': '99',
                    'x-rate-limit-reset': '3600',
                },
            )

        const response = await newHandler().lookupIp('8.8.8.8', [])

        expect(response.data).to.deep.equal({ ip: '8.8.8.8' })
        expect(response.credits).to.deep.equal({ consumed: 2, remaining: 998 })
        expect(response.throttling).to.deep.equal({
            limit: 100,
            remaining: 99,
            reset: 3600,
        })
    })

    it('returns null credits and throttling when headers are absent or malformed', async () => {
        globalThis.fetch = async () =>
            jsonResponse(
                { ip: '8.8.8.8' },
                { 'ipregistry-credits-consumed': 'not-a-number' },
            )

        const response = await newHandler().lookupIp('8.8.8.8', [])

        expect(response.credits).to.deep.equal({
            consumed: null,
            remaining: null,
        })
        expect(response.throttling).to.be.null
    })

    it('sends api key, content type and user agent request headers', async () => {
        let capturedHeaders: Record<string, string> = {}
        globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
            capturedHeaders = init.headers as Record<string, string>
            return jsonResponse({})
        }) as typeof fetch

        await newHandler().lookupIp('8.8.8.8', [])

        expect(capturedHeaders['authorization']).to.equal('ApiKey tryout')
        expect(capturedHeaders['content-type']).to.equal('application/json')
        expect(capturedHeaders['user-agent']).to.match(
            /^Ipregistry\/JavaScript\//,
        )
    })

    it('throws the ApiError described by a non-ok response', async () => {
        globalThis.fetch = async () =>
            jsonResponse(
                {
                    code: 'INVALID_IP_ADDRESS',
                    message: 'Invalid IP address',
                    resolution: 'Use a valid IP address.',
                },
                {},
                400,
            )

        try {
            await newHandler().lookupIp('not-an-ip', [])
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ApiError)
            expect((error as ApiError).code).to.equal('INVALID_IP_ADDRESS')
            expect((error as ApiError).resolution).to.equal(
                'Use a valid IP address.',
            )
        }
    })

    it('throws an ApiError for non-ok responses without a JSON body', async () => {
        globalThis.fetch = async () =>
            new Response('<html>bad gateway</html>', { status: 502 })

        try {
            await newHandler(5000, builder =>
                builder.withRetryOnServerError(false),
            ).lookupIp('8.8.8.8', [])
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ApiError)
            expect((error as ApiError).message).to.equal(
                'Unexpected HTTP status 502',
            )
        }
    })
})

describe('customFetch retry behavior', () => {
    it('retries after a timeout and succeeds', async () => {
        let attempts = 0
        globalThis.fetch = abortingFetch(() => {
            attempts++
            return attempts > 1 ? jsonResponse({ ip: '8.8.8.8' }) : null
        })

        const response = await newHandler(5).lookupIp('8.8.8.8', [])

        expect(attempts).to.equal(2)
        expect(response.data).to.deep.equal({ ip: '8.8.8.8' })
    })

    it('fails with a ClientError once retries are exhausted', async () => {
        let attempts = 0
        globalThis.fetch = abortingFetch(() => {
            attempts++
            return null
        })

        try {
            await newHandler(5).lookupIp('8.8.8.8', [])
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ClientError)
            expect((error as ClientError).message).to.equal(
                'Request failed after 3 retries',
            )
        }

        expect(attempts).to.equal(4)
    })

    it('performs a single attempt when retries are disabled', async () => {
        let attempts = 0
        globalThis.fetch = abortingFetch(() => {
            attempts++
            return null
        })

        try {
            await newHandler(5, builder => builder.withMaxRetries(0)).lookupIp(
                '8.8.8.8',
                [],
            )
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ClientError)
            expect((error as ClientError).message).to.equal(
                'Request failed after 0 retries',
            )
        }

        expect(attempts).to.equal(1)
    })

    it('retries network errors', async () => {
        let attempts = 0
        globalThis.fetch = (async () => {
            attempts++
            if (attempts === 1) {
                throw new TypeError('fetch failed')
            }
            return jsonResponse({ ip: '8.8.8.8' })
        }) as typeof fetch

        const response = await newHandler().lookupIp('8.8.8.8', [])

        expect(attempts).to.equal(2)
        expect(response.data).to.deep.equal({ ip: '8.8.8.8' })
    })

    it('retries server errors and succeeds', async () => {
        const counter = countingFetch([
            () => jsonResponse(errorBody('INTERNAL'), {}, 503),
            () => jsonResponse({ ip: '8.8.8.8' }),
        ])

        const response = await newHandler().lookupIp('8.8.8.8', [])

        expect(counter.attempts()).to.equal(2)
        expect(response.data).to.deep.equal({ ip: '8.8.8.8' })
    })

    it('retries batch requests on server errors', async () => {
        const counter = countingFetch([
            () => jsonResponse(errorBody('INTERNAL'), {}, 500),
            () => jsonResponse({ results: [{ ip: '8.8.8.8' }] }),
        ])

        const response = await newHandler().batchLookupIps(['8.8.8.8'], [])

        expect(counter.attempts()).to.equal(2)
        expect(response.data.results).to.deep.equal([{ ip: '8.8.8.8' }])
    })

    it('does not retry server errors when disabled', async () => {
        const counter = countingFetch([
            () => jsonResponse(errorBody('INTERNAL'), {}, 503),
        ])

        try {
            await newHandler(5000, builder =>
                builder.withRetryOnServerError(false),
            ).lookupIp('8.8.8.8', [])
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ApiError)
            expect((error as ApiError).code).to.equal('INTERNAL')
        }

        expect(counter.attempts()).to.equal(1)
    })

    it('does not retry 429 responses by default', async () => {
        const counter = countingFetch([
            () => jsonResponse(errorBody('TOO_MANY_REQUESTS'), {}, 429),
        ])

        try {
            await newHandler().lookupIp('8.8.8.8', [])
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ApiError)
            expect((error as ApiError).code).to.equal('TOO_MANY_REQUESTS')
        }

        expect(counter.attempts()).to.equal(1)
    })

    it('retries 429 responses when enabled, honoring Retry-After', async () => {
        const counter = countingFetch([
            () =>
                jsonResponse(
                    errorBody('TOO_MANY_REQUESTS'),
                    { 'retry-after': '1' },
                    429,
                ),
            () => jsonResponse({ ip: '8.8.8.8' }),
        ])

        const startedAt = Date.now()
        const response = await newHandler(5000, builder =>
            builder.withRetryOnTooManyRequests(true),
        ).lookupIp('8.8.8.8', [])

        expect(counter.attempts()).to.equal(2)
        expect(response.data).to.deep.equal({ ip: '8.8.8.8' })
        // Retry-After: 1 (second) must take precedence over the 1ms interval.
        expect(Date.now() - startedAt).to.be.at.least(900)
    })
})
