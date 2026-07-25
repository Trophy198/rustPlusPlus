/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

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

const SmartAlarmHandler = require('./smartAlarmHandler.js');
const SmartSwitchGroupHandler = require('./smartSwitchGroupHandler.js');
const SmartSwitchHandler = require('./smartSwitchHandler.js');

module.exports = {
    inGameCommandHandler: async function (rustplus, client, message) {
        const guildId = rustplus.guildId;
        const instance = client.getInstance(guildId);

        /* Commands can arrive from either team chat or clan chat. Normalize the source so the
           rest of the handler is chat-agnostic and responses are routed back to the same chat. */
        const chatType = message.broadcast.hasOwnProperty('clanMessage') ? 'clan' : 'team';
        const chatMessage = chatType === 'clan'
            ? message.broadcast.clanMessage.message
            : message.broadcast.teamMessage.message;
        const respond = (msg) => rustplus.sendInGameMessage(msg, chatType);

        let command = chatMessage.message;
        for (const alias of instance.aliases) {
            command = command.replace(alias.alias, alias.value);
        }

        const callerSteamId = chatMessage.steamId.toString();
        const callerName = chatMessage.name;
        const commandLowerCase = command.toLowerCase();
        const prefix = rustplus.generalSettings.prefix;

        if (!rustplus.isOperational) {
            return false;
        }
        else if (!rustplus.generalSettings.inGameCommandsEnabled) {
            return false;
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxAfk')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxAfk')}`) {
            respond(rustplus.getCommandAfk());
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxAlive')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxAlive')}`)) {
            respond(rustplus.getCommandAlive(command));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxCargo')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxCargo')}`) {
            respond(rustplus.getCommandCargo());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxChinook')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxChinook')}`) {
            respond(rustplus.getCommandChinook());
        }
        else if ((commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxConnection')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxConnections')}`)) ||
            (commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxConnection')} `) ||
                commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxConnections')}`))) {
            respond(rustplus.getCommandConnection(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxCraft')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxCraft')}`)) {
            respond(rustplus.getCommandCraft(command));
        }
        else if ((commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxDeath')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxDeaths')}`)) ||
            (commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxDeath')} `) ||
                commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxDeaths')}`))) {
            respond(await rustplus.getCommandDeath(command, callerSteamId));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxDecay')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxDecay')}`)) {
            respond(rustplus.getCommandDecay(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxDespawn')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxDespawn')}`)) {
            respond(rustplus.getCommandDespawn(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxEvents')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxEvents')}`)) {
            respond(rustplus.getCommandEvents(command));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxHeli')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxHeli')}`) {
            respond(rustplus.getCommandHeli());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxLarge')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxLarge')}`) {
            respond(rustplus.getCommandLarge());
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxLeader')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxLeader')}`)) {
            respond(await rustplus.getCommandLeader(command, callerSteamId));
        }
        else if ((commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxMarker')} `) ||
            commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxMarkers')}`) ||
            (commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxMarker')} `) ||
                commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxMarkers')}`)) {
            respond(await rustplus.getCommandMarker(command, callerSteamId));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxMarket')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxMarket')} `)) {
                let response = rustplus.getCommandMarket(command);
                if (typeof response === 'string' && response.length > 0) {
                    respond(response);
                }
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxMute')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxMute')}`) {
            respond(rustplus.getCommandMute());
        }
        else if ((commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxNote')} `) ||
            commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxNotes')}`) ||
            (commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxNote')} `) ||
                commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxNotes')}`)) {
            respond(rustplus.getCommandNote(command));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxOffline')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxOffline')}`) {
            respond(rustplus.getCommandOffline());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxOnline')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxOnline')}`) {
            respond(rustplus.getCommandOnline());
        }
        else if ((commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxPlayer')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxPlayers')}`)) ||
            (commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxPlayer')} `) ||
                commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxPlayers')}`))) {
            respond(rustplus.getCommandPlayer(command));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxPop')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxPop')}`) {
            respond(rustplus.getCommandPop());
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxProx')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxProx')}`)) {
            respond(await rustplus.getCommandProx(command, callerSteamId));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxRecycle')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxRecycle')}`)) {
            respond(rustplus.getCommandRecycle(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxResearch')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxResearch')}`)) {
            respond(rustplus.getCommandResearch(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxSend')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxSend')} `)) {
            respond(await rustplus.getCommandSend(command, callerName));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxSmall')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxSmall')}`) {
            respond(rustplus.getCommandSmall());
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxStack')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxStack')}`)) {
            respond(await rustplus.getCommandStack(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxSteamid')}`) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxSteamid')}`)) {
            respond(await rustplus.getCommandSteamId(command, callerSteamId, callerName));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxTeam')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxTeam')}`) {
            respond(rustplus.getCommandTeam());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxTime')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxTime')}`) {
            respond(rustplus.getCommandTime());
        }
        else if ((commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxTimer')} `) ||
            commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxTimers')}`) ||
            (commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxTimer')} `) ||
                commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxTimers')}`)) {
            respond(rustplus.getCommandTimer(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxTranslateTo')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxTranslateTo')} `)) {
            respond(await rustplus.getCommandTranslateTo(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxTranslateFromTo')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxTranslateFromTo')} `)) {
            respond(await rustplus.getCommandTranslateFromTo(command));
        }
        else if (commandLowerCase.startsWith(`${prefix}${client.intlGet('en', 'commandSyntaxTTS')} `) ||
            commandLowerCase.startsWith(`${prefix}${client.intlGet(guildId, 'commandSyntaxTTS')} `)) {
            respond(await rustplus.getCommandTTS(command, callerName));
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxUnmute')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxUnmute')}`) {
            respond(rustplus.getCommandUnmute());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxUpkeep')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxUpkeep')}`) {
            respond(rustplus.getCommandUpkeep());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxUptime')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxUptime')}`) {
            respond(rustplus.getCommandUptime());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxWipe')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxWipe')}`) {
            respond(rustplus.getCommandWipe());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxTravelingVendor')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxTravelingVendor')}`) {
            respond(rustplus.getCommandTravelingVendor());
        }
        else if (commandLowerCase === `${prefix}${client.intlGet('en', 'commandSyntaxDeepSea')}` ||
            commandLowerCase === `${prefix}${client.intlGet(guildId, 'commandSyntaxDeepSea')}`) {
            rustplus.sendInGameMessage(rustplus.getCommandDeepSea());
        }
        else {
            /* Maybe a custom command? */

            if (SmartAlarmHandler.smartAlarmCommandHandler(rustplus, client, command)) {
                rustplus.logInGameCommand('Smart Alarm', message);
                return true;
            }

            if (await SmartSwitchHandler.smartSwitchCommandHandler(rustplus, client, command)) {
                rustplus.logInGameCommand('Smart Switch', message);
                return true;
            }

            if (await SmartSwitchGroupHandler.smartSwitchGroupCommandHandler(rustplus, client, command)) {
                rustplus.logInGameCommand('Smart Switch Group', message);
                return true;
            }

            return false;
        }

        rustplus.logInGameCommand('Default', message);

        return true;
    },
};
