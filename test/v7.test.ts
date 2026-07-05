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

// Tests for the v7 API surface: options-object construction, per-call
// LookupOptions, and request cancellation with AbortSignal.

import {
    ClientError,
    InMemoryCache,
    IpregistryClient,
    IpregistryOptions,
} from '../dist/index.mjs'

import { afterEach, describe, it } from 'node:test'
import { expect } from 'chai'

const originalFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = originalFetch
})

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    })
}

function capturingFetch(): { urls: string[]; headers: Record<string, string> } {
    const captured: { urls: string[]; headers: Record<string, string> } = {
        urls: [],
        headers: {},
    }
    globalThis.fetch = (async (url: string, init: RequestInit) => {
        captured.urls.push(String(url))
        captured.headers = init.headers as Record<string, string>
        return jsonResponse({ ip: '8.8.8.8' })
    }) as typeof fetch
    return captured
}

describe('options-object construction', () => {
    it('builds a working client from a plain options object', async () => {
        const captured = capturingFetch()
        const client = new IpregistryClient({ apiKey: 'my-key' })

        const response = await client.lookupIp('8.8.8.8')

        expect(response.data).to.deep.equal({ ip: '8.8.8.8' })
        expect(captured.urls[0]).to.equal('https://api.ipregistry.co/8.8.8.8?')
        expect(captured.headers['authorization']).to.equal('ApiKey my-key')
    })

    it("maps the 'eu' base URL shorthand to the EU endpoint", async () => {
        const captured = capturingFetch()
        const client = new IpregistryClient({ apiKey: 'k', baseUrl: 'eu' })

        await client.lookupIp('8.8.8.8')

        expect(captured.urls[0]).to.match(
            /^https:\/\/eu\.api\.ipregistry\.co\//,
        )
    })

    it('accepts a cache through the options object', async () => {
        capturingFetch()
        const cache = new InMemoryCache()
        const client = new IpregistryClient({ apiKey: 'k', cache })

        expect(client.getCache()).to.equal(cache)

        await client.lookupIp('8.8.8.8')
        const captured = capturingFetch()
        await client.lookupIp('8.8.8.8')

        expect(captured.urls).to.have.length(0)
    })
})

describe('per-call lookup options', () => {
    it('serializes fields, hostname and extra params into the query', async () => {
        const captured = capturingFetch()
        const client = new IpregistryClient({ apiKey: 'k' })

        await client.lookupIp('8.8.8.8', {
            fields: 'location.country',
            hostname: true,
            params: { zed: 'z', alpha: 'a' },
        })

        expect(captured.urls[0]).to.equal(
            'https://api.ipregistry.co/8.8.8.8?fields=location.country&hostname=true&alpha=a&zed=z',
        )
    })

    it('produces the same cache key as the equivalent legacy options', async () => {
        capturingFetch()
        const client = new IpregistryClient({
            apiKey: 'k',
            cache: new InMemoryCache(),
        })

        await client.lookupIp('8.8.8.8', {
            fields: 'location',
            hostname: true,
        })

        const captured = capturingFetch()
        await client.lookupIp(
            '8.8.8.8',
            IpregistryOptions.filter('location'),
            IpregistryOptions.hostname(true),
        )

        expect(captured.urls).to.have.length(0)
    })

    it('supports the array form of parseUserAgents', async () => {
        globalThis.fetch = (async () =>
            jsonResponse({ results: [{ name: 'Chrome' }] })) as typeof fetch
        const client = new IpregistryClient({ apiKey: 'k' })

        const response = await client.parseUserAgents(['Mozilla/5.0'])

        expect(response.data).to.deep.equal([{ name: 'Chrome' }])
    })
})

describe('request cancellation', () => {
    it('rejects immediately when the signal is already aborted', async () => {
        const captured = capturingFetch()
        const client = new IpregistryClient({ apiKey: 'k' })
        const controller = new AbortController()
        controller.abort()

        try {
            await client.lookupIp('8.8.8.8', { signal: controller.signal })
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ClientError)
            expect((error as ClientError).message).to.equal('Request cancelled')
        }

        expect(captured.urls).to.have.length(0)
    })

    it('cancels retry backoff waits', async () => {
        globalThis.fetch = ((_url: unknown, init: RequestInit) =>
            new Promise((_resolve, reject) => {
                init.signal?.addEventListener('abort', () =>
                    reject(
                        Object.assign(new Error('aborted'), {
                            name: 'AbortError',
                        }),
                    ),
                )
            })) as typeof fetch

        // A 5ms timeout forces a quick transport failure, and the long retry
        // interval means the client would then sleep for minutes; aborting
        // must interrupt that wait right away.
        const client = new IpregistryClient({
            apiKey: 'k',
            timeout: 5,
            retryInterval: 600_000,
        })
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 50)

        const startedAt = Date.now()
        try {
            await client.lookupIp('8.8.8.8', { signal: controller.signal })
            expect.fail('expected lookupIp to throw')
        } catch (error) {
            expect(error).instanceOf(ClientError)
            expect((error as ClientError).message).to.equal(
                'Request cancelled during retry backoff',
            )
        }

        expect(Date.now() - startedAt).to.be.below(5000)
    })
})
