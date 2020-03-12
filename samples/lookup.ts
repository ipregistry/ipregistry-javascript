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

import {ApiError, ClientError, IpregistryClient} from '../src';

async function main() {
    const client = new IpregistryClient('tryout');

    try {
        const response = await client.lookup('54.85.132.205');

        // Get location, threat data and more
        console.log(response.data.location.country.code);
        console.log(response.data.currency.code);
        console.log(response.data.security.is_threat);
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
