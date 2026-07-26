// Aster WebSocket combined-stream endpoint — supports dynamic SUBSCRIBE/UNSUBSCRIBE
// Combined-stream messages arrive wrapped in { stream: '<name>', data: { ... } }
export const WS_URL = 'wss://fstream.asterdex.com/stream';
// Aster REST API endpoint for info/metadata queries
export const INFO_API_URL = 'https://fapi.asterdex.com';
// Interval (ms) between keepalive pings on the WebSocket connection max is 60s
export const PING_INTERVAL_MS = 20_000;