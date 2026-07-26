// {
//   "e": "depthUpdate", // Event type
//   "E": 1571889248277, // Event time
//   "T": 1571889248276, // Transaction time
//   "s": "BTCUSDT",
//   "U": 390497796,
//   "u": 390497878,
//   "pu": 390497794,
//   "b": [          // Bids to be updated
//     [
//       "7403.89",  // Price Level to be
//       "0.002"     // Quantity
//     ],
//     [
//       "7403.90",
//       "3.906"
//     ],
//     [
//       "7404.00",
//       "1.428"
//     ],
//     [
//       "7404.85",
//       "5.239"
//     ],
//     [
//       "7405.43",
//       "2.562"
//     ]
//   ],
//   "a": [          // Asks to be updated
//     [
//       "7405.96",  // Price level to be
//       "3.340"     // Quantity
//     ],
//     [
//       "7406.63",
//       "4.525"
//     ],
//     [
//       "7407.08",
//       "2.475"
//     ],
//     [
//       "7407.15",
//       "4.800"
//     ],
//     [
//       "7407.20",
//       "0.175"
//     ]
//   ]
// }

export type AsterRawLevel = [
    // Price of the level
    price: string,
    // Size (quantity) available at the level
    size: string
];

export interface AsterRawBookMessage {
    // The event type — always 'depthUpdate'
    e: string;
    // Event timestamp in milliseconds
    E: number;
    // Transaction timestamp in milliseconds
    T: number;
    // Trading symbol (e.g. 'BTCUSDT')
    s: string;
    // First update ID in this event
    U: number;
    // Final update ID in this event
    u: number;
    // Final update ID in the previous event
    pu: number;
    // Bid price levels: [price, quantity] (absolute quantities)
    b: AsterRawLevel[];
    // Ask price levels: [price, quantity] (absolute quantities)
    a: AsterRawLevel[];
}
// Full WebSocket message for an Aster partial order book update
export type AsterSubscriptionMessage = AsterRawBookMessage;

export interface AsterSubscriptionResponse {
    result: null;
    id: number;
}


export interface AsterSubscribeRequest {
    method: 'subscribe';
    params: string[];
    id: number;
}

export interface AsterUnsubscribeRequest {
    method: 'unsubscribe';
    params: string[];
    id: number;
}

// REST depth snapshot returned by GET /fapi/v1/depth
export interface DepthSnapshot {
    symbol: string;
    lastUpdateId: number;
    bids: AsterRawLevel[];
    asks: AsterRawLevel[];
}