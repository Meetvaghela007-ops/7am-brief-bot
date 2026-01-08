require('dotenv').config();
const Parser = require('rss-parser');
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const parser = new Parser();

// RSS Feeds (BBC Tech & The Verge)
const FEED_URLS = [
    'http://feeds.bbci.co.uk/news/technology/rss.xml', 
    'https://www.theverge.com/rss/index.xml'
];

async function fetchAndSummarize() {
    console.log("Cooking the news...");
    let allHeadlines = [];

    // 1. Get RSS Data
    for (const url of FEED_URLS) {
        try {
            const feed = await parser.parseURL(url);
            // Get top 2 items from each feed
            feed.items.slice(0, 2).forEach(item => {
                allHeadlines.push(`- ${item.title}: ${item.contentSnippet || ''}`);
            });
        } catch (e) {
            console.error(`Failed to parse ${url}`);
        }
    }

    const newsText = allHeadlines.join("\n");

    // 2. Ask Gemini to Summarize
    const prompt = `
    Here are today's top tech news headlines:
    ${newsText}

    Task: Write a fun, 3-bullet point summary for a busy student. 
    - Start with a catchy emoji.
    - Keep it under 100 words total.
    - Tone: Casual and smart.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", 
            contents: prompt
        });
        
        const summary = response.text();

        // 3. Save to Database
        // We use upsert to ensure only one summary per day exists
        const today = new Date().toISOString().split('T')[0];
        
        const { error } = await supabase
            .from('daily_summaries')
            .upsert({ date: today, content: summary }, { onConflict: 'date' });

        if (error) console.error("DB Error:", error);
        else console.log("News cooked and saved!");

    } catch (error) {
        console.error("AI Error:", error);
    }
}

module.exports = async (req, res) => {
    await fetchAndSummarize();
    res.status(200).send("News Fetched");
};
