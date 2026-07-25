/*
    Copyright (C) 2026 rustplusplus contributors

    Live map Web UI server. Serves a browser page that renders the Rust map with real-time
    team member positions and event markers (cargo ship, patrol helicopter, chinook, crates,
    vending machines, ...). Data is pushed over a WebSocket from the bot's polling loop.

    This is additive and read-only; it does not affect existing bot behaviour.
*/

const Express = require('express');
const Http = require('http');
const Path = require('path');
const { WebSocketServer } = require('ws');

let httpServer = null;
let wss = null;

/* Latest snapshot per guildId, so newly-connected browsers immediately get current state. */
const latestByGuild = new Object();

function start(client, port) {
    if (httpServer) return; /* already started */

    const app = Express();

    /* Static frontend. */
    app.use('/', Express.static(Path.join(__dirname, '..', 'web', 'public')));

    /* Clean (marker-less) map image per guild - used as the canvas background. */
    app.get('/map/:guildId', (req, res) => {
        const guildId = String(req.params.guildId).replace(/[^0-9]/g, '');
        const file = Path.join(__dirname, '..', '..', 'maps', `${guildId}_map_clean.png`);
        res.sendFile(file, (err) => { if (err) res.status(404).end(); });
    });

    /* List the guilds/servers that currently have live data. */
    app.get('/api/guilds', (req, res) => {
        res.json(Object.values(latestByGuild).map((d) => ({
            guildId: d.guildId,
            serverName: d.serverName
        })));
    });

    httpServer = Http.createServer(app);
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        /* Send the current snapshot for every active guild right away. */
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

module.exports = { start, broadcast, buildSnapshot };
