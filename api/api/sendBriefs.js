require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function broadcastNews() {
    // 1. Get today's summary
    const today = new Date().toISOString().split('T')[0];
    const { data: newsData, error: newsError } = await supabase
        .from('daily_summaries')
        .select('content')
        .eq('date', today)
        .single();

    if (newsError || !newsData) {
        return console.log("No news found for today!");
    }

    // 2. Get all users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('telegram_chat_id');

    if (userError) return console.error(userError);

    // 3. Send to everyone
    console.log(`Sending to ${users.length} users...`);
    for (const user of users) {
        try {
            await bot.telegram.sendMessage(user.telegram_chat_id, `☀️ **Good Morning! Here is your 7 AM Brief:**\n\n${newsData.content}`);
        } catch (e) {
            console.log(`Failed to send to ${user.telegram_chat_id}`);
        }
    }
}

module.exports = async (req, res) => {
    await broadcastNews();
    res.status(200).send("News Sent");
};
