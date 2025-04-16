const { Telegraf } = require("telegraf");
const express = require("express");
const fs = require("fs");
const app = express();

const BOT_TOKEN = "7861502352:AAHnJW2xDIZ6DL1khVo1Hw4mXvNYG5pa4pM"; // replace with your bot token
const CHANNEL_ID = -1001991464977; // replace with your private channel ID

const bot = new Telegraf(BOT_TOKEN);
const fileStoragePath = "files.json";

// Function to read existing data from files.json
function readFileStorage() {
  try {
    const data = fs.readFileSync(fileStoragePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Function to write data to files.json
function writeFileStorage(data) {
  try {
    fs.writeFileSync(fileStoragePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing to file", error);
  }
}

// Generate random ID for each file
function generateRandomId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Start command - bot will greet user and provide instructions
bot.start(async (ctx) => {
  const messageParts = ctx.message.text.split(" ");

  if (messageParts.length > 1) {
    const randomId = messageParts[1];

    const fileStorage = readFileStorage();
    if (fileStorage[randomId]) {
      const fileData = fileStorage[randomId];

      if (Array.isArray(fileData)) {
        for (const file of fileData) {
          await ctx.replyWithDocument(file.file_id, {
            caption: file.caption || undefined,
          });
        }
      } else {
        await ctx.replyWithDocument(fileData.file_id, {
          caption: fileData.caption || undefined,
        });
      }
      return;
    } else {
      return ctx.reply("Invalid or expired link.");
    }
  }

  ctx.replyWithHTML(
    "Welcome to the <b>Secure File Storage Bot</b>!\\n\\n" +
      "Send any file and get a unique shareable link to retrieve it later."
  );
});

// Listen to file uploads and save the data to files.json
bot.on(["document", "video", "audio", "photo", "sticker"], async (ctx) => {
  try {
    const forwarded = await ctx.telegram.forwardMessage(
      CHANNEL_ID,
      ctx.chat.id,
      ctx.message.message_id
    );

    const file_id =
      ctx.message.document?.file_id ||
      ctx.message.video?.file_id ||
      ctx.message.audio?.file_id ||
      (ctx.message.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : null) ||
      ctx.message.sticker?.file_id;

    const file_name =
      ctx.message.document?.file_name ||
      ctx.message.video?.file_name ||
      ctx.message.audio?.file_name ||
      (ctx.message.photo ? "Photo.jpg" : "Unknown");

    const caption = ctx.message.caption || "";
    const randomId = generateRandomId();

    const fileStorage = readFileStorage();
    fileStorage[randomId] = {
      file_id,
      caption: `@Tmrbitz ${file_name}\\n${caption}`,
    };

    writeFileStorage(fileStorage);

    const fileLink = `https://t.me/${ctx.botInfo.username}?start=${randomId}`;

    ctx.replyWithHTML(
      `✅ Your file has been saved!\\n<b>Access it anytime:</b> <a href="${fileLink}">${fileLink}</a>`
    );
  } catch (err) {
    console.error(err);
    ctx.reply("An error occurred while processing the file.");
  }
});

// Batch command to fetch multiple files between the specified links
bot.command("batch", async (ctx) => {
  const args = ctx.message.text.split(" ");

  if (args.length !== 3) {
    return ctx.reply("Usage: /batch <first_msg_link> <last_msg_link>");
  }

  const extractMsgId = (link) => {
    const parts = link.trim().split("/");
    return parseInt(parts[parts.length - 1]);
  };

  const firstMsgId = extractMsgId(args[1]);
  const lastMsgId = extractMsgId(args[2]);

  if (isNaN(firstMsgId) || isNaN(lastMsgId) || firstMsgId > lastMsgId) {
    return ctx.reply("Invalid message links.");
  }

  try {
    const randomId = generateRandomId();
    const fileStorage = readFileStorage();
    fileStorage[randomId] = [];

    for (let i = firstMsgId; i <= lastMsgId; i++) {
      const msg = await ctx.telegram.getChatMessage(CHANNEL_ID, i);

      let file_id = null;

      if (msg.document) file_id = msg.document.file_id;
      else if (msg.video) file_id = msg.video.file_id;
      else if (msg.audio) file_id = msg.audio.file_id;
      else if (msg.photo) file_id = msg.photo[msg.photo.length - 1].file_id;
      else if (msg.sticker) file_id = msg.sticker.file_id;
      else continue;

      fileStorage[randomId].push({
        file_id,
        caption: msg.caption || undefined,
      });
    }

    if (fileStorage[randomId].length === 0) {
      return ctx.reply("No valid files found in the given range.");
    }

    writeFileStorage(fileStorage);

    const fileLink = `https://t.me/${ctx.botInfo.username}?start=${randomId}`;
    return ctx.replyWithHTML(`✅ Batch saved!\\n<b>Link:</b> <a href="${fileLink}">${fileLink}</a>`);
  } catch (err) {
    console.error("Batch error:", err);
    return ctx.reply("Something went wrong while creating the batch.");
  }
});

// Default handler for unrecognized commands
bot.on("text", (ctx) => {
  ctx.reply("Invalid command. Use /start or send a file.");
});

// Express server to keep bot running
app.get("/", (req, res) => {
  res.send("Bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

bot.launch();
