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

// Runs the smoke scenario inside the real Cloudflare Workers runtime
// (workerd, via Miniflare). The worker entry is bundled first with esbuild so
// workerd receives a single self-contained module.

import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const outDir = await mkdtemp(join(tmpdir(), 'ipregistry-worker-smoke-'))
const outFile = join(outDir, 'worker.mjs')

try {
    await build({
        bundle: true,
        entryPoints: [new URL('worker.mjs', import.meta.url).pathname],
        format: 'esm',
        outfile: outFile,
        target: 'es2022',
    })

    const miniflare = new Miniflare({
        compatibilityDate: '2026-01-01',
        modules: true,
        script: await readFile(outFile, 'utf-8'),
    })

    try {
        const response = await miniflare.dispatchFetch('http://smoke.test/')
        const body = await response.text()

        if (response.status !== 200 || body !== 'OK') {
            console.error(`workerd smoke test FAILED (${response.status}):`)
            console.error(body)
            process.exit(1)
        }

        console.log('workerd smoke test OK')
    } finally {
        await miniflare.dispose()
    }
} finally {
    await rm(outDir, { force: true, recursive: true })
}
