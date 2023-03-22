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
    InMemoryCache,
    IpInfo,
    IpregistryClient,
    IpregistryConfigBuilder,
    IpregistryOptions,
    LookupError,
    NoCache
} from '../src';

import {expect} from 'chai';

const API_KEY = process.env.IPREGISTRY_API_KEY || 'tryout';
const API_KEY_THROTTLED = process.env.IPREGISTRY_API_KEY_THROTTLED || 'tryout';

describe('batchLookup', () => {
    it('should return fresh info with no cache', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());

        expect(client.getCache()).instanceOf(NoCache);

        const ips = ['66.165.2.7', '2001:4860:4860::8844', '8.8.4.4'];
        const response = await client.batchLookup(ips);
        const ipInfoList = response.data;
        for (let i = 0; i < ipInfoList.length; i++) {
            const ipInfo = ipInfoList[i] as IpInfo;
            expect(ipInfo.ip).equal(ips[i]);
        }

        expect(ipInfoList[0]['type']).equal('IPv4');
        expect(ipInfoList[1]['type']).equal('IPv6');
        expect(ipInfoList[2]['type']).equal('IPv4');
    });

    it('should return cached value if available', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());

        const response = await client.lookup('66.165.2.7');
        const ipInfo = response.data;
        ipInfo.time_zone.current_time = 'cachedTime';

        const ips = ['66.165.2.7', '1.1.1.1', '8.8.4.4'];
        const response2 = await client.batchLookup(ips);
        const ipInfoList = response2.data;

        for (let i = 0; i < ipInfoList.length; i++) {
            const ipData = ipInfoList[i] as IpInfo;
            expect(ipData.ip).equal(ips[i]);
        }

        expect((ipInfoList[0] as IpInfo).time_zone.current_time).equal('cachedTime');
    });

    it('should handle invalid input with no error', async () => {
        const client = new IpregistryClient(API_KEY);
        const ips = ['66.165.2.7a', '1.1.1.1', '8.8.4.4c'];
        const response = await client.batchLookup(ips);
        const ipInfoList = response.data;

        expect(ipInfoList[0]).to.be.instanceOf(LookupError);
        expect(ipInfoList[1]).not.to.be.instanceOf(LookupError);
        expect(ipInfoList[2]).to.be.instanceOf(LookupError);
    });

    it('should consume 1 credit if batch lookup contains only 1 entry', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());
        const response = await client.batchLookup(['8.8.4.4']);

        expect(response.credits.consumed).equal(1);
        expect(response.credits.remaining).greaterThan(0);
        expect(response.throttling).null;
    });

    it('should consume credits for a batch lookup with no cache', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());
        const response = await client.batchLookup(['8.8.4.4', '1.2.3.4', '1.2.3.2']);

        expect(response.credits.consumed).equal(4);
        expect(response.credits.remaining).greaterThan(0);
        expect(response.throttling).null;
    });

    it('should consume some credits for a batch lookup with partial results from cache', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());
        await client.lookup('8.8.4.4');
        await client.lookup('1.2.3.2');
        const response = await client.batchLookup(['8.8.4.4', '1.2.3.4', '1.2.3.2']);

        expect(response.credits.consumed).equal(1);
        expect(response.credits.remaining).greaterThan(0);
        expect(response.throttling).null;
    });

    it('should consume no credit for a batch lookup with all data returned from cache', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());
        await client.lookup('8.8.4.4');
        await client.lookup('1.2.3.4');
        await client.lookup('1.2.3.2');
        const response = await client.batchLookup(['8.8.4.4', '1.2.3.4', '1.2.3.2']);

        expect(response.credits.consumed).equal(0);
        expect(response.credits.remaining).null;
        expect(response.throttling).null;
    });

    it('should return throttling data if API key is rate limited', async () => {
        const client = new IpregistryClient(API_KEY_THROTTLED);
        const response = await client.batchLookup(['8.8.4.4', '9.9.9.9']);

        expect(response.throttling).not.null;
        expect(response?.throttling?.limit).greaterThan(-1);
        expect(response?.throttling?.remaining).greaterThan(-1);
        expect(response?.throttling?.reset).greaterThan(-1);
    });
});

describe('lookup', () => {
    it('should throw ApiError when input IP is reserved', async () => {
        try {
            const client = new IpregistryClient(API_KEY);
            await client.lookup('0.1.2.3');
            expect.fail();
        } catch (error: any) {
            expect(error).to.be.instanceOf(ApiError);
            expect(error.code).equal('RESERVED_IP_ADDRESS');
        }
    });

    it('should return valid information when IPv4 address is known', async () => {
        const client = new IpregistryClient(API_KEY);
        const response = await client.lookup('8.8.8.8');
        const ipInfo = response.data;
        expect(ipInfo.type).equal('IPv4');
        expect(ipInfo.location.country.code).equal('US');
        expect(ipInfo.location.country.flag).not.null;
        expect(ipInfo.connection).not.null;
        expect(ipInfo.currency).not.null;
        expect(ipInfo.currency.name_native).not.null;
        expect(ipInfo.currency.plural_native).not.null;
        expect(ipInfo.currency.symbol_native).not.null;
        expect(ipInfo.hostname).null;
        expect(ipInfo.location).not.null;
        expect(ipInfo.security).not.null;
        expect(ipInfo.time_zone).not.null;
    });

    it('should return valid information with EU base URL when IPv4 address is known', async () => {
        const client = new IpregistryClient(new IpregistryConfigBuilder(API_KEY).withEuBaseUrl().build());
        const response = await client.lookup('9.4.2.1');
        const ipInfo = response.data;
        expect(ipInfo.type).equal('IPv4');
    });

    it('should return valid information when IPv6 address is known', async () => {
        const client = new IpregistryClient(API_KEY);
        const response = await client.lookup('2001:4860:4860::8844');
        const ipInfo = response.data;
        expect(ipInfo.type).equal('IPv6');
        expect(ipInfo.location.country.code).equal('US');
        expect(ipInfo.location.country.flag).not.null;
        expect(ipInfo.connection).not.null;
        expect(ipInfo.currency).not.null;
        expect(ipInfo.hostname).null;
        expect(ipInfo.location).not.null;
        expect(ipInfo.security).not.null;
        expect(ipInfo.time_zone).not.null;
    });

    it('should return hostname value when option is enabled', async () => {
        const client = new IpregistryClient(API_KEY);
        const response = await client.lookup('8.8.8.8', IpregistryOptions.hostname(true));
        const ipInfo = response.data;
        expect(ipInfo.type).equal('IPv4');
        expect(ipInfo.company.domain).not.null;
        expect(ipInfo.company.name).not.null;
        expect(ipInfo.company.type).not.null;
        expect(ipInfo.location.country.code).equal('US');
        expect(ipInfo.hostname).not.null;
    });

    it('should return cached value if available', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());
        const response = await client.lookup('66.165.2.7');
        const ipInfo = response.data;
        ipInfo.time_zone.current_time = 'cached';

        const response2 = await client.lookup('66.165.2.7');
        const ipInfo2 = response2.data;
        expect(ipInfo2).equal(ipInfo);
    });

    it('should throw ApiError when input IP is invalid', async () => {
        try {
            const client = new IpregistryClient(API_KEY);
            await client.lookup('invalid');
            expect.fail();
        } catch (error) {
            expect(error).to.be.instanceOf(ApiError);
        }
    });

    it('should throw ClientError when HTTP request timeout elapsed', async () => {
        try {
            const client = new IpregistryClient(new IpregistryConfigBuilder(API_KEY).withTimeout(1).build());
            await client.lookup('9.4.2.1');
            expect.fail();
        } catch (error) {
            expect(error).to.be.instanceOf(ClientError);
        }
    });

    it('should consume 1 credit for a simple lookup with no cache', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());
        const response = await client.lookup('8.8.4.4');

        expect(response.credits.consumed).equal(1);
        expect(response.credits.remaining).greaterThan(0);
        expect(response.throttling).null;
    });

    it('should consume 0 credit for a simple cached lookup', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());
        await client.lookup('8.8.4.4');

        const response = await client.lookup('8.8.4.4');

        expect(response.credits.consumed).equal(0);
        expect(response.credits.remaining).null;
        expect(response.throttling).null;
    });

    it('should return throttling data if API key is rate limited', async () => {
        const client = new IpregistryClient(API_KEY_THROTTLED);
        const response = await client.lookup('8.8.4.4');

        expect(response.throttling).not.null;
        expect(response?.throttling?.limit).greaterThan(-1);
        expect(response?.throttling?.remaining).greaterThan(-1);
        expect(response?.throttling?.reset).greaterThan(-1);
    });
});

describe('originLookup', () => {
    it('should return fresh info with no cache', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());
        const response = await client.originLookup();
        const requesterIpInfo = response.data;

        expect(requesterIpInfo.ip).not.null;
        expect(requesterIpInfo.type).not.null;
        expect(requesterIpInfo.location.country.flag).not.null;
        expect(requesterIpInfo.connection).not.null;
        expect(requesterIpInfo.currency).not.null;
        expect(requesterIpInfo.hostname).null;
        expect(requesterIpInfo.location).not.null;
        expect(requesterIpInfo.security).not.null;
        expect(requesterIpInfo.time_zone).not.null;
        expect(requesterIpInfo.user_agent).not.null;
    });

    it('should return cached value if available', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());
        const response = await client.originLookup();
        const requesterIpInfo = response.data;
        requesterIpInfo.time_zone.current_time = 'cached';

        expect(requesterIpInfo.ip).not.null;
        expect(requesterIpInfo.type).not.null;
        expect(requesterIpInfo.location.country.flag).not.null;
        expect(requesterIpInfo.connection).not.null;
        expect(requesterIpInfo.currency).not.null;
        expect(requesterIpInfo.hostname).null;
        expect(requesterIpInfo.location).not.null;
        expect(requesterIpInfo.security).not.null;
        expect(requesterIpInfo.time_zone).not.null;
        expect(requesterIpInfo.user_agent).not.null;

        const response2 = await client.originLookup();
        const requesterIpInfo2 = response2.data;

        expect(requesterIpInfo2).equals(requesterIpInfo);
    });

    it('should consume 1 credit for a simple lookup with no cache', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());
        const response = await client.originLookup();

        expect(response.credits.consumed).equal(1);
        expect(response.credits.remaining).greaterThan(0);
        expect(response.throttling).null;
    });

    it('should consume 0 credit for a simple cached lookup', async () => {
        const client = new IpregistryClient(API_KEY, new InMemoryCache());
        await client.originLookup();

        const response = await client.originLookup();

        expect(response.credits.consumed).equal(0);
        expect(response.credits.remaining).null;
        expect(response.throttling).null;
    });

    it('should return throttling data if API key is rate limited', async () => {
        const client = new IpregistryClient(API_KEY_THROTTLED);
        const response = await client.originLookup();

        expect(response.throttling).not.null;
        expect(response?.throttling?.limit).greaterThan(-1);
        expect(response?.throttling?.remaining).greaterThan(-1);
        expect(response?.throttling?.reset).greaterThan(-1);
    });
});

describe('parse', () => {
    it('should throw an error when no user-agent value is inputted', async () => {
        try {
            const client = new IpregistryClient(API_KEY_THROTTLED);
            await client.parse();
            expect.fail();
        } catch (error) {
            expect(error).to.be.instanceOf(ApiError);
        }
    });

    it('should return 1 parsed user-agent result when 1 valid user-agent value is inputted', async () => {
        const client = new IpregistryClient(API_KEY_THROTTLED);
        const response =
            await client.parse(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
            );
        expect(response.data.length).eq(1);
        expect(response.data[0].name).not.null;
    });

    it('should return 2 parsed user-agent results when 2 valid user-agent values are inputted', async () => {
        const client = new IpregistryClient(API_KEY_THROTTLED);
        const response =
            await client.parse(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
                "Opera/9.80 (Linux armv7l) Presto/2.12.407 Version/12.51 , D50u-D1-UHD/V1.5.16-UHD (Vizio, D50u-D1, Wireless)"
            );
        expect(response.data.length).eq(2);
        expect(response.data[0].name).not.null;
        expect(response.data[1].name).not.null;
    });
});