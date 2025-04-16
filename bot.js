const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const app = express();

// ==== CONFIGURATION ====
const BOT_TOKEN = '7861502352:AAHnJW2xDIZ6DL1khVo1Hw4mXvNYG5pa4pM';
const OMDB_API_KEY = '19340f98';
const SOURCE_CHANNEL_ID = '-1001991464977';  // Replace with source channel ID
const DEST_CHANNEL_ID = '-1002178270630';    // Replace with destination channel ID

const BUTTON_TEXT = "Join Channel";
const BUTTON_URL = "https://t.me/yourchannel"; // Replace with your channel URL

// =========================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const postedMovies = new Set(); // To prevent duplicate posting

// /start command
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || "there";
  bot.sendMessage(msg.chat.id, `Hi ${name}!\n\nThis bot fetches movie details from OMDb and posts them to a channel when a movie file is uploaded in the source channel.`);
});

// Handle messages from source channel
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  if (chatId !== SOURCE_CHANNEL_ID) return;

  const caption = msg.caption;
  const isValidFile = msg.document || msg.video;

  if (!caption || !isValidFile) return;

  const movieQuery = caption.trim().toLowerCase();
  if (postedMovies.has(movieQuery)) return;

  try {
    const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(movieQuery)}&apikey=${OMDB_API_KEY}`);
    const data = res.data;

    if (data.Response === 'False') return;

    postedMovies.add(movieQuery);

    const text = `*Movie Name:* ${data.Title}\n*Year:* ${data.Year}\n*Language:* ${data.Language}\n*IMDb Rating:* ${data.imdbRating}\n*Plot:* ${data.Plot}`;

    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: BUTTON_TEXT, url: BUTTON_URL }]]
      }
    };

    if (data.Poster && data.Poster !== 'N/A') {
      await bot.sendPhoto(DEST_CHANNEL_ID, data.Poster, { caption: text, ...options });
    } else {
      await bot.sendMessage(DEST_CHANNEL_ID, text, options);
    }

  } catch (err) {
    console.error("Error fetching movie from OMDb:", err.message);
  }
});

// Keep server alive on Render
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running...'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
