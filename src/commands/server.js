const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle
  } = require('discord.js');
  
  module.exports = {
	name: 'servers',
  
	getData(client, guildId) {
	  return new SlashCommandBuilder()
		.setName('servers')
		.setDescription('모든 서버 목록을 보고 선택해서 나가기');
	},
  
	async execute(client, interaction) {
	  if (!client.isDeveloper(interaction)) {
		return interaction.reply({ content: '권한이 없습니다.', ephemeral: true });
	  }
  
	  const allGuilds = client.guilds.cache.map(g => ({
		name: g.name,
		id: g.id,
		memberCount: g.memberCount
	  }));
  
	  const pageSize = 25;
	  let currentPage = 0;
	  const maxPage = Math.floor((allGuilds.length - 1) / pageSize);
  
	  const getSelectMenu = (page) => {
		const start = page * pageSize;
		const end = start + pageSize;
		const options = allGuilds.slice(start, end).map(guild => ({
		  label: guild.name.slice(0, 100),
		  description: `멤버: ${guild.memberCount}`,
		  value: guild.id
		}));
  
		return new ActionRowBuilder().addComponents(
		  new StringSelectMenuBuilder()
			.setCustomId(`select_guild_${page}`)
			.setPlaceholder(`서버 선택 (페이지 ${page + 1}/${maxPage + 1})`)
			.addOptions(options)
		);
	  };
  
	  const getPageButtons = (page) => {
		return new ActionRowBuilder().addComponents(
		  new ButtonBuilder()
			.setCustomId('prev_page')
			.setLabel('⬅ 이전')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page === 0),
		  new ButtonBuilder()
			.setCustomId('next_page')
			.setLabel('다음 ➡')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page === maxPage)
		);
	  };
  
	  const message = await interaction.reply({
		content: '서버 목록을 불러오는 중...',
		fetchReply: true,
		ephemeral: true
	  });
  
	  const updatePage = async (page) => {
		currentPage = page;
		await interaction.editReply({
		  content: `서버 목록 (페이지 ${page + 1}/${maxPage + 1})`,
		  components: [getSelectMenu(page), getPageButtons(page)]
		});
	  };
  
	  await updatePage(currentPage);
  
	  const collector = message.createMessageComponentCollector({
		time: 60000,
		filter: i => i.user.id === interaction.user.id
	  });
  
	  collector.on('collect', async (i) => {
		if (i.isButton()) {
		  if (i.customId === 'next_page' && currentPage < maxPage) {
			await i.deferUpdate();
			await updatePage(currentPage + 1);
		  } else if (i.customId === 'prev_page' && currentPage > 0) {
			await i.deferUpdate();
			await updatePage(currentPage - 1);
		  }
		  return;
		}
  
if (i.isStringSelectMenu()) {
	const guildId = i.values[0];
	const guild = client.guilds.cache.get(guildId);

	if (!guild) {
		await i.reply({ content: '해당 서버를 찾을 수 없습니다.', ephemeral: true });
		return;
	}

	await guild.members.fetch();

	const sampleMembers = guild.members.cache
		.filter(m => !m.user.bot)
		.first(10)
		.map(m => `• ${m.user.tag} (${m.id})`)
		.join('\n') || '표시할 멤버가 없습니다.';

	const embed = new EmbedBuilder()
		.setTitle('서버 정보')
		.addFields(
			{ name: '서버 이름', value: guild.name, inline: true },
			{ name: '서버 ID', value: guild.id, inline: true },
			{ name: '멤버 수', value: `${guild.memberCount}`, inline: true },
			{ name: '샘플 멤버 목록', value: sampleMembers }
		)
		.setFooter({ text: '정말 이 서버에서 나가시겠습니까?' });

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`confirm_leave_${guildId}`)
			.setLabel('이 서버에서 나가기')
			.setStyle(ButtonStyle.Danger)
	);

	await i.reply({ embeds: [embed], components: [row], ephemeral: true });
}

  
		if (i.isButton() && i.customId.startsWith('confirm_leave_')) {
		  const guildId = i.customId.split('confirm_leave_')[1];
		  const guild = client.guilds.cache.get(guildId);
  
		  if (!guild) {
			await i.reply({ content: '서버를 찾을 수 없습니다.', ephemeral: true });
			return;
		  }
  
		  await i.reply({ content: `\`${guild.name}\` 서버에서 나갑니다.`, ephemeral: true });
		  await guild.leave();
		  collector.stop();
		}
	  });
  
	  collector.on('end', async () => {
		try {
		  await interaction.editReply({
			content: '서버 선택이 종료되었습니다.',
			components: []
		  });
		} catch (e) {}
	  });
	}
  };
  