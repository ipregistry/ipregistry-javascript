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
    ApiResponse,
    ClientError,
    IpregistryClient,
    UserAgent,
} from '../src'

async function main() {
    const client: IpregistryClient = new IpregistryClient('tryout')

    try {
        // Input one or more user-agent header values to parse
        const response: ApiResponse<UserAgent[]> = await client.parseUserAgents(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36',
        )

        for (let userAgent of response.data) {
            console.log(userAgent.name)
            console.log(userAgent.os.name)
            console.log(userAgent.type)
            console.log(userAgent.version)
        }
    } catch (error) {
        if (error instanceof ApiError) {
            // Handle API error here (e.g. Invalid API key)
            console.error('API error', error)
        } else if (error instanceof ClientError) {
            // Handle client error here (e.g. request timeout)
            console.error('Client error', error)
        } else {
            // Handle unexpected error here
            console.error('Unexpected error', error)
        }
    }
}

main()
    .then(() => 0)
    .catch(() => 1)
