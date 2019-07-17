import {IpregistryClient, IpregistryConfig, IpregistryConfigBuilder} from '../src';

import { expect } from 'chai';

const API_KEY = process.env.IPREGISTRY_API_KEY || 'tryout';

describe('Single IP lookup', () => {
    it('should return valid information when IPv4 is known', async () => {
        const client = new IpregistryClient(API_KEY);
        const ipInfo = await client.lookup('8.8.8.8');
        expect(ipInfo.type).equal('IPv4');
        expect(ipInfo.location.country.code).equal('US');
    });
});
