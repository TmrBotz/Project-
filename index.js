require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const DEST_CHANNEL_ID = process.env.DEST_CHANNEL_ID;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

const BUTTON_TEXT = "Join Channel";
const BUTTON_URL = "https://t.me/yourchannel"; // ← Replace with your channel URL

// Track posted movies to avoid duplicates
const postedMovies = new Set();

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || "there";

  const welcomeMessage = `Hello ${userName}!\n\nThis bot fetches movie details automatically from OMDb API when a movie file is posted in a specific Telegram channel.\n\nEnjoy!`;
  bot.sendMessage(chatId, welcomeMessage);
});

// Handle movie uploads
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== SOURCE_CHANNEL_ID) return;

  if (msg.document || msg.video) {
    const caption = msg.caption;
    if (!caption) return;

    const movieName = caption.trim().toLowerCase();
    if (postedMovies.has(movieName)) {
      console.log(`Already posted: ${movieName}`);
      return;
    }

    try {
      const response = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&apikey=${OMDB_API_KEY}`);
      const data = response.data;

      if (data.Response === 'False') {
        console.log(`Not found on OMDb: ${movieName}`);
        return; // Don’t post anything
      }

      postedMovies.add(movieName);

      const text = `*Movie Name:* ${data.Title}\n*Year:* ${data.Year}\n*Language:* ${data.Language}\n*IMDb Rating:* ${data.imdbRating}\n*Plot:* ${data.Plot}`;

      const button = {
        reply_markup: {
          inline_keyboard: [
            [{ text: BUTTON_TEXT, url: BUTTON_URL }]
          ]
        },
        parse_mode: 'Markdown'
      };

      if (data.Poster && data.Poster !== 'N/A') {
        await bot.sendPhoto(DEST_CHANNEL_ID, data.Poster, {
          caption: text,
          ...button
        });
      } else {
        await bot.sendMessage(DEST_CHANNEL_ID, text, button);
      }

    } catch (error) {
      console.error("Fetch failed:", error.message);
    }
  }
});
