// A raw level object as received from the Lighter WebSocket
export interface LighterRawLevel {
    price: string,
    size: string,
    totalDepth: number
}


// The structure of the order book payload received from Lighter
export interface LighterOrderBookPayload {
    code: number;
    asks: LighterRawLevel[];
    bids: LighterRawLevel[];
    offset: number;
    nonce: number;
    last_updated_at: number;
    begin_nonce: number;
}


// Message format for a standard order book update
export interface LighterOrderBookMessage {
    type: 'update/order_book';
    channel: string;
    last_updated_at: number;
    offset: number;
    order_book: LighterOrderBookPayload;
    timestamp: number;
}

// Initial snapshot after subscribe; same `order_book` shape as updates
export interface LighterSubscribedOrderBookMessage {
    type: 'subscribed/order_book';
    channel: string;
    order_book: LighterOrderBookPayload;
}

// Catch-all type for incoming WebSocket messages from Lighter
export type LighterInboundMessage = | LighterOrderBookMessage
    | LighterSubscribedOrderBookMessage
    | { type: string;[key: string]: unknown };




// Outbound request format to subscribe to an order book channel
export interface LighterSubscribeRequest {
    type: 'subscribe';
    channel: string; // e.g. "order_book/0"
}

// Outbound request format to unsubscribe from an order book channel
export interface LighterUnsubscribeRequest {
    type: 'unsubscribe';
    channel: string;
}

// Catch-all type for outbound WebSocket requests to Lighter
export type LighterOutboundMessage = LighterSubscribeRequest | LighterUnsubscribeRequest;