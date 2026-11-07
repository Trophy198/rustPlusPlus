/*
    Rust+ relay connection probe.

    Since the 2026-11-05 Rust update ("RustRelay - use Fleck instead of websocket-sharp"),
    direct ws://<ip>:<app.port> connections are dropped. Clients now connect through the
    Facepunch relay:

        wss://companion-rust.facepunch.com/socket/<serverId>?v=<ms>
        subprotocols: ["rustplus.auth.v1", base64url(<rust+ auth token>)]
        origin:       https://app.playrust.com

    The auth token is read from .env (RPP_TEST_AUTH_TOKEN) so it never needs to be pasted
    anywhere. Pairing data (playerId/playerToken) is read from the local instance file.

    Usage (from repo root):
        node scripts/rustRelayProbe.js [serverId] [guildId] [serverKey]
*/

const Path = require('path');
const WebSocket = require('ws');
const protobuf = require('@liamcottle/rustplus.js/node_modules/protobufjs');

const ROOT = Path.join(__dirname, '..');

try { process.loadEnvFile(Path.join(ROOT, '.env')); } catch (e) { /* no .env */ }
const authToken = process.env.RPP_TEST_AUTH_TOKEN;
if (!authToken) {
    console.log('[probe] RPP_TEST_AUTH_TOKEN missing in .env');
    process.exit(1);
}

/* Defaults: JumpRust (server id from the July pairing notification) on the test guild */
const serverId = process.argv[2] || '1b9d61c5-7062-4bd5-8752-20d24508e843';
const guildId = process.argv[3] || '1234481514058743878';
const serverKey = process.argv[4] || '162.222.17.246-30070';

const instance = require(Path.join(ROOT, 'instances', `${guildId}.json`));
const server = instance.serverList[serverKey];
if (!server) {
    console.log(`[probe] server '${serverKey}' not found in instances/${guildId}.json`);
    process.exit(1);
}
const playerId = server.steamId;
const playerToken = Number(server.playerToken);

const b64url = (str) => Buffer.from(str, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const url = `wss://companion-rust.facepunch.com/socket/${serverId}?v=${Date.now()}`;

console.log(`[probe] serverId=${serverId} playerId=${playerId} authToken(len)=${authToken.length}`);

const protoPath = Path.join(ROOT, 'node_modules', '@liamcottle', 'rustplus.js', 'rustplus.proto');
protobuf.load(protoPath).then((root) => {
    const AppRequest = root.lookupType('rustplus.AppRequest');
    const AppMessage = root.lookupType('rustplus.AppMessage');

    const ws = new WebSocket(url, ['rustplus.auth.v1', b64url(authToken)], {
        origin: 'https://app.playrust.com'
    });

    ws.on('unexpected-response', (req, res) => {
        console.log(`[probe] HTTP ${res.statusCode} ${res.statusMessage} (handshake rejected)`);
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
            if (body) console.log('[probe] body:', body.slice(0, 300));
            process.exit(2);
        });
    });

    ws.on('open', () => {
        console.log(`[probe] ✅ WebSocket OPEN (subprotocol=${ws.protocol})`);
        const req = AppRequest.create({ seq: 1, playerId, playerToken, getInfo: {} });
        ws.send(AppRequest.encode(req).finish());
        console.log('[probe] sent getInfo');
    });

    ws.on('message', (data) => {
        try {
            const msg = AppMessage.decode(data);
            if (msg.response && msg.response.info) {
                const i = msg.response.info;
                console.log(`[probe] ✅ getInfo OK: name="${i.name}" players=${i.players}/${i.maxPlayers} mapSize=${i.mapSize}`);
            }
            else if (msg.response && msg.response.error) {
                console.log(`[probe] ⚠ server error: ${JSON.stringify(msg.response.error)}`);
            }
            else {
                console.log('[probe] message:', JSON.stringify(msg).slice(0, 200));
            }
        }
        catch (e) {
            console.log('[probe] decode failed:', e.message, 'len', data.length);
        }
        ws.close();
        setTimeout(() => process.exit(0), 300);
    });

    ws.on('close', (code, reason) => console.log(`[probe] closed code=${code} reason=${reason}`));
    ws.on('error', (e) => console.log('[probe] ws error:', e.message));

    setTimeout(() => { console.log('[probe] timeout (10s)'); process.exit(3); }, 10000);
});
