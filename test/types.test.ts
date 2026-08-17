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
    Region,
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

    it('narrows the response type to the selected fields', () => {
        const call = () => client.lookupIp('8.8.8.8', { fields: 'location' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<Pick<IpInfo, 'location'>>
        >()
    })

    it('narrows to several selected fields, trimming spaces', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', { fields: 'currency, location' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<Pick<IpInfo, 'currency' | 'location'>>
        >()
    })

    it('narrows dotted field paths to the nested selection', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', { fields: 'location.country.code' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<{ location: { country: { code: string | null } } }>
        >()
    })

    it('narrows a nested object selection to its full declared type', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', { fields: 'location.region' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<{ location: { region: Region } }>
        >()
    })

    it('narrows a boolean leaf selection to its declared type', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', { fields: 'connection.is_anycast' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<{ connection: { is_anycast: boolean } }>
        >()
    })

    it('merges nested selections under a shared parent', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', {
                fields: 'location.region, location.city',
            })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<{
                location: { region: Region; city: string | null }
            }>
        >()
    })

    it('narrows selections that traverse arrays to their element type', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', {
                fields: 'location.country.languages.name',
            })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<{
                location: { country: { languages: { name: string | null }[] } }
            }>
        >()
    })

    it('merges selections of mixed depths across parents', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', {
                fields: 'security, location.country.code',
            })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<{
                security: IpInfo['security']
                location: { country: { code: string | null } }
            }>
        >()
    })

    it('resolves overlapping selections to the wider one', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', { fields: 'location, location.city' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<Pick<IpInfo, 'location'>>
        >()
    })

    it('ignores unknown path segments in merged selections', () => {
        const call = () =>
            client.lookupIp('8.8.8.8', { fields: 'location,bogus' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<Pick<IpInfo, 'location'>>
        >()
    })

    it('narrows origin lookups by selected fields', () => {
        const call = () => client.originLookupIp({ fields: 'user_agent' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<Pick<RequesterIpInfo, 'user_agent'>>
        >()
    })

    it('narrows batch lookups by nested selections', () => {
        const call = () =>
            client.batchLookupIps(['8.8.8.8'], { fields: 'location.region' })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<
            ApiResponse<({ location: { region: Region } } | LookupError)[]>
        >()
    })

    it('rejects access to unselected fields at compile time', () => {
        const demonstration = async () => {
            const response = await client.lookupIp('8.8.8.8', {
                fields: 'location.region',
            })
            // @ts-expect-error city is not part of the selection
            void response.data.location.city
            // @ts-expect-error currency is not part of the selection
            void response.data.currency
            void response.data.location.region.name
        }
        expectTypeOf(demonstration).returns.resolves.toBeVoid()
    })

    it('keeps the full response type for dynamic fields expressions', () => {
        const fields: string = 'location'
        const call = () => client.lookupIp('8.8.8.8', { fields })
        expectTypeOf(call).returns.resolves.toEqualTypeOf<ApiResponse<IpInfo>>()
    })

    it('narrows batch and ASN lookups by selected fields', () => {
        const batch = () =>
            client.batchLookupIps(['8.8.8.8'], { fields: 'security' })
        expectTypeOf(batch).returns.resolves.toEqualTypeOf<
            ApiResponse<(Pick<IpInfo, 'security'> | LookupError)[]>
        >()

        const asn = () => client.lookupAsn(400923, { fields: 'name' })
        expectTypeOf(asn).returns.resolves.toEqualTypeOf<
            ApiResponse<Pick<AutonomousSystem, 'name'>>
        >()
    })

    it('InMemoryCache defaults its value type to IpregistryCacheValue', () => {
        const call = () => new InMemoryCache().get('k')
        expectTypeOf(call).returns.toEqualTypeOf<
            IpregistryCacheValue | undefined
        >()
    })
})
