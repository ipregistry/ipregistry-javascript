export class UserAgent {

    public static isBot(userAgent: string): boolean {
        const lowerCaseUserAgent = userAgent.toLowerCase();
        return lowerCaseUserAgent.includes('spider') || lowerCaseUserAgent.includes('bot');
    }

}
