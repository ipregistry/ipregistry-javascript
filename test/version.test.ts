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
    DefaultRequestHandler,
    IpregistryConfigBuilder,
    LIBRARY_VERSION,
} from '../dist/index.mjs'

import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { expect } from 'chai'

const packageVersion = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
).version

class TestableRequestHandler extends DefaultRequestHandler {
    getHeadersForTest(): Record<string, string> {
        return this.getHeaders()
    }
}

describe('library version', () => {
    it('matches the version declared in package.json', () => {
        expect(LIBRARY_VERSION).to.equal(packageVersion)
    })

    it('is advertised in the user-agent header', () => {
        const handler = new TestableRequestHandler(
            new IpregistryConfigBuilder('tryout').build(),
        )
        const headers = handler.getHeadersForTest()

        expect(headers['user-agent']).to.equal(
            `Ipregistry/JavaScript/${packageVersion}`,
        )
    })
})
