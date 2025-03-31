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

const Builder = require('@discordjs/builders');

const DiscordEmbeds = require('../discordTools/discordEmbeds');
const DiscordTools = require('../discordTools/discordTools');
const PermissionHandler = require('../handlers/permissionHandler.js');

module.exports = {
	name: 'server',

	getData(client, guildId) {
		return new Builder.SlashCommandBuilder()
			.setName('server')
			.setDescription(client.intlGet(guildId, 'commandsRoleDesc'))
	},

	async execute(client, interaction) {
		if (!client.isDeveloper(interaction)) {
			const str = client.intlGet(interaction.guildId, 'missingPermission');
			client.interactionReply(interaction, DiscordEmbeds.getActionInfoEmbed(1, str));
			client.log(client.intlGet(null, 'warningCap'), str);
			return;
		} 
		const successMessage = client.intlGet(interaction.guildId, 'test');
		client.interactionReply(interaction, DiscordEmbeds.getActionInfoEmbed(0, successMessage));
		client.log(client.intlGet(null, 'infoCap'), successMessage);
	},
};
