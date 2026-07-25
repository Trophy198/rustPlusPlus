/*
    Copyright (C) 2023 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const Constants = require("../util/constants");

/* Per chat-type configuration. Team chat and clan chat share the exact same queueing/
   trademark/splitting logic, they only differ in which queue/timeout/sender they use. */
const CHAT_CONFIGS = {
    team: {
        queueKey: 'inGameChatQueue',
        timeoutKey: 'inGameChatTimeout',
        updateBotMessages: (rustplus, msg) => rustplus.updateBotMessages(msg),
        send: (rustplus, msg) => rustplus.sendTeamMessageAsync(msg),
        handlerRef: () => module.exports.inGameChatHandler,
        /* Team replies are suppressed when there is no team or everyone is offline. */
        shouldSuppress: (rustplus) => rustplus.team === null || rustplus.team.allOffline
    },
    clan: {
        queueKey: 'inGameClanChatQueue',
        timeoutKey: 'inGameClanChatTimeout',
        updateBotMessages: (rustplus, msg) => rustplus.updateClanBotMessages(msg),
        send: (rustplus, msg) => rustplus.sendClanMessageAsync(msg),
        handlerRef: () => module.exports.inGameClanChatHandler,
        /* Clan chat is independent of the bot's team, so only the mute setting suppresses it. */
        shouldSuppress: () => false
    }
};

async function chatHandler(rustplus, client, message, chatType) {
    const cfg = CHAT_CONFIGS[chatType];
    const guildId = rustplus.guildId;
    const generalSettings = rustplus.generalSettings;
    const commandDelayMs = parseInt(generalSettings.commandDelay) * 1000;
    const trademark = generalSettings.trademark;
    const trademarkString = (trademark === 'NOT SHOWING') ? '' : `${trademark} | `;
    const messageMaxLength = Constants.MAX_LENGTH_TEAM_MESSAGE - trademarkString.length;

    /* Time to write a message from the queue. If message === null, that means that its a timer call. */
    if (message === null) {
        if (rustplus[cfg.queueKey].length !== 0) {
            clearTimeout(rustplus[cfg.timeoutKey]);
            rustplus[cfg.timeoutKey] = null;

            const messageFromQueue = rustplus[cfg.queueKey][0];
            rustplus[cfg.queueKey] = rustplus[cfg.queueKey].slice(1);

            cfg.updateBotMessages(rustplus, messageFromQueue);

            cfg.send(rustplus, messageFromQueue);
            rustplus.log(client.intlGet(guildId, 'messageCap'), messageFromQueue);
        }
        else {
            clearTimeout(rustplus[cfg.timeoutKey]);
            rustplus[cfg.timeoutKey] = null;
        }
    }

    /* if there is a new message, add message to queue. */
    if (message !== null) {
        if (cfg.shouldSuppress(rustplus) || rustplus.generalSettings.muteInGameBotMessages) {
            return;
        }

        if (Array.isArray(message)) {
            for (const msg of message) {
                handleMessage(rustplus, msg, trademarkString, messageMaxLength, cfg.queueKey)
            }
        }
        else if (typeof message === 'string') {
            handleMessage(rustplus, message, trademarkString, messageMaxLength, cfg.queueKey)
        }
    }

    /* Start new timer? */
    if (rustplus[cfg.queueKey].length !== 0 && rustplus[cfg.timeoutKey] === null) {
        rustplus[cfg.timeoutKey] = setTimeout(cfg.handlerRef(), commandDelayMs, rustplus, client);
    }
}

module.exports = {
    inGameChatHandler: async function (rustplus, client, message = null) {
        return chatHandler(rustplus, client, message, 'team');
    },

    inGameClanChatHandler: async function (rustplus, client, message = null) {
        return chatHandler(rustplus, client, message, 'clan');
    },
};

function handleMessage(rustplus, message, trademarkString, maxLength, queueKey) {
    if (typeof message !== 'string') return;

    const strings = message.match(new RegExp(`.{1,${maxLength}}(\\s|$)`, 'g'));

    for (const str of strings) {
        rustplus[queueKey].push(`${trademarkString}${str}`);
    }
}
