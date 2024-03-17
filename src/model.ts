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

export enum AsType {
    BUSINESS = 'business',
    EDUCATION = 'education',
    GOVERNMENT = 'government',
    HOSTING = 'hosting',
    INACTIVE = 'inactive',
    ISP = 'isp',
}

export interface AutonomousSystem {
    allocated: string

    asn: number

    country_code: string

    domain: string

    name: string

    prefixes: AutonomousSystemPrefixes

    relationships: AutonomousSystemRelationships

    registry: RegionalInternetRegistry

    type: AsType

    updated: string
}

export interface AutonomousSystemPrefixes {
    ipv4_count: number

    ipv6_count: number

    ipv4: AutonomousSystemPrefix[]

    ipv6: AutonomousSystemPrefix[]
}

export interface AutonomousSystemPrefix {
    cidr: string

    country_code: string

    network_name: string

    organization: string

    prefix: string

    registry: RegionalInternetRegistry
}

export interface AutonomousSystemRelationships {
    downstreams: number[]

    peers: number[]

    upstreams: number[]
}

export interface IpInfo {
    ip: string

    type: 'IPv4' | 'IPv6'

    hostname: string | null

    carrier: Carrier

    company: Company

    connection: Connection

    currency: Currency

    location: Location

    security: Security

    time_zone: TimeZone
}

export interface RequesterAutonomousSystem extends AutonomousSystem {}

export interface RequesterIpInfo extends IpInfo {
    user_agent: UserAgent
}

export interface Carrier {
    name: string | null

    mcc: string | null

    mnc: string | null
}

export interface Company {
    domain: string | null

    name: string | null

    type: 'business' | 'education' | 'government' | 'isp' | 'hosting' | null
}

export interface Connection {
    asn: number | null

    domain: string | null

    organization: string | null

    route: string | null

    type:
        | 'business'
        | 'education'
        | 'government'
        | 'inactive'
        | 'isp'
        | 'hosting'
        | null
}

export interface Currency {
    code: string | null

    name: string | null

    name_native: string | null

    plural: string | null

    plural_native: string | null

    symbol: string | null

    symbol_native: string | null

    format: CurrencyFormat
}

export interface CurrencyFormat {
    negative: CurrencyFormatPrefixSuffix

    positive: CurrencyFormatPrefixSuffix
}

export interface CurrencyFormatPrefixSuffix {
    prefix: string | null

    suffix: string | null
}

export interface Location {
    continent: Continent

    country: Country

    region: Region

    city: string | null

    postal: string | null

    latitude: number | null

    longitude: number | null

    language: Language

    in_eu: boolean
}

export interface Continent {
    code: string | null

    name: string | null
}

export interface Country {
    area: number

    borders: string[]

    calling_code: string | null

    capital: string | null

    code: string | null

    name: string | null

    population: number

    population_density: number

    flag: Flag

    languages: Language[]

    tld: string | null
}

export interface Flag {
    emoji: string | null

    emoji_unicode: string | null

    emojitwo: string | null

    noto: string | null

    twemoji: string | null

    wikimedia: string | null
}

export interface Region {
    code: string | null

    name: string | null
}

export enum RegionalInternetRegistry {
    AFRINIC = 'AFRINIC',
    APNIC = 'APNIC',
    ARIN = 'ARIN',
    JPNIC = 'JPNIC',
    KRNIC = 'KRNIC',
    LACNIC = 'LACNIC',
    RIPE_NCC = 'RIPE_NCC',
    TWNIC = 'TWNIC',
}

export interface Language {
    code: string | null

    name: string | null

    native: string | null
}

export interface Security {
    is_abuser: boolean

    is_attacker: boolean

    is_bogon: boolean

    is_cloud_provider: boolean

    is_proxy: boolean

    is_relay: boolean

    is_tor: boolean

    is_tor_exit: boolean

    is_anonymous: boolean

    is_threat: boolean

    is_vpn: boolean
}

export interface TimeZone {
    id: string | null

    abbreviation: string | null

    current_time: string | null

    name: string | null

    offset: number

    in_daylight_saving: boolean
}

export interface UserAgent {
    header: string | null

    name: string | null

    type: string | null

    version: string | null

    version_major: string | null

    device: UserAgentDevice

    engine: UserAgentEngine

    os: UserAgentOperatingSystem
}

export interface UserAgentDevice {
    brand: string | null

    name: string | null

    type: string | null
}

export interface UserAgentEngine {
    name: string | null

    type: string | null

    version: string | null

    version_major: string | null
}

export interface UserAgentOperatingSystem {
    name: string | null

    type: string | null

    version: string | null
}
