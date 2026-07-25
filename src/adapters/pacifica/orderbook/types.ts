// A single aggregated price level as received from the Pacifica WebSocket
export interface PacificaRawLevel {
    // Total amount accumulated in this aggregation bucket
    a: string;
    // Number of individual orders in this aggregation bucket
    n: number;
    // For bids: highest price in the bucket. For asks: lowest price in the bucket.
    p: string;
}

// The data payload nested inside a Pacifica book channel message
export interface PacificaOrderBookData {
    // Tuple: [bids: PacificaRawLevel[], asks: PacificaRawLevel[]]
    l: [PacificaRawLevel[], PacificaRawLevel[]];
    // Symbol, e.g. "SOL"
    s: string;
    // Timestamp in milliseconds
    t: number;
    // Exchange-wide sequential nonce for event ordering
    li: number;
}

// Full channel message shape for a Pacifica book stream update
export interface PacificaOrderBookMessage {
    channel: 'book';
    data: PacificaOrderBookData;
}

// Catch-all type for any inbound WebSocket message from Pacifica
export type PacificaInboundMessage =
    | PacificaOrderBookMessage
    | { channel: string; data: unknown };

// Outbound subscribe request sent to Pacifica WebSocket
export interface PacificaSubscribeRequest {
    method: 'subscribe';
    params: {
        // Stream source — 'book' for orderbook data
        source: 'book';
        // Market symbol, e.g. "SOL"
        symbol: string;
        // Price aggregation level: one of 1, 10, 100, 1000, 10000
        agg_level: 1 | 10 | 100 | 1000 | 10000;
    };
}

// Outbound unsubscribe request sent to Pacifica WebSocket
export interface PacificaUnsubscribeRequest {
    method: 'unsubscribe';
    params: {
        source: 'book';
        symbol: string;
    };
}

// Catch-all type for outbound WebSocket requests to Pacifica
export type PacificaOutboundMessage = PacificaSubscribeRequest | PacificaUnsubscribeRequest;