require('dotenv').config({ path: '.env.local' });
const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule.TelegramBot || TelegramBotModule;

// Retrieve environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token || token === 'your_bot_token_from_botfather_here') {
  console.error('❌ Error: Please set a valid TELEGRAM_BOT_TOKEN in .env.local');
  process.exit(1);
}

if (!appUrl || appUrl === 'https://your-deployed-vercel-app.vercel.app') {
  console.warn('⚠️ Warning: NEXT_PUBLIC_APP_URL is still set to the placeholder in .env.local.');
  console.warn('⚠️ The Mini App button will open the placeholder URL instead of your actual app.');
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Telegram Bot is running...');
console.log(`🔗 Web App URL configured as: ${appUrl}`);

// Listen specifically for the /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage = `📚 Welcome to the Educational platform!

✨ A to Z Tutorial

Click the button below to start learning!`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Start Learning',
            web_app: { url: appUrl },
          },
        ],
      ],
    },
  };

  bot.sendMessage(chatId, welcomeMessage, options);
});
