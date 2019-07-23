export class IpregistryOption {

    public readonly name: string;

    public readonly value: string;

    constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }

}

export class FilterOption extends IpregistryOption {

    constructor(expression: string) {
        super('fields', expression);
    }

}

export class HostnameOption extends IpregistryOption {

    constructor(hostname: boolean) {
        super('hostname', String(hostname));
    }

}

export class IpregistryOptions {

    public static filter(fields: string): FilterOption {
        return new FilterOption(fields);
    }

    public static hostname(hostname: boolean): HostnameOption {
        return new HostnameOption(hostname);
    }

    public static from(name: string, value: string): IpregistryOption {
        return new IpregistryOption(name, value);
    }

}
