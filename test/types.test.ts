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

// Type-level tests for the public API surface. The expectTypeOf assertions
// are no-ops at runtime; they are enforced by `npm run typecheck`, which the
// test script runs against the built type declarations.

import { expectTypeOf } from 'expect-type'
import { describe, it } from 'node:test'

import {
    ApiResponse,
    AutonomousSystem,
    InMemoryCache,
    IpInfo,
    IpregistryCacheValue,
    IpregistryClient,
    LookupError,
    RequesterIpInfo,
    UserAgent,
} from '../dist/index.mjs'

describe('public type surface', () => {
    const client = new IpregistryClient({ apiKey: 'k' })

    it('lookupIp resolves to ApiResponse<IpInfo>', () => {
        const call = () => client.lookupIp('8.8.8.8')
        expectTypeOf(call).returns.resolves.toEqualTypeOf<ApiResponse<IpInfo>>()
    })

    it('batchLookupIps resolves to an array of IpInfo or LookupError', () => {
        const call = () => client.batchLookupIps(['8.8.8.8'])
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<(IpInfo | LookupError)[]>
        >()
    })

    it('originLookupIp resolves to ApiResponse<RequesterIpInfo>', () => {
        const call = () => client.originLookupIp()
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<RequesterIpInfo>
        >()
    })

    it('lookupAsn resolves to ApiResponse<AutonomousSystem>', () => {
        const call = () => client.lookupAsn(400923)
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<AutonomousSystem>
        >()
    })

    it('parseUserAgents resolves to an array of UserAgent', () => {
        const call = () => client.parseUserAgents(['curl/8'])
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<UserAgent[]>
        >()
    })

    it('InMemoryCache defaults its value type to IpregistryCacheValue', () => {
        const call = () => new InMemoryCache().get('k')
        expectTypeOf(call).returns.toEqualTypeOf<
            IpregistryCacheValue | undefined
        >()
    })
})
