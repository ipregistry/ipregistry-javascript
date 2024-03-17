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

/**
 * Provides utility methods for working with user agent strings.
 */
export class UserAgents {
    /**
     * Determines whether a given user agent string belongs to a bot.
     *
     * This method checks the user agent string for common bot-related keywords such as 'bot', 'crawl', 'spider',
     * and 'slurp'. It's a simple heuristic approach and may not cover all cases or be 100% accurate.
     *
     * @param userAgent The user agent string to check. This is typically the value of the `User-Agent` HTTP header
     * sent by browsers, crawlers, or other HTTP clients.
     * @returns `true` if the user agent string contains any of the bot-related keywords, indicating it might be a bot;
     * `false` otherwise.
     *
     * Example usage:
     * ```
     * if (UserAgents.isBot(request.headers['user-agent'])) {
     *   console.log('This request is likely from a bot');
     * } else {
     *   console.log('This request is likely from a human user');
     * }
     * ```
     */
    public static isBot(userAgent: string): boolean {
        const lowerCaseUserAgent = userAgent.toLowerCase()

        return (
            lowerCaseUserAgent.includes('bot') ||
            lowerCaseUserAgent.includes('crawl') ||
            lowerCaseUserAgent.includes('spider') ||
            lowerCaseUserAgent.includes('slurp')
        )
    }
}
