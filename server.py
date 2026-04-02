#!/usr/bin/env python3
"""
Departure Board Server
Serves the display page, control page, and relays WebSocket messages between them.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

try:
    from aiohttp import web
except ImportError:
    print("Installing aiohttp...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'aiohttp', '--break-system-packages', '-q'])
    from aiohttp import web


BASE_DIR = Path(__file__).parent.resolve()
HOST = '0.0.0.0'  # Listen on all interfaces (needed for phone access)
PORT = 8080

# Track all connected WebSocket clients
clients = set()


async def ws_handler(request):
    """WebSocket endpoint — relays messages between display and control pages."""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    clients.add(ws)
    client_ip = request.remote
    print(f"[ws] Client connected from {client_ip} ({len(clients)} total)")

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                # Relay message to all OTHER connected clients
                data = msg.data
                for client in clients:
                    if client is not ws and not client.closed:
                        try:
                            await client.send_str(data)
                        except Exception:
                            pass
            elif msg.type == web.WSMsgType.ERROR:
                print(f"[ws] Error: {ws.exception()}")
    finally:
        clients.discard(ws)
        print(f"[ws] Client disconnected ({len(clients)} remaining)")

    return ws


async def control_handler(request):
    """Serve the phone control page."""
    return web.FileResponse(BASE_DIR / 'control' / 'index.html')


def create_app():
    app = web.Application()

    # WebSocket endpoint
    app.router.add_get('/ws', ws_handler)

    # Control page
    app.router.add_get('/control', control_handler)
    app.router.add_get('/control/', control_handler)

    # Static files — serves CSS, JS, and index.html from project root
    # Specific routes above take precedence over this catch-all
    app.router.add_static('/', BASE_DIR, show_index=True)

    return app


def get_local_ip():
    """Get the Pi's local IP address for display purposes."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '???'


if __name__ == '__main__':
    ip = get_local_ip()
    print(f"""
╔══════════════════════════════════════════════╗
║         DEPARTURE BOARD SERVER               ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Display:  http://{ip}:{PORT}/          ║
║  Control:  http://{ip}:{PORT}/control   ║
║                                              ║
║  Open Display on TV browser                  ║
║  Open Control on your phone                  ║
║                                              ║
╚══════════════════════════════════════════════╝
""")
    app = create_app()
    web.run_app(app, host=HOST, port=PORT, print=None)
