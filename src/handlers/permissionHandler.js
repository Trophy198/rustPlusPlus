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

const Discord = require('discord.js');

const DiscordTools = require('../discordTools/discordTools.js');

function getEffectiveRoles(instance, channelName) {
    if (channelName && instance.channelRoles &&
        instance.channelRoles[channelName] &&
        instance.channelRoles[channelName].length > 0) {
        return instance.channelRoles[channelName];
    }
    return instance.roles || [];
}

function getAllRoleIds(instance) {
    const allRoles = new Set(instance.roles || []);
    if (instance.channelRoles) {
        for (const roles of Object.values(instance.channelRoles)) {
            roles.forEach(r => allRoles.add(r));
        }
    }
    return [...allRoles];
}

module.exports = {
    getPermissionsReset: function (client, guild, permissionWrite = false, channelName = null) {
        const instance = client.getInstance(guild.id);

        const perms = [];

        const roleIds = channelName === null
            ? getAllRoleIds(instance)
            : getEffectiveRoles(instance, channelName);

        const validRoleIds = roleIds.filter(id => guild.roles.cache.has(id));

        if (validRoleIds.length > 0) {
            perms.push({
                id: guild.roles.everyone.id,
                deny: [Discord.PermissionFlagsBits.ViewChannel, Discord.PermissionFlagsBits.SendMessages]
            });

            for (const roleId of validRoleIds) {
                const roleAllow = [Discord.PermissionFlagsBits.ViewChannel];
                const roleDeny = [];

                if (permissionWrite) {
                    roleAllow.push(Discord.PermissionFlagsBits.SendMessages);
                }
                else {
                    roleDeny.push(Discord.PermissionFlagsBits.SendMessages);
                }

                const entry = { id: roleId, allow: roleAllow };
                if (roleDeny.length > 0) {
                    entry.deny = roleDeny;
                }
                perms.push(entry);
            }
        }
        else {
            const everyoneAllow = [Discord.PermissionFlagsBits.ViewChannel];
            const everyoneDeny = [];

            if (permissionWrite) {
                everyoneAllow.push(Discord.PermissionFlagsBits.SendMessages);
            }
            else {
                everyoneDeny.push(Discord.PermissionFlagsBits.SendMessages);
            }

            perms.push({ id: guild.roles.everyone.id, allow: everyoneAllow, deny: everyoneDeny });
        }

        for (const discordId of instance.blacklist['discordIds']) {
            perms.push({
                id: discordId,
                deny: [Discord.PermissionFlagsBits.ViewChannel, Discord.PermissionFlagsBits.SendMessages]
            });
        }

        return perms;
    },

    getPermissionsRemoved: function (client, guild) {
        const instance = client.getInstance(guild.id);

        const perms = [];

        const allRoles = getAllRoleIds(instance);
        for (const roleId of allRoles) {
            if (guild.roles.cache.has(roleId)) {
                perms.push({
                    id: roleId,
                    deny: [Discord.PermissionFlagsBits.ViewChannel, Discord.PermissionFlagsBits.SendMessages]
                });
            }
        }

        perms.push({
            id: guild.roles.everyone.id,
            deny: [Discord.PermissionFlagsBits.ViewChannel, Discord.PermissionFlagsBits.SendMessages]
        });

        return perms;
    },

    resetPermissionsAllChannels: async function (client, guild) {
        const instance = client.getInstance(guild.id);

        if (instance.channelId.category === null) return;

        const category = await DiscordTools.getCategoryById(guild.id, instance.channelId.category);
        if (category) {
            const perms = module.exports.getPermissionsReset(client, guild);
            try {
                await category.permissionOverwrites.set(perms);
            }
            catch (e) {
                /* Ignore */
            }
        }

        for (const [name, id] of Object.entries(instance.channelId)) {
            if (name === 'category') continue;

            const writePerm = (name === 'commands' || name === 'teamchat');

            const channel = DiscordTools.getTextChannelById(guild.id, id);
            if (channel) {
                const perms = module.exports.getPermissionsReset(client, guild, writePerm, name);
                try {
                    await channel.permissionOverwrites.set(perms);
                }
                catch (e) {
                    /* Ignore */
                }
            }
        }
    },
}
