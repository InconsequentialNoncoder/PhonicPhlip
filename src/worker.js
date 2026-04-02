// Cloudflare Worker entry point
// Static files (HTML, CSS, JS) are served automatically by the assets config.
// This worker only handles /ws requests, routing them to the Durable Object relay.

export { WebSocketRelay } from './relay.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      // Route WebSocket connections to a single shared Durable Object
      const id = env.RELAY.idFromName('default-room');
      const stub = env.RELAY.get(id);
      return stub.fetch(request);
    }

    // Everything else (static files) is handled by the assets config
    // before it reaches here. This is a fallback for unmatched routes.
    return new Response('Not found', { status: 404 });
  }
};
