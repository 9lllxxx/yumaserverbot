import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  PermissionFlagsBits
} from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const DATA_FILE = path.join(__dirname, 'userData.json');
const WELCOME_CHANNEL_ID = '1230699162786598923';

let userData = {};
try {
  const data = await fs.readFile(DATA_FILE, 'utf8');
  userData = JSON.parse(data);
} catch (err) {
  if (err.code !== 'ENOENT') console.error(err);
}

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

const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('認証パネルを作成')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('rolepanel')
    .setDescription('ロールパネルを作成（最大17個）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`Logged in: ${client.user.tag}`);
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log(`Guild commands registered: ${data.length} commands`);
  } catch (error) {
    console.error('Command register error:', error);
  }
});


// =============================
// ⭐ メッセージ検索APIで発言数取得
// =============================
async function fetchMessageCount(userId) {
  const url = `https://discord.com/api/v9/guilds/${GUILD_ID}/messages/search?author_id=${userId}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${TOKEN}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("API error:", data);
      return null;
    }

    return data.total_results ?? 0;
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

client.on('guildMemberAdd', async member => {
  if (!member.guild) return;
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const now = new Date();
  const dateStr = `${now.getFullYear()} ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('ようこそ！')
    .setDescription(`<@${member.id}> さんがサーバーに参加しました。\n\n※改造の質問はhttps://discord.com/channels/634719150434156546/1069167712556830760で行ってください！`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setFooter({ text: `参加日時: ${dateStr}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberRemove', async member => {
  if (!member.guild) return;
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('さようなら...')
    .setDescription(`<@${member.id}> さんがサーバーから退出しました。`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isRoleSelectMenu()) return;

  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'verify') {
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId('verify_role_select')
            .setPlaceholder('ロールを選択')
            .setMinValues(1)
            .setMaxValues(1)
        );
        await interaction.reply({ content: 'ロールを選択', components: [row], ephemeral: true });
      }

      if (interaction.commandName === 'rolepanel') {
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId('role_panel_select')
            .setPlaceholder('最大17個')
            .setMinValues(1)
            .setMaxValues(17)
        );
        await interaction.reply({ content: 'ロールを選択', components: [row], ephemeral: true });
      }
    }

    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId === 'verify_role_select') {
        const roleId = interaction.values[0];
        const embed = new EmbedBuilder().setTitle('認証パネル').setDescription('ボタンを押して認証').setColor(0x00FF00);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`verify_btn_${roleId}`).setLabel('認証').setStyle(ButtonStyle.Success)
        );
        await interaction.update({ content: '作成しました', components: [] });
        await interaction.channel.send({ embeds: [embed], components: [row] });
      }

      if (interaction.customId === 'role_panel_select') {
        const roles = interaction.values;
        const embed = new EmbedBuilder().setTitle('ロールパネル').setDescription('ボタンを押して取得').setColor(0x5865F2);
        const rows = [];
        let current = new ActionRowBuilder();
        for (const id of roles) {
          if (current.components.length === 5) {
            rows.push(current);
            current = new ActionRowBuilder();
          }
          current.addComponents(
            new ButtonBuilder().setCustomId(`role_btn_${id}`).setLabel(`<@&${id}>`).setStyle(ButtonStyle.Secondary)
          );
        }
        if (current.components.length) rows.push(current);
        await interaction.update({ content: '作成しました', components: [] });
        await interaction.channel.send({ embeds: [embed], components: rows });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('verify_btn_')) {
        const roleId = interaction.customId.replace('verify_btn_', '');
        await interaction.member.roles.add(roleId);
        await interaction.reply({ content: '認証完了', ephemeral: true });
      }
      if (interaction.customId.startsWith('role_btn_')) {
        const roleId = interaction.customId.replace('role_btn_', '');
        await interaction.member.roles.add(roleId);
        await interaction.reply({ content: 'ロール付与完了', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    if (!interaction.replied) await interaction.reply({ content: 'エラー', ephemeral: true }).catch(() => {});
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const uid = message.author.id;
  if (!userData[uid]) userData[uid] = { count: 0, level: 0 };

  userData[uid].count += 1;

  await fs.writeFile(DATA_FILE, JSON.stringify(userData, null, 2)).catch(console.error);

  // =============================
  // ⭐ API版 VIP確認
  // =============================
  if (message.content.trim() === '!vip確認') {

    const currentMessages = await fetchMessageCount(uid);

    if (currentMessages === null) {
      await message.reply("発言数の取得に失敗しました").catch(console.error);
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
      .setDescription(`現在 **${currentLevel}**！\n総メッセージ数: **${currentMessages}** 件\n次のVIP **${nextLevelName}** まであと **${nextNeeded}** メッセージです！\n\nVIP申請はこちら→ https://discord.com/channels/634719150434156546/1266966291651231888`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(console.error);
    return;
  }
});

client.login(TOKEN).catch(err => {
  console.error('Login failed:', err);
  process.exit(1);
});

import http from 'http';
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Alive');
}).listen(process.env.PORT || 3000);
