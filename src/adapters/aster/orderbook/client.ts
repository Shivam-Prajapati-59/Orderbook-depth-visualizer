import { ASTER_SYMBOL_MAP } from '@/src/config/trademarket';
import { BaseAdapter } from '../../base/baseAdapter';
import { SymbolMap, VenueMetaData } from '../../base/types';
import { INFO_API_URL, WS_URL } from '../constants';
import { AsterParser } from './parser';
import { getAsterOrderbookTick } from './priceTick';
import { isAbortError, logPipelineError } from '@/src/lib/pipelineError';
import { readResponseJson } from '@/src/lib/readResponseJson';
import { RECONNECT_BASE_MS } from '../../base/constants';
import type { AsterRawBookMessage, DepthSnapshot } from './types';

const SNAPSHOT_TIMEOUT_MS = 10_000;
const SNAPSHOT_RETRIES = 3;

let msgIdCounter = 1;
function nextId(): number {
    return msgIdCounter++;
}

function unwrapCombinedStream(msg: Record<string, unknown>): Record<string, unknown> | null {
    if ('stream' in msg && typeof msg.stream === 'string' && 'data' in msg && typeof msg.data === 'object' && msg.data !== null) {
        return msg.data as Record<string, unknown>;
    }
    return msg;
}

export class AsterAdapter extends BaseAdapter {

    readonly metadata: VenueMetaData = {
        id: 'aster',
        label: 'Aster',
        tickSize: 0.01,
    };

    readonly symbolMap: SymbolMap = ASTER_SYMBOL_MAP;

    private parser = new AsterParser();
    private resolvedTick: number | null = null;
    private pendingBootstrap = false;

    protected getWsUrl(): string {
        return WS_URL;
    }

    protected onConnected(): void {
        if (this.currentAsset) {
            this.sendSubscribe(this.currentAsset);
            this.fetchAndApplyTickSize(this.currentAsset);
            this.startBootstrap(this.currentAsset).catch((e) => {
                if (!isAbortError(e)) logPipelineError('onConnected.startBootstrap', e);
            });
        }
    }

    subscribe(asset: string): void {
        if (this.currentAsset && this.currentAsset !== asset && this.connectionStatus === 'connected') {
            this.sendUnsubscribe(this.currentAsset);
        }
        if (this.currentAsset !== asset) {
            this.resolvedTick = null;
        }
        this.currentAsset = asset;
        this.parser.reset();
        if (this.connectionStatus === 'connected') {
            this.sendSubscribe(asset);
            this.fetchAndApplyTickSize(asset);
            this.startBootstrap(asset).catch((e) => {
                if (!isAbortError(e)) logPipelineError('subscribe.startBootstrap', e);
            });
        }
    }

    unsubscribe(): void {
        if (!this.currentAsset) return;
        if (this.connectionStatus === 'connected') {
            this.sendUnsubscribe(this.currentAsset);
        }
        this.currentAsset = null;
        this.resolvedTick = null;
        this.parser.reset();
    }

    async getOrderbookTickSize(asset: string): Promise<number | null> {
        return getAsterOrderbookTick(asset);
    }

    get resolvedTickSize(): number | null {
        return this.resolvedTick;
    }

    private sendSubscribe(asset: string): void {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) {
            console.warn(`[AsterAdapter] Unknown asset: ${asset}`);
            return;
        }
        const streamName = `${symbol.toLowerCase()}@depth`;
        this.send({
            method: 'SUBSCRIBE',
            params: [streamName],
            id: nextId(),
        });
    }

    private sendUnsubscribe(asset: string): void {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) return;
        const streamName = `${symbol.toLowerCase()}@depth`;
        this.send({
            method: 'UNSUBSCRIBE',
            params: [streamName],
            id: nextId(),
        });
    }

    // Aster uses protocol-level WebSocket ping/pong frames (server sends every 5 min, browser auto-responds)
    protected startKeepalive(): void {
    }

    protected stopKeepalive(): void {
    }

    protected onMessage(event: MessageEvent): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(event.data as string);
        } catch {
            console.warn('[AsterAdapter] Unparseable message', event.data);
            return;
        }

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return;
        }

        const msg = parsed as Record<string, unknown>;

        const payload = unwrapCombinedStream(msg);
        if (!payload) return;

        if ('result' in payload && 'id' in payload) {
            return;
        }

        if (payload.e !== 'depthUpdate') {
            return;
        }

        try {
            const bookMsg = payload as unknown as AsterRawBookMessage;
            const currentSymbol = this.currentAsset && this.resolveSymbol(this.currentAsset);
            if (!currentSymbol || bookMsg.s !== currentSymbol) return;

            const parsedBook = this.parser.parse(bookMsg);
            if (parsedBook) {
                this.onBookUpdate?.(parsedBook);
            }
            if (this.parser.needsSnapshot && !this.pendingBootstrap) {
                this.pendingBootstrap = true;
                const asset = this.currentAsset;
                if (asset) {
                    this.fetchSeedSnapshot(asset).catch((e) => {
                        if (!isAbortError(e)) logPipelineError('onMessage.fetchSeedSnapshot', e);
                    });
                } else {
                    this.pendingBootstrap = false;
                }
            }
        } catch (e) {
            logPipelineError('AsterAdapter.onMessage.parse', e);
        }
    }

    private async fetchAndApplyTickSize(asset: string): Promise<void> {
        try {
            const tick = await getAsterOrderbookTick(asset);
            if (this.currentAsset === asset && tick != null) {
                this.resolvedTick = tick;
            }
        } catch (e) {
            logPipelineError('AsterAdapter.fetchAndApplyTickSize', e);
        }
    }

    private async startBootstrap(asset: string): Promise<void> {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) return;
        this.parser.startBootstrap(symbol);
        await this.fetchSeedSnapshot(asset);
    }

    private async fetchSeedSnapshot(asset: string, attempt = 0): Promise<void> {
        const symbol = this.resolveSymbol(asset);
        if (!symbol) return;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS);
            const snapshot = await this.fetchDepthSnapshot(symbol, controller.signal);
            clearTimeout(timeoutId);
            if (!snapshot) {
                throw new Error('Empty depth snapshot');
            }
            snapshot.symbol = symbol;
            this.parser.seedSnapshot(snapshot);
        } catch (e) {
            if (isAbortError(e)) return;
            if (attempt < SNAPSHOT_RETRIES - 1) {
                const delay = RECONNECT_BASE_MS * 2 ** attempt;
                await new Promise((r) => setTimeout(r, delay));
                return this.fetchSeedSnapshot(asset, attempt + 1);
            }
            logPipelineError('fetchSeedSnapshot', e);
        } finally {
            this.pendingBootstrap = false;
        }
    }

    private async fetchDepthSnapshot(symbol: string, signal?: AbortSignal): Promise<DepthSnapshot | null> {
        const url = new URL(`${INFO_API_URL}/fapi/v1/depth`);
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('limit', '1000');

        let response: Response;
        try {
            response = await fetch(url.toString(), { method: 'GET', signal });
        } catch (error) {
            if (isAbortError(error)) throw error;
            logPipelineError('fetchDepthSnapshot.network', error);
            return null;
        }
        if (!response.ok) {
            logPipelineError('fetchDepthSnapshot.http', new Error(`HTTP ${response.status}`));
            return null;
        }
        let data: unknown;
        try {
            data = await readResponseJson(response);
        } catch (error) {
            if (isAbortError(error)) throw error;
            logPipelineError('fetchDepthSnapshot.json', error);
            return null;
        }
        if (typeof data !== 'object' || data === null) return null;
        const raw = data as Record<string, unknown>;
        if (typeof raw.lastUpdateId !== 'number' || !Array.isArray(raw.bids) || !Array.isArray(raw.asks)) {
            return null;
        }
        return {
            symbol: '',
            lastUpdateId: raw.lastUpdateId,
            bids: raw.bids as DepthSnapshot['bids'],
            asks: raw.asks as DepthSnapshot['asks'],
        };
    }
}
