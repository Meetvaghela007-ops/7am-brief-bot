require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// 1. Setup Clients
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 2. The /start Command
bot.start(async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const firstName = ctx.from.first_name || 'Student';

  // Save user to Supabase
  const { error } = await supabase
    .from('users')
    .upsert({ telegram_chat_id: chatId, first_name: firstName }, { onConflict: 'telegram_chat_id' });

  if (error) {
    console.error('Error saving user:', error);
    ctx.reply("Oops! Database error. Try again later.");
  } else {
    ctx.reply(`👋 Hi ${firstName}! I'm your 7 AM Brief Bot.\n\nI'll send you a short AI summary of the world's news every morning at 7 AM. Sit tight! ☕`);
  }
});

// 3. Export for Vercel
module.exports = async (req, res) => {
    try {
        // This line makes the bot reply when Telegram sends a message
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error');
    }
};
