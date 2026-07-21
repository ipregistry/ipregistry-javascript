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

import { describe, it } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { expect } from 'chai'

import * as esmExports from '../dist/index.mjs'

const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
)

function collectPaths(conditions: unknown): string[] {
    if (typeof conditions === 'string') {
        return [conditions]
    }
    return Object.values(conditions as Record<string, unknown>).flatMap(
        collectPaths,
    )
}

describe('package exports', () => {
    const rootExport = packageJson.exports['.']

    it('declares the types condition first so TypeScript can match it', () => {
        for (const format of ['import', 'require']) {
            const conditions = rootExport[format]
            expect(
                Object.keys(conditions)[0],
                `first condition of "${format}"`,
            ).to.equal('types')
        }
    })

    it('uses ESM type declarations for import and CJS ones for require', () => {
        expect(rootExport.import.types).to.match(/\.d\.mts$/)
        expect(rootExport.require.types).to.match(/\.d\.ts$/)
    })

    it('exposes package.json and declares the package side-effect free', () => {
        expect(packageJson.exports['./package.json']).to.equal('./package.json')
        expect(packageJson.sideEffects).to.be.false
    })

    it('only references files that the build produces', () => {
        for (const path of collectPaths(packageJson.exports)) {
            const resolved = fileURLToPath(
                new URL(`../${path}`, import.meta.url),
            )
            expect(existsSync(resolved), `${path} exists`).to.be.true
        }
    })
})

describe('built bundles', () => {
    const esmKeys = Object.keys(esmExports).sort()

    it('exposes the public API through the ESM bundle', () => {
        expect(esmKeys).to.include.members([
            'ApiError',
            'InMemoryCache',
            'IpregistryClient',
            'IpregistryConfigBuilder',
            'LookupError',
        ])
    })

    it('loads under require() with the same exports as the ESM bundle', () => {
        const require = createRequire(import.meta.url)
        const cjsExports = require('../dist/index.js')
        const cjsKeys = Object.keys(cjsExports)
            .filter(key => key !== '__esModule' && key !== 'default')
            .sort()
        expect(cjsKeys).to.deep.equal(esmKeys)
    })

    it('registers the ipregistry global with the same exports when loaded as a browser script', () => {
        const source = readFileSync(
            new URL(`../${packageJson.browser}`, import.meta.url),
            'utf-8',
        )
        const context: { ipregistry?: Record<string, unknown> } = {}
        runInNewContext(source, context)
        expect(typeof context.ipregistry, 'window.ipregistry').to.equal(
            'object',
        )
        expect(Object.keys(context.ipregistry!).sort()).to.deep.equal(esmKeys)
    })
})
