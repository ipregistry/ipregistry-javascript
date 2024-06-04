import { ApiError, ClientError } from './errors.js'

interface Options extends RequestInit {
    retry?: {
        backoffLimit: number,
        delay: (attemptCount: number) => number,
        limit: number
    }
    timeout?: number
}

const DEFAULT_OPTIONS = {
    retry: {
        backoffLimit: 5000,
        delay: (attemptCount: number) => 0.3 * (2 ** (attemptCount - 1)) * 500,
        limit: 2
    },
    timeout: 5000
}

export async function customFetch(url: string, providedOptions: Options): Promise<Response> {
    let options ={
        ...DEFAULT_OPTIONS,
        ...providedOptions
    }

    let retryCount = 0;

    while (retryCount <= options.retry.limit) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!response.ok) {
                const data = await response.json();
                throw new ApiError(data.code, data.message, data.resolution);
            }

            return response;

        } catch (error: any) {
            if (error?.name === 'AbortError') {
                retryCount++;
                const retryDelay = Math.min(options.retry.delay(retryCount), options.retry.backoffLimit);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                throw error;
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    throw new ClientError(`Request failed after ${options.retry.limit} retries`);
}