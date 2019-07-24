[<img src="https://ipregistry.co/assets/icons/icon-72x72.png" alt="Ipregistry" width="64"/>](https://ipregistry.co/) 
# Ipregistry Javascript Client Library

[![License](http://img.shields.io/:license-apache-blue.svg)](LICENSE)
[![Travis](https://travis-ci.com/ipregistry/ipregistry-java.svg?branch=master&style=flat-square)](https://travis-ci.com/ipregistry/ipregistry-java)
[![Maven Central](https://img.shields.io/maven-central/v/co.ipregistry/ipregistry-client.svg)](https://search.maven.org/search?q=g:co.ipregistry%20AND%20a:ipregistry-client)
[![Javadocs](https://www.javadoc.io/badge/co.ipregistry/ipregistry-client.svg)](https://www.javadoc.io/doc/co.ipregistry/ipregistry-client)


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
});
```

Instead of using promises, you can also use async/await:

```javascript
const {IpregistryClient} = require('@ipregistry/client');

const client = new IpregistryClient('tryout');

async function lookupIpInfo(ip) {
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

## Caching

The Ipregistry client library has built-in support for in-memory caching.


## Errors

All Ipregistry exceptions inherit the _IpregistryException_ class.

Main subtypes are _ApiException_ and _ClientException_.

Exceptions of type _ApiException_ include a code field that maps to the one described in the [Ipregistry documentation](https://ipregistry.co/docs/errors).

## Filtering bots


```

# Other Libraries

There are official Ipregistry client libraries available for many languages including 
[Java](https://github.com/ipregistry/ipregistry-java), 
[Python](https://github.com/ipregistry/ipregistry-python), 
[Typescript](https://github.com/ipregistry/ipregistry-javascript) and more.

Are you looking for an official client with a programming language or framework we do not support yet? 
[let us know](mailto:support@ipregistry.co).