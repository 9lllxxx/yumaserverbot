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
const GUILD_ID = process.env.GUILD_ID; // 必要なら設定（グローバルコマンドにするなら不要）

const DATA_FILE = path.join(__dirname, 'userData.json');

let userData = {};
try {
  const data = await fs.readFile(DATA_FILE, 'utf8');
  userData = JSON.parse(data);
} catch (err) {
  if (err.code !== 'ENOENT') console.error('データ読み込みエラー:', err);
}

const vipLevels = [
  { name: 'VIP1',   messages: 500   },
  { name: 'VIP2',   messages: 1000  },
  { name: 'VIP2.5', messages: 1700  },
  { name: 'VIP3',   messages: 2500  },
  { name: 'VIP3.5', messages: 3700  },
  { name: 'VIP4',   messages: 5000  },
  { name: 'VIP4.5', messages: 6300  },
  { name: 'VIP5',   messages: 7500  },
  { name: 'VIP5.5', messages: 8700  },
  { name: 'VIP6',   messages: 10000 },
  { name: 'VIP7',   messages: 15000 },
  { name: 'VIP8',   messages: 20000 },
  { name: 'VIP9',   messages: 25000 },
  { name: 'VIP10',  messages: 30000 },
  { name: 'VIP11',  messages: 35000 },
  { name: 'VIP12',  messages: 40000 }
];

const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('認証パネルを作成します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('rolepanel')
    .setDescription('ロールパネルを作成します（最大17個）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`ログイン完了: ${client.user.tag}`);

  try {
    // ギルドコマンドとして登録（おすすめ）
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('ギルドコマンド登録完了');
    
    // もしくはグローバルコマンド（反映に最大1時間かかる）
    // await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  } catch (error) {
    console.error(error);
  }
});

// インタラクション処理（前回のコードをESMに変換したもの）
client.on('interactionCreate', async interaction => {
  // ……（省略：前の回答と同じ内容をESM記法に変換したもの）……
  // 必要であれば前のコードを参考に貼り直します
});

// メッセージカウンター部分も同様にESMで
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const uid = message.author.id;
  if (!userData[uid]) {
    userData[uid] = { count: 0, level: 0 };
  }

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
    if (role) {
      await message.member.roles.add(role).catch(console.error);
    }

    // ここでレベルアップ通知などしても良い
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(userData, null, 2));
  
  // たまに進捗表示（負荷軽減のため）
  if (Math.random() < 0.08) {
    const next = levelIndex < vipLevels.length - 1 
      ? vipLevels[levelIndex + 1].messages - current 
      : 0;
      
    message.reply({
      content: `現在: **${vipLevels[levelIndex].name}**\n${
        next > 0 ? `次のランクまであと **${next}** メッセージ` : '最高ランクです！'
      }`,
      allowedMentions: { repliedUser: false }
    }).catch(()=>{});
  }
});

client.login(TOKEN).catch(console.error);

// Render用にポートを開けておく（無料プランでスリープ回避）
import http from 'http';
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord bot is alive\n');
}).listen(process.env.PORT || 3000);
