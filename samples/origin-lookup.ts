import {ApiError, ClientError, IpregistryClient} from '../src';

async function main() {
    const client = new IpregistryClient('tryout');

    try {
        const ipInfo = await client.originLookup();
        console.log(ipInfo);
    } catch (error) {
        if (error instanceof ApiError) {
            // Handle API error here (e.g. Invalid API key or IP address)
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
