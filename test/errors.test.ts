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

import { describe, it } from 'node:test'
import { expect } from 'chai'

class TestableRequestHandler extends DefaultRequestHandler {
    async handleErrorForTest(error: unknown) {
        return this.handleError(error)
    }
}

function newHandler(): TestableRequestHandler {
    return new TestableRequestHandler(
        new IpregistryConfigBuilder('tryout').build(),
    )
}

describe('DefaultRequestHandler#handleError', () => {
    it('maps fetch abort errors to a request timeout ClientError', async () => {
        const abortError = Object.assign(
            new Error('This operation was aborted'),
            { name: 'AbortError' },
        )

        try {
            await newHandler().handleErrorForTest(abortError)
            expect.fail('expected handleError to throw')
        } catch (error) {
            expect(error).instanceOf(ClientError)
            expect((error as ClientError).message).to.equal('Request timed out')
        }
    })

    it('rethrows ApiError instances unchanged', async () => {
        const apiError = new ApiError('INVALID_IP_ADDRESS', 'bad ip', 'fix it')

        try {
            await newHandler().handleErrorForTest(apiError)
            expect.fail('expected handleError to throw')
        } catch (error) {
            expect(error).to.equal(apiError)
        }
    })

    it('wraps unknown errors into a ClientError with the original message', async () => {
        const error = await newHandler().handleErrorForTest(new Error('boom'))

        expect(error).instanceOf(ClientError)
        expect((error as ClientError).message).to.equal('boom')
    })
})
