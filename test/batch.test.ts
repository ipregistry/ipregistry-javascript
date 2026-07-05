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
    ClientError,
    DEFAULT_MAX_BATCH_SIZE,
    InMemoryCache,
    IpInfo,
    IpregistryClient,
    IpregistryConfigBuilder,
    IpregistryRequestHandler,
    LookupError,
    NoCache,
} from '../dist/index.mjs'

import { describe, it } from 'node:test'
import { expect } from 'chai'

/**
 * A request handler stub that records IP batch chunks, tracks how many are in
 * flight concurrently, and answers from a per-IP response function.
 */
class ChunkRecordingHandler implements IpregistryRequestHandler {
    chunks: string[][] = []
    inFlight = 0
    maxInFlight = 0

    constructor(
        private readonly respond: (
            ips: string[],
        ) => ApiResponse<BatchResult<IpInfo | LookupError>> = ips => ({
            credits: { consumed: 1, remaining: 100 },
            data: {
                results: ips.map(ip => ({ ip }) as IpInfo),
            },
            throttling: null,
        }),
    ) {}

    async batchLookupIps(
        ips: string[],
    ): Promise<ApiResponse<BatchResult<IpInfo | LookupError>>> {
        this.chunks.push(ips)
        this.inFlight++
        this.maxInFlight = Math.max(this.maxInFlight, this.inFlight)
        await new Promise(resolve => setTimeout(resolve, 5))
        this.inFlight--
        return this.respond(ips)
    }

    batchLookupAsns(): Promise<
        ApiResponse<BatchResult<AutonomousSystem | LookupError>>
    > {
        throw new Error('not implemented')
    }

    lookupAsn(): never {
        throw new Error('not implemented')
    }

    lookupIp(): never {
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

function newClient(
    handler: IpregistryRequestHandler,
    configure: (
        builder: IpregistryConfigBuilder,
    ) => IpregistryConfigBuilder = builder => builder,
    cache = new NoCache(),
): IpregistryClient {
    return new IpregistryClient(
        configure(new IpregistryConfigBuilder('tryout')).build(),
        cache,
        handler,
    )
}

const IPS = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5']

describe('batch size configuration', () => {
    it('defaults to the API limit and caps larger values', () => {
        expect(new IpregistryConfigBuilder('k').build().maxBatchSize).to.equal(
            DEFAULT_MAX_BATCH_SIZE,
        )
        expect(
            new IpregistryConfigBuilder('k').withMaxBatchSize(4096).build()
                .maxBatchSize,
        ).to.equal(DEFAULT_MAX_BATCH_SIZE)
        expect(
            new IpregistryConfigBuilder('k').withMaxBatchSize(0).build()
                .maxBatchSize,
        ).to.equal(DEFAULT_MAX_BATCH_SIZE)
        expect(
            new IpregistryConfigBuilder('k').withMaxBatchSize(16).build()
                .maxBatchSize,
        ).to.equal(16)
    })

    it('defaults batch concurrency to 4 and ignores invalid values', () => {
        const config = new IpregistryConfigBuilder('k')
            .withBatchConcurrency(0)
            .build()

        expect(config.batchConcurrency).to.equal(4)
        expect(
            new IpregistryConfigBuilder('k').withBatchConcurrency(2).build()
                .batchConcurrency,
        ).to.equal(2)
    })
})

describe('batch chunking', () => {
    it('sends a single request when the batch fits the maximum size', async () => {
        const handler = new ChunkRecordingHandler()
        const client = newClient(handler)

        await client.batchLookupIps(IPS)

        expect(handler.chunks).to.deep.equal([IPS])
    })

    it('splits larger batches and preserves result order', async () => {
        const handler = new ChunkRecordingHandler()
        const client = newClient(handler, builder =>
            builder.withMaxBatchSize(2),
        )

        const response = await client.batchLookupIps(IPS)

        expect(handler.chunks).to.deep.equal([
            ['1.1.1.1', '2.2.2.2'],
            ['3.3.3.3', '4.4.4.4'],
            ['5.5.5.5'],
        ])
        expect(response.data.map(info => (info as IpInfo).ip)).to.deep.equal(
            IPS,
        )
    })

    it('dispatches at most batchConcurrency chunks in flight', async () => {
        const handler = new ChunkRecordingHandler()
        const client = newClient(handler, builder =>
            builder.withMaxBatchSize(1).withBatchConcurrency(2),
        )

        await client.batchLookupIps(IPS)

        expect(handler.chunks.length).to.equal(5)
        expect(handler.maxInFlight).to.equal(2)
    })

    it('aggregates credits and reports the lowest remaining value', async () => {
        let remaining = 50
        const handler = new ChunkRecordingHandler(ips => ({
            credits: { consumed: ips.length, remaining: remaining-- },
            data: { results: ips.map(ip => ({ ip }) as IpInfo) },
            throttling: null,
        }))
        const client = newClient(handler, builder =>
            builder.withMaxBatchSize(2).withBatchConcurrency(1),
        )

        const response = await client.batchLookupIps(IPS)

        expect(response.credits.consumed).to.equal(5)
        expect(response.credits.remaining).to.equal(48)
    })

    it('fails fast and stops dispatching after the first chunk error', async () => {
        const handler = new ChunkRecordingHandler(ips => {
            if (ips.includes('2.2.2.2')) {
                throw new ClientError('chunk failed')
            }
            return {
                credits: { consumed: 1, remaining: 100 },
                data: { results: ips.map(ip => ({ ip }) as IpInfo) },
                throttling: null,
            }
        })
        const client = newClient(handler, builder =>
            builder.withMaxBatchSize(1).withBatchConcurrency(1),
        )

        try {
            await client.batchLookupIps(IPS)
            expect.fail('expected batchLookupIps to throw')
        } catch (error) {
            expect(error).instanceOf(ClientError)
            expect((error as ClientError).message).to.equal('chunk failed')
        }

        expect(handler.chunks.length).to.equal(2)
    })

    it('caches chunked results so repeated lookups avoid the API', async () => {
        const handler = new ChunkRecordingHandler()
        const client = newClient(
            handler,
            builder => builder.withMaxBatchSize(2),
            new InMemoryCache(),
        )

        await client.batchLookupIps(IPS)
        const second = await client.batchLookupIps(IPS)

        expect(handler.chunks.length).to.equal(3)
        expect(second.credits.consumed).to.equal(0)
        expect(second.data.map(info => (info as IpInfo).ip)).to.deep.equal(IPS)
    })
})
