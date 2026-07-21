import {
    AdapterConfig,
    ConnectionStatus,
    ConnectionStatusCallback,
    OrderbookUpdateCallback,
    SymbolMap,
    VenueId,
    VenueMetaData,
} from "./types";

export interface VenueAdapter {
    readonly metadata: VenueMetaData;
    readonly symbolMap: SymbolMap;
    readonly connectionStatus: ConnectionStatus;

    connect(
        onBookUpdate: OrderbookUpdateCallback,
        onStatusChange: ConnectionStatusCallback,
    ): void;
    disconnect(): void;

    unsubscribe(): void;

    resolveSymbol(asset: string): string | null;

    getOrderbookTickSize(asset: string): Promise<number | null>;

    destroy(): void;
}

export type VenueAdapterConstructor = new (
    config: AdapterConfig,
) => VenueAdapter;

export type AdapterRegistry = Record<VenueId, VenueAdapterConstructor>;
