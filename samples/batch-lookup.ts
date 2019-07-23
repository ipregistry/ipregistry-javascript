import {ApiError, ClientError, IpInfo, IpregistryClient, LookupError} from '../src';

async function main() {
    const client = new IpregistryClient('tryout');

    try {
        const batchResults = await client.batchLookup(['73.2.2.2a', '8.8.8.8', '2001:67c:2e8:22::c100:68b']);

        for (const batchResult of batchResults) {
            if (batchResult instanceof LookupError) {
                // Handle lookup error here (e.g. invalid IP address)
                console.error('Lookup error', batchResult);
            } else {
                console.log(batchResult);
            }
        }
    } catch (error) {
        if (error instanceof ApiError) {
            // Handle API error here (e.g. Invalid API key)
            console.error('API error', error);
        } else if (error instanceof ClientError) {
            // Handle client error here (e.g. request timeout)
            console.error('Client error', error);
        } else {
            // Handle unexpected error here
            console.error('Unexpected error', error);
        }
    }
}

main().then(() => 0).catch(() => 1);
