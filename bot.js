const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const express = require('express');
const app = express();

// === CONFIGURATION ===
const BOT_TOKEN = '7861502352:AAHnJW2xDIZ6DL1khVo1Hw4mXvNYG5pa4pM'; // Replace with your Bot Token
const CHANNEL_ID = '-1001001991464977'; // Private channel ID for storing files
const JOIN_CHANNELS = ['-1001001991464977']; // Private channel IDs for force-subscription
const PORT = process.env.PORT || 3000;
// ======================

const bot = new Telegraf(BOT_TOKEN);
const fileStorage = {};

// Generate random ID
function generateRandomId() {
  return crypto.randomBytes(5).toString('hex');
}

// Force subscription check
async function isUserInAllChannels(ctx) {
  const userId = ctx.from.id;
  for (const channelId of JOIN_CHANNELS) {
    try {
      const member = await ctx.telegram.getChatMember(channelId, userId);
      if (!['member', 'administrator', 'creator'].includes(member.status)) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

// Get HTML links for join channels
function getJoinLinksHTML() {
  return JOIN_CHANNELS.map(id => `<a href="https://t.me/c/${id.replace('-100', '')}">Join Channel</a>`).join('\n');
}

// /start handler
bot.start(async (ctx) => {
  const args = ctx.message.text.split(" ");

  if (!(await isUserInAllChannels(ctx))) {
    return ctx.reply(
      `To use this bot, please join the required channel(s):\n${getJoinLinksHTML()}`,
      { parse_mode: 'HTML', disable_web_page_preview: true }
    );
  }

  if (args.length > 1) {
    const fileId = args[1];
    const fileData = fileStorage[fileId];
    if (fileData) {
      return ctx.replyWithDocument(fileData.file_id, {
        caption: `File Name: ${fileData.file_name}\nFile Size: ${fileData.file_size}`
      });
    } else {
      return ctx.reply("Invalid file link or the file does not exist.");
    }
  }

  ctx.reply(
    "Welcome to the <b>Secure File Storage Bot!</b>\n\n" +
    "<b>Instructions:</b>\n" +
    "1. Send me any file, photo, video, or sticker.\n" +
    "2. I will securely store it and generate a unique link for access.\n" +
    "3. Use the link to retrieve the file anytime.\n" +
    "4. Your files are stored securely and privately.",
    { parse_mode: 'HTML' }
  );
});

// File/media handler
bot.on(['document', 'photo', 'video', 'audio', 'sticker'], async (ctx) => {
  try {
    // Check if user has joined required channels
    if (!(await isUserInAllChannels(ctx))) {
      return ctx.reply(
        `To use this bot, please join the required channel(s):\n${getJoinLinksHTML()}`,
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
    }

    // Forward to private channel
    await ctx.telegram.forwardMessage(
      CHANNEL_ID,
      ctx.chat.id,
      ctx.message.message_id
    );

    const randomId = generateRandomId();
    let file_id = '';
    let file_name = 'Unknown';
    let file_size = 'Unknown';
    const msg = ctx.message;

    if (msg.document) {
      file_id = msg.document.file_id;
      file_name = msg.document.file_name;
      file_size = `${(msg.document.file_size / 1024).toFixed(2)} KB`;
    } else if (msg.sticker) {
      file_id = msg.sticker.file_id;
      file_name = 'Sticker';
    } else {
      file_id = msg.video?.file_id || msg.photo?.slice(-1)[0]?.file_id || msg.audio?.file_id || '';
      file_name = msg.video?.file_name || 'Media File';
    }

    fileStorage[randomId] = {
      file_id,
      file_name,
      file_size
    };

    const botInfo = await bot.telegram.getMe();
    const link = `https://t.me/${botInfo.username}?start=${randomId}`;

    ctx.reply(
      `Your file has been securely saved!\nAccess it anytime using this link:\n<b><a href="${link}">Click to Retrieve</a></b>`,
      { parse_mode: 'HTML', disable_web_page_preview: true }
    );
  } catch (err) {
    ctx.reply(`An error occurred: ${err.message}`);
  }
});

// Fallback handler
bot.on('message', (ctx) => {
  ctx.reply("Invalid command. Use /start to begin.");
});

// Web server for Render
app.get('/', (req, res) => {
  res.send('Bot is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

bot.launch().then(() => {
  console.log("Bot launched successfully.");
});
