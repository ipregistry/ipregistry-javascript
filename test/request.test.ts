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
    IpregistryOption,
    IpregistryOptions,
} from '../dist/index.mjs'

import { describe, it } from 'node:test'
import { expect } from 'chai'

const BASE_URL = 'https://api.ipregistry.co'

class TestableRequestHandler extends DefaultRequestHandler {
    buildApiUrlForTest(path: string, options?: IpregistryOption[]): string {
        return this.buildApiUrl(path, options)
    }
}

function newHandler(): TestableRequestHandler {
    return new TestableRequestHandler(
        new IpregistryConfigBuilder('tryout').build(),
    )
}

describe('DefaultRequestHandler#buildApiUrl', () => {
    it('leaves plain IPv4 addresses and ASN paths unchanged', () => {
        expect(newHandler().buildApiUrlForTest('8.8.8.8')).to.equal(
            `${BASE_URL}/8.8.8.8`,
        )
        expect(newHandler().buildApiUrlForTest('AS12345')).to.equal(
            `${BASE_URL}/AS12345`,
        )
    })

    it('percent-encodes IPv6 addresses', () => {
        expect(newHandler().buildApiUrlForTest('2001:db8::')).to.equal(
            `${BASE_URL}/2001%3Adb8%3A%3A`,
        )
    })

    it('neutralizes path and query characters in untrusted input', () => {
        const url = newHandler().buildApiUrlForTest('8.8.8.8/../user_agent?k=v')

        expect(url).to.equal(`${BASE_URL}/8.8.8.8%2F..%2Fuser_agent%3Fk%3Dv`)
    })

    it('appends options as query parameters', () => {
        const url = newHandler().buildApiUrlForTest('8.8.8.8', [
            IpregistryOptions.filter('location.country'),
            IpregistryOptions.hostname(true),
        ])

        expect(url).to.equal(
            `${BASE_URL}/8.8.8.8?fields=location.country&hostname=true`,
        )
    })
})
