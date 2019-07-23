export interface IpInfo {

    ip: string;

    type: 'IPv4' | 'IPv6';

    hostname: string | null;

    connection: Connection;

    currency: Currency;

    location: Location;

    security: Security;

    time_zone: TimeZone;

}

export interface RequesterIpInfo extends IpInfo {

    user_agent: UserAgent;

}

export interface UserAgent {

    header: string | null;

    name: string | null;

    type: string | null;

    version: string | null;

    version_major: string | null;

    device: UserAgentDevice;

    engine: UserAgentEngine;

    operating_system: UserAgentOperatingSystem;

}

export interface UserAgentDevice {

    brand: string | null;

    name: string | null;

    type: string | null;

}

export interface UserAgentEngine {

    name: string | null;

    type: string | null;

    version: string | null;

    version_major: string | null;

}

export interface UserAgentOperatingSystem {

    name: string | null;

    type: string | null;

    version: string | null;

}

export interface Connection {

    asn: number;

    organization: string | null;

}

export interface Currency {

    code: string;

    name: string;

    plural: string;

    symbol: string;

    symbol_native: string;

    format: CurrencyFormat;

}

export interface CurrencyFormat {

    negative: CurrencyFormatPrefixSuffix;

    positive: CurrencyFormatPrefixSuffix;

}

export interface CurrencyFormatPrefixSuffix {

    prefix: string;

    suffix: string;

}

export interface Location {

    continent: Continent;

    country: Country;

    region: Region;

    city: string | null;

    postal: string | null;

    latitude: number;

    longitude: number;

    language: Language;

    in_eu: boolean;

}

export interface Continent {

    code: string | null;

    name: string | null;

}

export interface Country {

    area: number;

    borders: string[] | null;

    calling_code: string | null;

    capital: string | null;

    code: string | null;

    name: string | null;

    population: number;

    population_density: number;

    flag: Flag;

    languages: Language[];

    tld: string | null;

}

export interface Flag {

    emoji: string | null;

    emoji_unicode: string | null;

    emojitwo: string | null;

    noto: string | null;

    twemoji: string | null;

    wikimedia: string | null;

}

export interface Region {

    code: string | null;

    name: string | null;

}

export interface Language {

    code: string | null;

    name: string | null;

    native_name: string | null;

}

export interface Security {

    is_bogon: boolean;

    is_tor: boolean;

    is_tor_exit_node: boolean;

    is_proxy: boolean;

    is_anonymous: boolean;

    is_abuser: boolean;

    is_attacker: boolean;

    is_threat: boolean;

}

export interface TimeZone {

    id: string | null;

    abbreviation: string | null;

    current_time: string | null;

    name: string | null;

    offset: number;

    daylight_saving: boolean;

}
