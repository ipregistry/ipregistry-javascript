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

// The shared scenario behind the runtime smoke tests. Stubs globalThis.fetch
// (restoring it afterwards) and drives lookups, caching, retries, and error
// mapping through the built ESM bundle using only web-standard APIs.

import {
    ApiError,
    InMemoryCache,
    IpregistryClient,
    IpregistryConfigBuilder,
} from '../dist/index.mjs'

function assertEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`)
    }
}

function jsonResponse(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    })
}

export async function runSmokeTest() {
    const originalFetch = globalThis.fetch
    let requests = 0

    globalThis.fetch = async url => {
        requests++
        const path = new URL(url).pathname

        if (path === '/1.2.3.4') {
            return jsonResponse(
                { ip: '1.2.3.4', location: { country: { code: 'AU' } } },
                200,
                { 'ipregistry-credits-consumed': '1' },
            )
        }

        if (path === '/5.6.7.8') {
            // Fail once with a 503 to exercise the retry path.
            return requests % 2 === 0
                ? jsonResponse({ ip: '5.6.7.8' })
                : jsonResponse(
                      { code: 'INTERNAL', message: 'oops', resolution: '-' },
                      503,
                  )
        }

        return jsonResponse(
            {
                code: 'INVALID_IP_ADDRESS',
                message: 'Invalid IP',
                resolution: '-',
            },
            400,
        )
    }

    try {
        const client = new IpregistryClient(
            new IpregistryConfigBuilder('tryout').withRetryInterval(1).build(),
            new InMemoryCache(),
        )

        // Plain lookup, response headers, and caching.
        const first = await client.lookupIp('1.2.3.4')
        assertEqual(first.data.location.country.code, 'AU', 'country code')
        assertEqual(first.credits.consumed, 1, 'credits consumed')

        const requestsBeforeCachedCall = requests
        const second = await client.lookupIp('1.2.3.4')
        assertEqual(second.data.ip, '1.2.3.4', 'cached ip')
        assertEqual(requests, requestsBeforeCachedCall, 'cache hit')

        // Retry on server error.
        const retried = await client.lookupIp('5.6.7.8')
        assertEqual(retried.data.ip, '5.6.7.8', 'retried ip')

        // API error mapping.
        try {
            await client.lookupIp('not-an-ip')
            throw new Error('expected lookupIp to throw an ApiError')
        } catch (error) {
            if (!(error instanceof ApiError)) {
                throw error
            }
            assertEqual(error.code, 'INVALID_IP_ADDRESS', 'error code')
        }
    } finally {
        globalThis.fetch = originalFetch
    }
}
