const { Telegraf } = require("telegraf");
const express = require("express");
const app = express();

const bot = new Telegraf("7861502352:AAHnJW2xDIZ6DL1khVo1Hw4mXvNYG5pa4pM"); // Replace with your bot token
const CHANNEL_ID = "-1001991464977"; // Replace with your private channel ID

const fileStorage = {};

function generateRandomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

bot.start(async (ctx) => {
  const text = ctx.message.text;

  if (text.includes(" ")) {
    const randomId = text.split(" ")[1];
    if (fileStorage[randomId]) {
      const fileData = fileStorage[randomId];

      const extraOptions = {
        caption: fileData.caption || '',
        parse_mode: "HTML"
      };

      if (fileData.file_name) {
        extraOptions.filename = fileData.file_name;
      }

      return await ctx.replyWithDocument(
        { file_id: fileData.file_id, filename: fileData.file_name },
        extraOptions
      );
    } else {
      return ctx.reply("Invalid or expired link.");
    }
  }

  ctx.replyWithHTML(
    `<b>Welcome to Secure File Storage Bot!</b>\n\n` +
    `Instructions:\n` +
    `1. Send any file, photo, video, or sticker.\n` +
    `2. You'll get a unique shareable link.\n` +
    `3. Files are stored privately.`
  );
});

bot.on(['document', 'photo', 'video', 'audio', 'sticker'], async (ctx) => {
  try {
    const forwarded = await ctx.telegram.forwardMessage(
      CHANNEL_ID,
      ctx.chat.id,
      ctx.message.message_id
    );

    const randomId = generateRandomId();
    const caption = ctx.message.caption || "";

    let file_id = null;
    let file_name = "Unknown";
    let file_size = "Unknown";

    if (ctx.message.document) {
      file_id = ctx.message.document.file_id;
      file_name = ctx.message.document.file_name || "Document";
      file_size = `${(ctx.message.document.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.video) {
      file_id = ctx.message.video.file_id;
      file_name = "Video.mp4";
      file_size = `${(ctx.message.video.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.audio) {
      file_id = ctx.message.audio.file_id;
      file_name = ctx.message.audio.file_name || "Audio.mp3";
      file_size = `${(ctx.message.audio.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.photo) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      file_id = photo.file_id;
      file_name = "Photo.jpg";
      file_size = `${(photo.file_size / 1024).toFixed(2)} KB`;
    } else if (ctx.message.sticker) {
      file_id = ctx.message.sticker.file_id;
      file_name = "Sticker.webp";
    }

    fileStorage[randomId] = {
      file_id,
      file_name,
      file_size,
      caption
    };

    const fileLink = `https://t.me/${ctx.botInfo.username}?start=${randomId}`;

    await ctx.replyWithHTML(
      `✅ <b>Your file has been saved!</b>\n\n` +
      `<b>Link:</b> <a href="${fileLink}">${fileLink}</a>`
    );
  } catch (err) {
    console.error("Error saving file:", err);
    ctx.reply("An error occurred while saving the file.");
  }
});

bot.on("message", async (ctx) => {
  ctx.reply("Invalid command. Use /start to begin.");
});

// Web server for Render
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server running...");
});

bot.launch();
