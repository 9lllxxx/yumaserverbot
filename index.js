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
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Guild commands registered');
  } catch (error) {
    console.error('Command register error:', error);
  }
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
  const current = userData[uid].count;
  let levelIndex = userData[uid].level;

  while (levelIndex < vipLevels.length - 1 && current >= vipLevels[levelIndex + 1].messages) {
    levelIndex++;
  }

  if (levelIndex > userData[uid].level) {
    userData[uid].level = levelIndex;
    const roleName = vipLevels[levelIndex].name;
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (role) await message.member.roles.add(role).catch(console.error);
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(userData, null, 2)).catch(console.error);

  if (Math.random() < 0.08) {
    const next = levelIndex < vipLevels.length - 1 ? vipLevels[levelIndex + 1].messages - current : 0;
    message.reply({
      content: `現在: **${vipLevels[levelIndex].name}**\n${next > 0 ? `次まで: ${next}メッセージ` : '最高ランク'}`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
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
