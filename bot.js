const { Telegraf } = require('telegraf');
const crypto = require('crypto');

// === CONFIG ===
const BOT_TOKEN = '7861502352:AAHnJW2xDIZ6DL1khVo1Hw4mXvNYG5pa4pM'; // Replace with your Bot Token
const CHANNEL_ID = '-1001001991464977'; // Replace with your Channel username or ID
const JOIN_CHANNELS = ['@Skyhub4u']; // Add required join channels
const PORT = process.env.PORT || 3000; // Default to 3000 if not set
// ==============

const bot = new Telegraf(BOT_TOKEN);
const fileStorage = {};

function generateRandomId() {
  return crypto.randomBytes(5).toString('hex');
}

async function isUserInChannel(ctx) {
  const userId = ctx.from.id;

  for (const channel of JOIN_CHANNELS) {
    try {
      const member = await ctx.telegram.getChatMember(channel, userId);
      if (['member', 'administrator', 'creator'].includes(member.status)) {
        return true;
      }
    } catch (e) {
      // Ignore
    }
  }

  return false;
}

bot.start(async (ctx) => {
  const args = ctx.message.text.split(" ");

  if (!(await isUserInChannel(ctx))) {
    const links = JOIN_CHANNELS.map(ch => `<a href="https://t.me/${ch.replace('@', '')}">${ch}</a>`).join('\n');
    return ctx.reply(
      `To use this bot, please join the following channel(s):\n${links}`,
      { parse_mode: 'HTML' }
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

bot.on(['document', 'photo', 'video', 'audio', 'sticker'], async (ctx) => {
  try {
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
    ctx.reply(`Your file has been securely saved!\nAccess it anytime using this link: ${link}`);
  } catch (err) {
    ctx.reply(`An error occurred: ${err.message}`);
  }
});

bot.on('message', (ctx) => {
  ctx.reply("Invalid command. Use /start to begin.");
});

// Optional: listen on PORT if needed
// This is not necessary for polling, but added for future webhook use
bot.launch().then(() => {
  console.log(`Bot started using long polling...`);
  console.log(`Listening on PORT ${PORT} (not used unless webhooks enabled)`);
});
