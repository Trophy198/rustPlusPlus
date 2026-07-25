/*
    Copyright (C) 2026 rustplusplus contributors

    Live map Web UI server. Serves a browser page that renders the Rust map with real-time
    team member positions and event markers (cargo ship, patrol helicopter, chinook, crates,
    vending machines, ...). Data is pushed over a WebSocket from the bot's polling loop.

    Optimised for constrained hosts (e.g. Oracle free tier, ~1GB RAM):
      - bare Node http (no Express) to keep the resident footprint minimal
      - map images are streamed, never buffered whole into memory
      - the bot only builds/sends snapshots while a browser is actually connected
    This is additive and read-only; it does not affect existing bot behaviour.
*/

const Http = require('http');
const Fs = require('fs');
const Path = require('path');
const { WebSocketServer } = require('ws');

const PUBLIC_DIR = Path.join(__dirname, '..', 'web', 'public');
const MAPS_DIR = Path.join(__dirname, '..', '..', 'maps');

let httpServer = null;
let wss = null;

/* Latest snapshot per guildId, so newly-connected browsers immediately get current state. */
const latestByGuild = new Object();

function start(client, port) {
    if (httpServer) return; /* already started */

    httpServer = Http.createServer(handleRequest);
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        try {
            ws.send(JSON.stringify({ type: 'init', guilds: Object.values(latestByGuild) }));
        }
        catch (e) { /* ignore */ }
    });

    httpServer.on('error', (e) => {
        client.log('WEB', `Web UI server error: ${e && e.message}`, 'error');
    });

    httpServer.listen(port, () => {
        client.log('WEB', `Live map Web UI running at http://localhost:${port}`);
    });
}

function handleRequest(req, res) {
    const url = req.url.split('?')[0];

    if (url === '/' || url === '/index.html') {
        return streamFile(res, Path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
    }

    /* Clean (marker-less) map image per guild - used as the canvas background. */
    const mapMatch = url.match(/^\/map\/(\d+)$/);
    if (mapMatch) {
        return streamFile(res, Path.join(MAPS_DIR, `${mapMatch[1]}_map_clean.png`), 'image/png');
    }

    if (url === '/api/guilds') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(Object.values(latestByGuild).map((d) => ({
            guildId: d.guildId,
            serverName: d.serverName
        }))));
    }

    res.writeHead(404);
    res.end();
}

/* Stream a file to the response (never buffers the whole file in memory). */
function streamFile(res, filePath, contentType) {
    const stream = Fs.createReadStream(filePath);
    stream.on('error', () => { res.writeHead(404); res.end(); });
    stream.once('open', () => {
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    });
    stream.pipe(res);
}

/* True only while at least one browser is connected - lets the bot skip snapshot work. */
function hasClients() {
    if (!wss) return false;
    for (const ws of wss.clients) {
        if (ws.readyState === 1 /* OPEN */) return true;
    }
    return false;
}

/* Push a fresh snapshot for a guild to all connected browsers. */
function broadcast(guildId, snapshot) {
    latestByGuild[guildId] = snapshot;
    if (!wss) return;

    const payload = JSON.stringify({ type: 'update', ...snapshot });
    for (const ws of wss.clients) {
        if (ws.readyState === 1 /* OPEN */) {
            try { ws.send(payload); } catch (e) { /* ignore */ }
        }
    }
}

/* Build a snapshot from a RustPlus instance + the raw poll responses. */
function buildSnapshot(rustplus, teamInfo, mapMarkers) {
    const map = rustplus.map;
    const info = rustplus.info;
    if (!map || !info) return null;

    const members = (teamInfo && teamInfo.members) ? teamInfo.members : [];
    const markers = (mapMarkers && mapMarkers.markers) ? mapMarkers.markers : [];
    const serverName = rustplus.serverName ||
        (rustplus.logger && rustplus.logger.serverName) || null;

    return {
        guildId: rustplus.guildId,
        serverName: serverName,
        meta: {
            width: map.width,
            height: map.height,
            oceanMargin: map.oceanMargin,
            mapSize: info.correctedMapSize || info.mapSize
        },
        players: members.map((m) => ({
            steamId: m.steamId.toString(),
            name: m.name,
            x: m.x,
            y: m.y,
            isOnline: m.isOnline,
            isAlive: m.isAlive,
            spawnTime: m.spawnTime,
            deathTime: m.deathTime
        })),
        markers: markers.map((mk) => ({
            id: mk.id,
            type: mk.type,
            x: mk.x,
            y: mk.y,
            steamId: mk.steamId ? mk.steamId.toString() : null,
            name: mk.name || null,
            rotation: mk.rotation
        }))
    };
}

module.exports = { start, broadcast, buildSnapshot, hasClients };
