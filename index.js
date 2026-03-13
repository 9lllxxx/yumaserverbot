import { Client, GatewayIntentBits } from 'discord.js';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import http from 'http';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;


const vipRoleIds = {
  'VIP1': '651371929915097104',
  'VIP2': '947879607061839872',
  'VIP2.5': '1310963415136862289',
  'VIP3': '1062277593925169232',
  'VIP3.5': '1310963759539556435',
  'VIP4': '948562538965114880',
  'VIP4.5': '1310963883007017091',
  'VIP5': '1074642101939212378',
  'VIP5.5': '1310964505337004063',
  'VIP6': '947878777659203646',
  'VIP7': '1066336299209994240',
  'VIP8': '950330398653685770',
  'VIP9': '1057570022148554772',
  'VIP10': '1027168795518849034',
  'VIP11': '1400298348568772781',
  'VIP12': '1400302120871133235'
};

const vipLevels = [
  { name: 'VIP1', messages: 500 },
  { name: 'VIP2', messages: 1000 },
  { name: 'VIP2.5', messages: 1700 },
  { name: 'VIP3', messages: 2500 },
  { name: 'VIP3.5', messages: 3700 },
  { name: 'VIP4', messages: 5000 },
  { name: 'VIP4.5', messages: 6300 },
  { name: 'VIP5', messages: 7500 },
  { name: 'VIP5.5', messages: 8700 },
  { name: 'VIP6', messages: 10000 },
  { name: 'VIP7', messages: 15000 },
  { name: 'VIP8', messages: 20000 },
  { name: 'VIP9', messages: 25000 },
  { name: 'VIP10', messages: 30000 },
  { name: 'VIP11', messages: 35000 },
  { name: 'VIP12', messages: 40000 }
];


async function fetchMessageCount(userId) {
  try {
    const res = await fetch(
      `https://discord.com/api/v9/guilds/${GUILD_ID}/messages/search?author_id=${userId}`,
      { headers: { Authorization: `Bot ${TOKEN}` } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.total_results ?? 0;
  } catch {
    return null;
  }
}


client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (message.content.trim() !== '!vip確認') return;

  const uid = message.author.id;

  const currentMessages = await fetchMessageCount(uid);

  if (currentMessages === null) {
    await message.reply({
      content: '⚠ 発言数を取得できませんでした。時間をおいて再実行してください。',
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  let currentLevelIndex = 0;
  for (let i = vipLevels.length - 1; i >= 0; i--) {
    if (currentMessages >= vipLevels[i].messages) {
      currentLevelIndex = i;
      break;
    }
  }

  const currentLevel = vipLevels[currentLevelIndex].name;

  let nextLevelName = '最高ランクです！';
  let nextNeeded = 0;
  if (currentLevelIndex < vipLevels.length - 1) {
    nextLevelName = vipLevels[currentLevelIndex + 1].name;
    nextNeeded = vipLevels[currentLevelIndex + 1].messages - currentMessages;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${message.author.username} さんのVIPレベルです！`)
    .setDescription(
      `現在 **${currentLevel}**！\n総メッセージ数: **${currentMessages}** 件\n次のVIP **${nextLevelName}** まであと **${nextNeeded}** メッセージです！`
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  let components = [];

  const targetVip = vipLevels[currentLevelIndex];
  const requiredMessages = targetVip.messages;
  const roleId = vipRoleIds[targetVip.name];
  const role = message.guild.roles.cache.get(roleId);


  if (currentMessages >= requiredMessages && role) {

    let userHighestIndex = -1;
    vipLevels.forEach((vip, index) => {
      const rid = vipRoleIds[vip.name];
      if (message.member.roles.cache.has(rid)) {
        if (index > userHighestIndex) userHighestIndex = index;
      }
    });


    if (currentLevelIndex > userHighestIndex) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vip_promote_${uid}_${role.id}`)
          .setLabel('昇格')
          .setStyle(ButtonStyle.Success)
      );
      components = [row];
    }
  }

  await message.reply({
    embeds: [embed],
    components,
    allowedMentions: { repliedUser: false }
  });
});


client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('vip_promote_')) return;

  const [, , userId, roleId] = interaction.customId.split('_');

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'あなたはこのボタンを押せません', ephemeral: true });
    return;
  }

  const newRole = interaction.guild.roles.cache.get(roleId);
  if (!newRole) {
    await interaction.reply({ content: 'ロールが見つかりません', ephemeral: true });
    return;
  }

  const member = interaction.member;

  for (const rid of Object.values(vipRoleIds)) {
    if (member.roles.cache.has(rid)) {
      await member.roles.remove(rid).catch(() => {});
    }
  }

  await member.roles.add(newRole).catch(() => {});

  await interaction.reply({
    content: `🎉 ${newRole.name} に昇格しました！`,
    ephemeral: true
  });
});


client.login(TOKEN);


http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Alive');
}).listen(process.env.PORT || 3000);
