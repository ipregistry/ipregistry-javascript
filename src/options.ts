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
        super("fields", expression);
    }

}

export class HostnameOption extends IpregistryOption {

    constructor(hostname: boolean) {
        super("hostname", String(hostname));
    }

}
