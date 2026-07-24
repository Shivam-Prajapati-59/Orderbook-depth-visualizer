// Pacifica WebSocket endpoint for real-time data
export const WS_URL = 'wss://ws.pacifica.fi/ws';
// Pacifica REST API endpoint for info/metadata queries
export const INFO_API_URL = 'https://api.pacifica.fi/api/v1';
// Interval (ms) between keepalive pings on the WebSocket connection max is 60s
export const PING_INTERVAL_MS = 20_000;