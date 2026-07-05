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
    ApiResponse,
    AutonomousSystem,
    BatchResult,
    InMemoryCache,
    IpInfo,
    IpregistryClient,
    IpregistryOptions,
    IpregistryRequestHandler,
    LookupError,
} from '../dist/index.mjs'

import { describe, it } from 'node:test'
import { expect } from 'chai'

const NO_CREDITS = { consumed: 1, remaining: 100 }

/**
 * A request handler stub that records batch calls and builds responses from
 * the requested values. Results purposely omit the `ip` and `asn` fields to
 * mimic a lookup filtered with the `fields` option.
 */
class RecordingRequestHandler implements IpregistryRequestHandler {
    ipBatches: string[][] = []
    asnBatches: number[][] = []

    async batchLookupAsns(
        asns: number[],
    ): Promise<ApiResponse<BatchResult<AutonomousSystem | LookupError>>> {
        this.asnBatches.push(asns)
        return {
            credits: NO_CREDITS,
            data: {
                results: asns.map(
                    asn =>
                        ({
                            name: `name-of-AS${asn}`,
                        }) as unknown as AutonomousSystem,
                ),
            },
            throttling: null,
        }
    }

    async batchLookupIps(
        ips: string[],
    ): Promise<ApiResponse<BatchResult<IpInfo | LookupError>>> {
        this.ipBatches.push(ips)
        return {
            credits: NO_CREDITS,
            data: {
                results: ips.map(
                    ip =>
                        ({
                            location: { country: { code: `country-of-${ip}` } },
                        }) as unknown as IpInfo,
                ),
            },
            throttling: null,
        }
    }

    lookupAsn(): Promise<ApiResponse<AutonomousSystem>> {
        throw new Error('not implemented')
    }

    lookupIp(): Promise<ApiResponse<IpInfo>> {
        throw new Error('not implemented')
    }

    originLookupAsn(): never {
        throw new Error('not implemented')
    }

    originLookupIp(): never {
        throw new Error('not implemented')
    }

    parseUserAgents(): never {
        throw new Error('not implemented')
    }
}

describe('IpregistryClient batch caching', () => {
    it('caches filtered IP results under the requested IP addresses', async () => {
        const handler = new RecordingRequestHandler()
        const client = new IpregistryClient(
            'tryout',
            new InMemoryCache(),
            handler,
        )
        const options = IpregistryOptions.filter('location.country.code')

        const first = await client.batchLookupIps(
            ['1.1.1.1', '2.2.2.2'],
            options,
        )
        const second = await client.batchLookupIps(
            ['1.1.1.1', '2.2.2.2'],
            options,
        )

        expect(handler.ipBatches).to.deep.equal([['1.1.1.1', '2.2.2.2']])
        expect(second.data).to.deep.equal(first.data)
        expect(second.credits.consumed).to.equal(0)
    })

    it('only requests IP addresses that are not cached yet', async () => {
        const handler = new RecordingRequestHandler()
        const client = new IpregistryClient(
            'tryout',
            new InMemoryCache(),
            handler,
        )

        await client.batchLookupIps(['1.1.1.1'])
        const response = await client.batchLookupIps(['1.1.1.1', '2.2.2.2'])

        expect(handler.ipBatches).to.deep.equal([['1.1.1.1'], ['2.2.2.2']])
        expect(response.data).to.deep.equal([
            { location: { country: { code: 'country-of-1.1.1.1' } } },
            { location: { country: { code: 'country-of-2.2.2.2' } } },
        ])
    })

    it('caches filtered ASN results under the requested ASNs', async () => {
        const handler = new RecordingRequestHandler()
        const client = new IpregistryClient(
            'tryout',
            new InMemoryCache(),
            handler,
        )

        const first = await client.batchLookupAsns([1, 2])
        const second = await client.batchLookupAsns([1, 2])

        expect(handler.asnBatches).to.deep.equal([[1, 2]])
        expect(second.data).to.deep.equal(first.data)
        expect(second.credits.consumed).to.equal(0)
    })
})

function ipInfo(ip: string): IpInfo {
    return { ip } as IpInfo
}

describe('InMemoryCache', () => {
    it('evicts the least recently used entry beyond the maximum size', () => {
        const cache = new InMemoryCache(2, 60_000)

        cache.put('a', ipInfo('a'))
        cache.put('b', ipInfo('b'))
        cache.get('a')
        cache.put('c', ipInfo('c'))

        expect(cache.get('a')).to.deep.equal(ipInfo('a'))
        expect(cache.get('b')).to.be.undefined
        expect(cache.get('c')).to.deep.equal(ipInfo('c'))
    })

    it('overwrites entries without growing the cache', () => {
        const cache = new InMemoryCache(2, 60_000)

        cache.put('a', ipInfo('a1'))
        cache.put('b', ipInfo('b'))
        cache.put('a', ipInfo('a2'))

        expect(cache.get('a')).to.deep.equal(ipInfo('a2'))
        expect(cache.get('b')).to.deep.equal(ipInfo('b'))
    })

    it('expires entries after the configured lifetime', async () => {
        const cache = new InMemoryCache(16, 5)

        cache.put('a', ipInfo('a'))
        expect(cache.get('a')).to.deep.equal(ipInfo('a'))

        await new Promise(resolve => setTimeout(resolve, 15))

        expect(cache.get('a')).to.be.undefined
    })

    it('invalidates a single entry or all entries', () => {
        const cache = new InMemoryCache(16, 60_000)

        cache.put('a', ipInfo('a'))
        cache.put('b', ipInfo('b'))
        cache.invalidate('a')

        expect(cache.get('a')).to.be.undefined
        expect(cache.get('b')).to.deep.equal(ipInfo('b'))

        cache.invalidateAll()

        expect(cache.get('b')).to.be.undefined
    })
})
