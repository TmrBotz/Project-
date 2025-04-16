const { Telegraf } = require("telegraf");
const express = require("express");

const bot = new Telegraf("7861502352:AAHnJW2xDIZ6DL1khVo1Hw4mXvNYG5pa4pM"); // Replace with your bot token
const PORT = process.env.PORT || 3000;

// Replace with your private file storage channel ID (bot must be admin there)
const FILE_CHANNEL_ID = "-1001001991464977";

// Private force join channel: add { id, link }
const Joinchannel = [{
  id: "-1001001991464977", // force subscribe channel ID
  link: "https://t.me/+-TzaUYIhkhhjYzll" // private invite link
}];

const fileStorage = {};

function generateRandomId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function isUserInChannel(userId) {
  for (const channel of Joinchannel) {
    try {
      const member = await bot.telegram.getChatMember(channel.id, userId);
      if (["member", "administrator", "creator"].includes(member.status)) {
        return true;
      }
    } catch (e) {
      console.log("Error checking member:", e.message);
    }
  }
  return false;
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  const joined = await isUserInChannel(userId);
  if (!joined) {
    const links = Joinchannel.map(
      ch => `<a href="${ch.link}">Join Channel</a>`
    ).join("\n");

    return ctx.replyWithHTML(
      `To use this bot, please join the following channel(s):\n${links}`
    );
  }

  if (text.includes(" ")) {
    const randomId = text.split(" ")[1];
    if (fileStorage[randomId]) {
      const fileData = fileStorage[randomId];
      await ctx.replyWithDocument(fileData.file_id, {
        caption: `File Name: ${fileData.file_name}\nFile Size: ${fileData.file_size}`
      });
    } else {
      ctx.reply("Invalid or expired link.");
    }
  } else {
    ctx.replyWithHTML(
      `Welcome to <b>Secure File Storage Bot</b>!\n\n` +
      `Instructions:\n` +
      `1. Send any file, photo, video, or sticker.\n` +
      `2. You'll get a unique shareable link.\n` +
      `3. Files are stored privately.`
    );
  }
});

bot.on(['document', 'photo', 'video', 'audio', 'sticker'], async (ctx) => {
  try {
    const forwarded = await ctx.forwardMessage(FILE_CHANNEL_ID);
    const randomId = generateRandomId();

    let file_id, file_name = "Unknown", file_size = "Unknown";

    if (ctx.message.document) {
      file_id = forwarded.document.file_id;
      file_name = ctx.message.document.file_name;
      file_size = `${(ctx.message.document.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.video) {
      file_id = forwarded.video.file_id;
      file_name = "Video";
      file_size = `${(ctx.message.video.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.photo) {
      file_id = forwarded.photo[forwarded.photo.length - 1].file_id;
      file_name = "Photo";
      file_size = "Auto";
    } else if (ctx.message.audio) {
      file_id = forwarded.audio.file_id;
      file_name = ctx.message.audio.file_name || "Audio";
      file_size = `${(ctx.message.audio.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.sticker) {
      file_id = forwarded.sticker.file_id;
      file_name = "Sticker";
      file_size = "Auto";
    }

    fileStorage[randomId] = {
      file_id,
      file_name,
      file_size
    };

    const link = `https://t.me/${(await bot.telegram.getMe()).username}?start=${randomId}`;
    ctx.replyWithHTML(
      `✅ File saved!\n\n<a href="${link}">Click here to access</a>`
    );

  } catch (err) {
    ctx.reply("An error occurred: " + err.message);
  }
});

// Default reply for unknown messages
bot.on("message", (ctx) => {
  ctx.reply("Invalid command. Use /start to begin.");
});

// Express server to keep Render alive
const app = express();
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(PORT, () => {
  console.log("Web server running on port " + PORT);
});

// Start polling
bot.launch().then(() => {
  console.log("Bot launched successfully!");
});
