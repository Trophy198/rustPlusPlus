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

const Constants = require('../util/constants.js');
const DiscordEmbeds = require('../discordTools/discordEmbeds');
const DiscordTools = require('../discordTools/discordTools');
const PermissionHandler = require('../handlers/permissionHandler.js');

const CHANNEL_CHOICES = [
	{ name: 'information', value: 'information' },
	{ name: 'servers', value: 'servers' },
	{ name: 'settings', value: 'settings' },
	{ name: 'commands', value: 'commands' },
	{ name: 'events', value: 'events' },
	{ name: 'teamchat', value: 'teamchat' },
	{ name: 'switches', value: 'switches' },
	{ name: 'switchGroups', value: 'switchGroups' },
	{ name: 'alarms', value: 'alarms' },
	{ name: 'storageMonitors', value: 'storageMonitors' },
	{ name: 'activity', value: 'activity' },
	{ name: 'trackers', value: 'trackers' }
];

module.exports = {
	name: 'role',

	getData(client, guildId) {
		return new Builder.SlashCommandBuilder()
			.setName('role')
			.setDescription(client.intlGet(guildId, 'commandsRoleDesc'))
			.addSubcommand(subcommand => subcommand
				.setName('add')
				.setDescription(client.intlGet(guildId, 'commandsRoleAddDesc'))
				.addRoleOption(option => option
					.setName('role')
					.setDescription(client.intlGet(guildId, 'commandsRoleAddRoleDesc'))
					.setRequired(true)))
			.addSubcommand(subcommand => subcommand
				.setName('remove')
				.setDescription(client.intlGet(guildId, 'commandsRoleRemoveDesc'))
				.addRoleOption(option => option
					.setName('role')
					.setDescription(client.intlGet(guildId, 'commandsRoleRemoveRoleDesc'))
					.setRequired(true)))
			.addSubcommand(subcommand => subcommand
				.setName('clear')
				.setDescription(client.intlGet(guildId, 'commandsRoleClearDesc')))
			.addSubcommand(subcommand => subcommand
				.setName('list')
				.setDescription(client.intlGet(guildId, 'commandsRoleListDesc')))
			.addSubcommandGroup(group => group
				.setName('channel')
				.setDescription(client.intlGet(guildId, 'commandsRoleChannelDesc'))
				.addSubcommand(subcommand => subcommand
					.setName('add')
					.setDescription(client.intlGet(guildId, 'commandsRoleChannelAddDesc'))
					.addStringOption(option => option
						.setName('channel')
						.setDescription(client.intlGet(guildId, 'commandsRoleChannelNameDesc'))
						.setRequired(true)
						.addChoices(...CHANNEL_CHOICES))
					.addRoleOption(option => option
						.setName('role')
						.setDescription(client.intlGet(guildId, 'commandsRoleAddRoleDesc'))
						.setRequired(true)))
				.addSubcommand(subcommand => subcommand
					.setName('remove')
					.setDescription(client.intlGet(guildId, 'commandsRoleChannelRemoveDesc'))
					.addStringOption(option => option
						.setName('channel')
						.setDescription(client.intlGet(guildId, 'commandsRoleChannelNameDesc'))
						.setRequired(true)
						.addChoices(...CHANNEL_CHOICES))
					.addRoleOption(option => option
						.setName('role')
						.setDescription(client.intlGet(guildId, 'commandsRoleRemoveRoleDesc'))
						.setRequired(true)))
				.addSubcommand(subcommand => subcommand
					.setName('clear')
					.setDescription(client.intlGet(guildId, 'commandsRoleChannelClearDesc'))
					.addStringOption(option => option
						.setName('channel')
						.setDescription(client.intlGet(guildId, 'commandsRoleChannelNameDesc'))
						.setRequired(true)
						.addChoices(...CHANNEL_CHOICES))));
	},

	async execute(client, interaction) {
		const instance = client.getInstance(interaction.guildId);

		const verifyId = Math.floor(100000 + Math.random() * 900000);
		client.logInteraction(interaction, verifyId, 'slashCommand');

		if (!await client.validatePermissions(interaction)) return;

		if (!client.isAdministrator(interaction)) {
			const str = client.intlGet(interaction.guildId, 'missingPermission');
			client.interactionReply(interaction, DiscordEmbeds.getActionInfoEmbed(1, str));
			client.log(client.intlGet(null, 'warningCap'), str);
			return;
		}

		await interaction.deferReply({ ephemeral: true });

		if (!instance.roles) instance.roles = [];
		if (!instance.channelRoles) instance.channelRoles = {};

		const subcommandGroup = interaction.options.getSubcommandGroup(false);
		const subcommand = interaction.options.getSubcommand();

		let responseStr = '';

		if (subcommandGroup === 'channel') {
			const channelName = interaction.options.getString('channel');

			if (!instance.channelRoles[channelName]) {
				instance.channelRoles[channelName] = [];
			}

			switch (subcommand) {
				case 'add': {
					const role = interaction.options.getRole('role');
					if (instance.channelRoles[channelName].includes(role.id)) {
						responseStr = client.intlGet(interaction.guildId, 'channelRoleAlreadyExists',
							{ name: role.name, channel: channelName });
						await client.interactionEditReply(interaction,
							DiscordEmbeds.getActionInfoEmbed(1, responseStr));
						return;
					}
					instance.channelRoles[channelName].push(role.id);
					client.setInstance(interaction.guildId, instance);
					responseStr = client.intlGet(interaction.guildId, 'channelRoleAdded',
						{ name: role.name, channel: channelName });
				} break;

				case 'remove': {
					const role = interaction.options.getRole('role');
					const idx = instance.channelRoles[channelName].indexOf(role.id);
					if (idx === -1) {
						responseStr = client.intlGet(interaction.guildId, 'channelRoleNotFound',
							{ name: role.name, channel: channelName });
						await client.interactionEditReply(interaction,
							DiscordEmbeds.getActionInfoEmbed(1, responseStr));
						return;
					}
					instance.channelRoles[channelName].splice(idx, 1);
					client.setInstance(interaction.guildId, instance);
					responseStr = client.intlGet(interaction.guildId, 'channelRoleRemoved',
						{ name: role.name, channel: channelName });
				} break;

				case 'clear': {
					instance.channelRoles[channelName] = [];
					client.setInstance(interaction.guildId, instance);
					responseStr = client.intlGet(interaction.guildId, 'channelRolesCleared',
						{ channel: channelName });
				} break;

				default: break;
			}
		}
		else {
			switch (subcommand) {
				case 'add': {
					const role = interaction.options.getRole('role');
					if (instance.roles.includes(role.id)) {
						responseStr = client.intlGet(interaction.guildId, 'roleAlreadyExists',
							{ name: role.name });
						await client.interactionEditReply(interaction,
							DiscordEmbeds.getActionInfoEmbed(1, responseStr));
						return;
					}
					instance.roles.push(role.id);
					client.setInstance(interaction.guildId, instance);
					responseStr = client.intlGet(interaction.guildId, 'roleAdded',
						{ name: role.name });
				} break;

				case 'remove': {
					const role = interaction.options.getRole('role');
					const idx = instance.roles.indexOf(role.id);
					if (idx === -1) {
						responseStr = client.intlGet(interaction.guildId, 'roleNotFound',
							{ name: role.name });
						await client.interactionEditReply(interaction,
							DiscordEmbeds.getActionInfoEmbed(1, responseStr));
						return;
					}
					instance.roles.splice(idx, 1);
					client.setInstance(interaction.guildId, instance);
					responseStr = client.intlGet(interaction.guildId, 'roleRemoved',
						{ name: role.name });
				} break;

				case 'clear': {
					instance.roles = [];
					client.setInstance(interaction.guildId, instance);
					responseStr = client.intlGet(interaction.guildId, 'roleCleared');
				} break;

				case 'list': {
					const globalRoleMentions = instance.roles
						.map(id => {
							const role = DiscordTools.getRole(interaction.guildId, id);
							return role ? `<@&${id}>` : null;
						})
						.filter(r => r);

					const fields = [];

					fields.push({
						name: client.intlGet(interaction.guildId, 'roleListGlobal'),
						value: globalRoleMentions.length > 0
							? globalRoleMentions.join('\n')
							: client.intlGet(interaction.guildId, 'roleListNone'),
						inline: false
					});

					const channelOverrides = [];
					for (const [ch, roleIds] of Object.entries(instance.channelRoles)) {
						if (roleIds && roleIds.length > 0) {
							const mentions = roleIds
								.map(id => {
									const role = DiscordTools.getRole(interaction.guildId, id);
									return role ? `<@&${id}>` : null;
								})
								.filter(r => r);
							if (mentions.length > 0) {
								channelOverrides.push({ channel: ch, roles: mentions });
							}
						}
					}

					if (channelOverrides.length > 0) {
						for (const override of channelOverrides) {
							fields.push({
								name: `#${override.channel}`,
								value: override.roles.join('\n'),
								inline: true
							});
						}
					}

					const embed = DiscordEmbeds.getEmbed({
						title: client.intlGet(interaction.guildId, 'roleListTitle'),
						color: Constants.COLOR_DEFAULT,
						fields: fields,
						timestamp: true
					});

					await client.interactionEditReply(interaction, {
						embeds: [embed],
						ephemeral: true
					});
					return;
				}

				default: break;
			}
		}

		client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'slashCommandValueChange', {
			id: `${verifyId}`,
			value: `${subcommandGroup ? subcommandGroup + ' ' : ''}${subcommand}`
		}));

		const guild = DiscordTools.getGuild(interaction.guildId);
		if (guild) {
			const category = await require('../discordTools/SetupGuildCategory')(client, guild);
			await require('../discordTools/SetupGuildChannels')(client, guild, category);
			await PermissionHandler.resetPermissionsAllChannels(client, guild);
		}

		await client.interactionEditReply(interaction, DiscordEmbeds.getActionInfoEmbed(0, responseStr));
		client.log(client.intlGet(null, 'infoCap'), responseStr);
	},
};
