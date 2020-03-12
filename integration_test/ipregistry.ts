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
    IpInfo,
    IpregistryClient,
    IpregistryConfigBuilder,
    IpregistryOptions,
    LookupError,
    NoCache
} from '../src';

import {expect} from 'chai';

const API_KEY = process.env.IPREGISTRY_API_KEY || 'tryout';

describe('lookup', () => {
    it('should return valid information when IPv4 address is known', async () => {
        const client = new IpregistryClient(API_KEY);
        const ipInfo = await client.lookup('8.8.8.8');
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
        expect(ipInfo.account).not.null;
        expect(ipInfo.account.remaining_credits).to.exist;
        expect(ipInfo.account.rate_limit).to.exist;
        expect(ipInfo.account.rate_limit_remaining).to.exist;
    });

    it('should return valid information when IPv6 address is known', async () => {
        const client = new IpregistryClient(API_KEY);
        const ipInfo = await client.lookup('2001:4860:4860::8844');
        expect(ipInfo.type).equal('IPv6');
        expect(ipInfo.location.country.code).equal('US');
        expect(ipInfo.location.country.flag).not.null;
        expect(ipInfo.connection).not.null;
        expect(ipInfo.currency).not.null;
        expect(ipInfo.hostname).null;
        expect(ipInfo.location).not.null;
        expect(ipInfo.security).not.null;
        expect(ipInfo.time_zone).not.null;
        expect(ipInfo.account).not.null;
        expect(ipInfo.account.remaining_credits).to.exist;
        expect(ipInfo.account.rate_limit).to.exist;
        expect(ipInfo.account.rate_limit_remaining).to.exist;
    });

    it('should return hostname value when option is enabled', async () => {
        const client = new IpregistryClient(API_KEY);
        const ipInfo = await client.lookup('8.8.8.8', IpregistryOptions.hostname(true));
        expect(ipInfo.type).equal('IPv4');
        expect(ipInfo.location.country.code).equal('US');
        expect(ipInfo.hostname).not.null;
        expect(ipInfo.account).not.null;
        expect(ipInfo.account.remaining_credits).to.exist;
        expect(ipInfo.account.rate_limit).to.exist;
        expect(ipInfo.account.rate_limit_remaining).to.exist;
    });

    it('should return cached value if available', async () => {
        const client = new IpregistryClient(API_KEY);
        const ipInfo = await client.lookup('66.165.2.7');
        ipInfo.time_zone.current_time = 'cached';

        const ipInfo2 = await client.lookup('66.165.2.7');
        // don't want cached value of rate limit remaining etc
        expect(ipInfo2.account).to.not.exist;
        const ipInfoWithoutAccount = {...ipInfo}
        delete ipInfoWithoutAccount.account
        expect(ipInfo2).deep.equal(ipInfoWithoutAccount);
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
});

describe('batchLookup', () => {
    it('should return fresh info with no cache', async () => {
        const client = new IpregistryClient(API_KEY, new NoCache());

        expect(client.getCache()).instanceOf(NoCache);

        const ips = ['66.165.2.7', '2001:4860:4860::8844', '8.8.4.4'];
        const ipInfoList = await client.batchLookup(ips);
        for (let i = 0; i < ipInfoList.length; i++) {
            const ipInfo = ipInfoList[i] as IpInfo;
            expect(ipInfo.ip).equal(ips[i]);
        }

        expect(ipInfoList[0]['type']).equal('IPv4');
        expect(ipInfoList[1]['type']).equal('IPv6');
        expect(ipInfoList[2]['type']).equal('IPv4');
    });

    it('should return cached value if available', async () => {
        const client = new IpregistryClient(API_KEY);

        const ipInfo = await client.lookup('66.165.2.7');
        ipInfo.time_zone.current_time = 'cachedTime';

        const ips = ['66.165.2.7', '1.1.1.1', '8.8.4.4'];
        const ipInfoList = await client.batchLookup(ips);

        for (let i = 0; i < ipInfoList.length; i++) {
            const ipInfo = ipInfoList[i] as IpInfo;
            expect(ipInfo.ip).equal(ips[i]);
        }

        expect((ipInfoList[0] as IpInfo).time_zone.current_time).equal('cachedTime');
    });

    it('should handle invalid input with no error', async () => {
        const client = new IpregistryClient(API_KEY);
        const ips = ['66.165.2.7a', '1.1.1.1', '8.8.4.4c'];
        const ipInfoList = await client.batchLookup(ips);

        expect(ipInfoList[0]).to.be.instanceOf(LookupError);
        expect(ipInfoList[1]).not.to.be.instanceOf(LookupError);
        expect(ipInfoList[2]).to.be.instanceOf(LookupError);
    });
});

describe('originLookup', () => {
    it('should return fresh info with no cache', async () => {
        const client = new IpregistryClient(API_KEY);
        const requesterIpInfo = await client.originLookup();

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
        const client = new IpregistryClient(API_KEY);
        const requesterIpInfo = await client.originLookup();
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

        const requesterIpInfo2 = await client.originLookup();

        expect(requesterIpInfo2).equals(requesterIpInfo);
    });
});
