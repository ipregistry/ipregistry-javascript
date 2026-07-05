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

// Cloudflare Workers smoke test entry: runs the shared smoke scenario inside
// workerd and reports the outcome over HTTP.

import { runSmokeTest } from '../smoke-scenario.mjs'

export default {
    async fetch() {
        try {
            await runSmokeTest()
            return new Response('OK')
        } catch (error) {
            return new Response(`${error?.stack ?? error}`, { status: 500 })
        }
    },
}
