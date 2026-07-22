// A single price level in the Hyperliquid WebSocket payload
export type HyperliquidWsLevel = {
    // Price of the level
    px: string;
    // Size (volume) at the level
    sz: string;
    // Number of individual orders at this price level
    n: number;
};

// Legacy format used by some older HL endpoints (price, size, numOrders)
export type HyperliquidLegacyTupleLevel = [string, string, number];

// A raw level can either be the object format or the legacy tuple format
export type HyperliquidRawLevel = HyperliquidWsLevel | HyperliquidLegacyTupleLevel;

// The structure of the actual data inside an l2Book channel message
export interface HyperliquidBookData {
    // Coin symbol (e.g., 'HYPE')
    coin: string;
    // Timestamp in milliseconds
    time: number;
    // Array containing two arrays: [Bids, Asks]
    levels: [HyperliquidRawLevel[], HyperliquidRawLevel[]];
}

// Full WebSocket message for an L2 Book snapshot/update
export interface HyperliquidSubscriptionMessage {
    // The channel name
    channel: 'l2Book';
    // The book payload
    data: HyperliquidBookData;
}

// Catch-all type for all incoming HL WebSocket messages
export type HyperliquidInboundMessage =
    | HyperliquidSubscriptionMessage
    | { channel: 'subscriptionResponse'; data: unknown }
    | { channel: 'error'; data: string };

// Request format to subscribe to an l2Book channel
export interface HyperliquidSubscribeRequest {
    // Action to perform
    method: 'subscribe';
    subscription: {
        // Channel type
        type: 'l2Book';
        // Coin to subscribe to
        coin: string;
    };
}

// Request format to unsubscribe from an l2Book channel
export interface HyperliquidUnsubscribeRequest {
    // Action to perform
    method: 'unsubscribe';
    subscription: {
        // Channel type
        type: 'l2Book';
        // Coin to unsubscribe from
        coin: string;
    };
}

// Catch-all type for all outgoing HL WebSocket messages
export type HyperliquidOutboundMessage =
    | HyperliquidSubscribeRequest
    | HyperliquidUnsubscribeRequest;