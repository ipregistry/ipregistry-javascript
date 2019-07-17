export class UserAgent {

    public static isBot(userAgent: string): boolean {
        const lowerCaseUserAgent = userAgent.toLowerCase();
        return userAgent.includes('spider') || userAgent.includes('bot');
    }

}
