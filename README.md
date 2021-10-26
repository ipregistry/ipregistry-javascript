[<img src="https://cdn.ipregistry.co/icons/icon-72x72.png" alt="Ipregistry" width="64"/>](https://ipregistry.co/) 
# Ipregistry Javascript Client Library

[![License](http://img.shields.io/:license-apache-blue.svg)](LICENSE)
[![Actions Status](https://github.com/ipregistry/ipregistry-javascript/workflows/Node%20CI/badge.svg)](https://github.com/ipregistry/ipregistry-javascript/actions)
[![npm](https://img.shields.io/npm/v/@ipregistry/client.svg)](https://www.npmjs.com/package/@ipregistry/client)

This is the official Javascript client library for the [Ipregistry](https://ipregistry.co) IP geolocation and threat data API,
allowing you to lookup your own IP address or specified ones. Responses return multiple data points including carrier, 
company, currency, location, timezone, threat information, and more.

## Getting Started

You'll need an Ipregistry API key, which you can get along with 100,000 free lookups by signing up for a free account at [https://ipregistry.co](https://ipregistry.co).

### Installation

#### Npm

```
$ npm install @ipregistry/client
```

#### Yarn

```
$ yarn add @ipregistry/client
```

### First example

This is a very simple example. This creates a Ipregistry client and retrieves IP info for a given IP address:

```javascript
const {IpregistryClient} = require('@ipregistry/client');

const client = new IpregistryClient('YOUR_API_KEY');

client.lookup('73.2.2.2').then(response => {
    console.log(response.data);
}).catch(error => {
    console.err(error);
})

```

Instead of using promises, you can also use async/await:

```javascript
const {IpregistryClient} = require('@ipregistry/client');

const client = new IpregistryClient('YOUR_API_KEY');

async function lookupIpInfo(ip) {
    try {
        const response = await client.lookup('73.2.2.2');
        // Get location, threat data and more
        console.log(response.data.location.country.code);
        console.log(response.data.currency.code);
        console.log(response.data.security.is_threat);
    } catch(error) {
        console.err(error);
    }
}

lookupIpInfo();
```

Or with TypeScript:

```typescript
import {ApiError, ClientError, IpregistryClient} from '@ipregistry/client';

async function main() {
    const client = new IpregistryClient('YOUR_API_KEY');

    try {
        const response = await client.lookup('73.2.2.2');
        // Get location, threat data and more
        console.log(response.data.location.country.code);
        console.log(response.data.currency.code);
        console.log(response.data.security.is_threat);
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('API error', error);
        } else if (error instanceof ClientError) {
            console.error('Client error', error);
        } else {
            console.error('Unexpected error', error);
        }
    }
}

main().then(() => 0).catch(() => 1);
```

Browser support:

```
<script src="https://unpkg.com/@ipregistry/client/dist/browser/index.js"></script>
<script>
    const client = new ipregistry.IpregistryClient('YOUR_API_KEY');
    
    client.lookup('73.2.2.2').then(response => {
        console.log(response.data);
    }).catch(error => {
        console.err(error);
    });
</script>
```

More samples are available in the [samples](https://github.com/ipregistry/ipregistry-javascript/tree/master/samples) 
folder.

## Caching

The Ipregistry client library has built-in support for in-memory caching. 
By default caching is disabled. Below are examples to enable and configure a caching strategy.
Once enabled, the default cache implementation memoizes for 10min the most 2048 recently used lookups on server side (16 when used in a browser).

**Make sure you do not create an Ipregistry client per request, otherwise caching will have no effect**. 
In the case you are using a Function-as-a-Service (e.g. AWS Lambda, Firebase Function, Google Cloud Function), then you 
should declare an Ipregistry client variable in global scope. This way, the Ipregistry client states can be reused 
in subsequent invocations.

### Enabling caching

Caching up to 16384 entries:

```typescript
const client = new IpregistryClient('YOUR_API_KEY', new InMemoryCache(16384));
```

### Configuring cache max age

Caching up to 16384 entries for at most 6 hours:

```typescript
const client = new IpregistryClient('YOUR_API_KEY', new InMemoryCache(16384, 3600 * 6 * 1000));
```

If your purpose is to re-use a same Ipregistry client instance (and thus share the same cache) for different API keys, 
then you can alter the current configuration to set the API key to use before each request:

```typescript
client.config.apiKey = 'YOUR_NEW_API_KEY';
```

### Disabling caching

```typescript
const client = new IpregistryClient('YOUR_API_KEY', new NoCache());
```

## Enabling hostname lookup

By default, the Ipregistry API does not return information about the hostname a given IP address resolves to. 
In order to include the hostname value in your API result, you need to enable the feature explicitly:

```typescript
const ipInfo = await client.lookup('73.2.2.2', IpregistryOptions.hostname(true));
```

## Errors

All Ipregistry errors inherit _IpregistryError_ class.

Main subtypes are _ApiError_ and _ClientError_.

Errors of type _ApiError_ include a code field that maps to the one described in the [Ipregistry documentation](https://ipregistry.co/docs/errors).

## Filtering bots

You might want to prevent Ipregistry API requests for crawlers or bots browsing your pages.

A manner to proceed is to identify bots using `User-Agent` header. To ease this process, the library includes a utility function:

```
UserAgent.isBot('TO_REPLACE_BY_USER_AGENT_RETRIEVED_FROM_REQUEST_HEADER')
```

Please note that when caching is disabled, some of the fields above may be `null` when the content is retrieved from 
the cache and no request is made to the Ipregistry API.

## Selecting fields

To save bandwidth and speed up response times, the API allows selecting fields to return:

```typescript
const response = await client.lookup('73.2.2.2', IpregistryOptions.filter('hostname,location.country.name'));
```

## Usage data

Looking to know the number of credits a request consumed? how much is remaining? or simply get throttling info about 
an API key for which you have enabled rate limiting?

All client responses are of type 
[ApiResponse](https://github.com/ipregistry/ipregistry-javascript/blob/master/src/request.ts#L25) and include data 
about credits and throttling.

```typescript
const response = await client.lookup('73.2.2.2');
console.log(response.credits.consumed);
console.log(response.credits.remaining);
console.log(response.throttling.limit);
console.log(response.throttling.remaining);
console.log(response.throttling.reset);
```

# Other Libraries

There are official Ipregistry client libraries available for many languages including 
[Java](https://github.com/ipregistry/ipregistry-java), 
[Python](https://github.com/ipregistry/ipregistry-python), and more.

Are you looking for an official client with a programming language or framework we do not support yet? 
[let us know](mailto:support@ipregistry.co).
