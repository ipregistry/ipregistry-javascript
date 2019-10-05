[<img src="https://ipregistry.co/assets/icons/icon-72x72.png" alt="Ipregistry" width="64"/>](https://ipregistry.co/) 
# Ipregistry Javascript Client Library

[![License](http://img.shields.io/:license-apache-blue.svg)](LICENSE)
[![Travis](https://travis-ci.com/ipregistry/ipregistry-javascript.svg?branch=master&style=flat-square)](https://travis-ci.com/ipregistry/ipregistry-javascript)
[![npm](https://img.shields.io/npm/v/@ipregistry/client.svg)](https://www.npmjs.com/package/@ipregistry/client)

This is the official Java client library for the [Ipregistry](https://ipregistry.co) IP geolocation and threat data API, 
allowing you to lookup your own IP address or specified ones. Responses include more than 50 data points including 
location, currency, timezone, threat information, and more.

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

const client = new IpregistryClient('tryout');

client.lookup('73.2.2.2').then(ipInfo => {
    console.log(ipInfo);
}).catch(error => {
    console.err(error);
})

```

Instead of using promises, you can also use async/await:

```javascript
const {IpregistryClient} = require('@ipregistry/client');

const client = new IpregistryClient('tryout');

async; function lookupIpInfo(ip) {
    try {
        const ipInfo = await client.lookup('73.2.2.2');
        console.log(ipInfo);
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
    const client = new IpregistryClient('tryout');

    try {
        const ipInfo = await client.lookup('73.2.2.2');
        console.log(ipInfo);
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
    const client = new ipregistry.IpregistryClient('tryout');
    
    client.lookup('73.2.2.2').then(ipInfo => {
        console.log(ipInfo);
    }).catch(error => {
        console.err(error);
    });
</script>
```

More samples are available in the [samples](https://github.com/ipregistry/ipregistry-javascript/tree/master/samples) 
folder.

## Caching

The Ipregistry client library has built-in support for in-memory caching. 
By default caching is enabled and the default policy memoizes for 24h the most 2048 used lookups 
on server side (16 when used in a browser).

### Configuring cache size

Caching up to 16384 entries:

```typescript
const client = new IpregistryClient('tryout', new DefaultCache(16384));
```

### Configuring cache max age

Caching up to 16384 entries for at most 6 hours:

```typescript
const client = new IpregistryClient('tryout', new DefaultCache(16384, 3600 * 6 * 1000));
```

### Disabling caching

```typescript
const client = new IpregistryClient('tryout', new NoCache());
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

# Other Libraries

There are official Ipregistry client libraries available for many languages including 
[Java](https://github.com/ipregistry/ipregistry-java), 
[Python](https://github.com/ipregistry/ipregistry-python), and more.

Are you looking for an official client with a programming language or framework we do not support yet? 
[let us know](mailto:support@ipregistry.co).