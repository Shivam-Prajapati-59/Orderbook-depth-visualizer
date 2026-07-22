
import { isAbortError, logPipelineError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';

// Import the correct constant file (fixed bug: was '../constants')
import { INFO_API_URL } from '../constants';

// Options for the POST request
type PostInfoOptions = {
    // Optional signal to abort the fetch request
    signal?: AbortSignal;
};

// Generic helper to send POST requests to the Hyperliquid /info endpoint
export async function postInfo(body: unknown, options?: PostInfoOptions): Promise<unknown> {
    let response: Response;

    try {

        response = await fetch(INFO_API_URL, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: options?.signal,
        });

    } catch (error) {
        if (isAbortError(error)) throw error;
        logPipelineError('postHyperliquidInfo.network', error);
        throw new Error(`Hyperliquid /info: network error — ${error}`);
    }

    if (!response.ok) {
        const msg = `Hyperliquid /info request failed: HTTP ${response.status} ${response.statusText}`;
        logPipelineError('postHyperliquidInfo.http', new Error(msg));
        throw new Error(msg);
    }

    try {
        const data = await readResponseJson(response);

        if (data === null || typeof data !== 'object') {
            logPipelineError('postHyperliquidInfo.json', new Error('empty response body'));
            throw new Error('JSON is null or not an object');
        }

        return data;
    } catch (error) {
        if (isAbortError(error)) throw error;
        if (error instanceof Error && error.message.startsWith('Hyperliquid /info:')) throw error;
        logPipelineError('postHyperliquidInfo.json', error);
        throw new Error('Hyperliquid /info: invalid JSON response');
    }
}