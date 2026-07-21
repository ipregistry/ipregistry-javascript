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

// Extracts the dotted field paths declared by the response model interfaces
// in src/model.ts using the TypeScript compiler API, and collects the dotted
// field paths present in a live API response. Comparing the two detects model
// drift: fields the API returns that the model does not declare.

import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const MODEL_PATH = fileURLToPath(new URL('../src/model.ts', import.meta.url))

const SKIPPED_TYPE_FLAGS =
    ts.TypeFlags.StringLike |
    ts.TypeFlags.NumberLike |
    ts.TypeFlags.BooleanLike |
    ts.TypeFlags.BigIntLike |
    ts.TypeFlags.ESSymbolLike |
    ts.TypeFlags.Null |
    ts.TypeFlags.Undefined |
    ts.TypeFlags.Never |
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown

/**
 * Returns every dotted field path declared by the named interface or type
 * alias of src/model.ts, e.g. 'location.country.code'.
 */
export function collectDeclaredPaths(typeName: string): Set<string> {
    const program = ts.createProgram([MODEL_PATH], { strict: true })
    const checker = program.getTypeChecker()
    const source = program.getSourceFile(MODEL_PATH)

    if (!source) {
        throw new Error(`Cannot load ${MODEL_PATH}`)
    }

    let declaration: ts.Node | undefined
    source.forEachChild(node => {
        if (
            (ts.isInterfaceDeclaration(node) ||
                ts.isTypeAliasDeclaration(node)) &&
            node.name.text === typeName
        ) {
            declaration = node
        }
    })

    if (!declaration) {
        throw new Error(`Type ${typeName} not found in ${MODEL_PATH}`)
    }

    const paths = new Set<string>()
    walkType(checker.getTypeAtLocation(declaration), '', paths, checker, [])
    return paths
}

function walkType(
    type: ts.Type,
    prefix: string,
    paths: Set<string>,
    checker: ts.TypeChecker,
    ancestors: ts.Type[],
): void {
    if (ancestors.includes(type)) {
        return
    }

    for (const constituent of type.isUnion() ? type.types : [type]) {
        if (constituent.flags & SKIPPED_TYPE_FLAGS) {
            continue
        }

        const elementType = constituent.getNumberIndexType()
        if (elementType) {
            walkType(elementType, prefix, paths, checker, [...ancestors, type])
            continue
        }

        for (const property of checker.getPropertiesOfType(constituent)) {
            const path = prefix ? `${prefix}.${property.name}` : property.name
            paths.add(path)
            const propertyType = checker.getTypeOfSymbolAtLocation(
                property,
                property.valueDeclaration ?? property.declarations![0],
            )
            walkType(propertyType, path, paths, checker, [...ancestors, type])
        }
    }
}

/**
 * Returns every dotted field path present in an API response value. Arrays
 * contribute the paths of their elements without an index segment, matching
 * the shape produced by `collectDeclaredPaths`.
 */
export function collectResponsePaths(
    value: unknown,
    prefix = '',
    paths = new Set<string>(),
): Set<string> {
    if (Array.isArray(value)) {
        for (const item of value) {
            collectResponsePaths(item, prefix, paths)
        }
    } else if (value !== null && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            const path = prefix ? `${prefix}.${key}` : key
            paths.add(path)
            collectResponsePaths(child, path, paths)
        }
    }

    return paths
}
