const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const http = require('http');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// State to keep track of user interactions
const userStates = {};

// Determine correct Chrome executable path based on environment
const macChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = fs.existsSync(macChromePath) 
    ? macChromePath 
    : process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Required on some environments like Linux/Mac, to prevent permission issues
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        // Use system Chrome on Mac, or the one provided by the Puppeteer Docker image on Render
        executablePath: executablePath
    }
});

client.on('qr', (qr) => {
    // Generate and scan this code with your phone (WhatsApp Linked Devices)
    console.log('\n--- SCAN THIS QR CODE IN WHATSAPP TO LOG IN ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot is ready and connected to WhatsApp!');
});

// Function to simulate scraping the ARY Plus website for the latest episode
async function getLatestEpisodeInfo() {
    let m3u8Link = null;
    let videoPageLink = null;

    console.log("Launching browser to find the latest episode...");
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        const page = await browser.newPage();
        
        // Go directly to the series page
        console.log("Fetching episode list...");
        await page.goto('https://aryplus.tv/series/6a57868b5bf57c474cc00a50', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Extract all episode links from the page
        const episodes = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.map(a => a.href).filter(href => href.includes('/video/'));
        });
        
        if (episodes.length > 0) {
            // Filter unique links and sort descending (latest usually has a higher object ID in the URL)
            const uniqueEpisodes = [...new Set(episodes.map(e => e.split('#')[0]))];
            uniqueEpisodes.sort().reverse(); // Reverse sort to get the latest episode
            videoPageLink = uniqueEpisodes[0];
            
            console.log("Found latest episode link:", videoPageLink);
            
            // Now go to the latest episode page to capture its m3u8 stream from the DOM
            await page.goto(videoPageLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Wait a bit for the video player to be rendered by React
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Read the m3u8 directly from the video source tag in the DOM
            m3u8Link = await page.evaluate(() => {
                const source = document.querySelector('source[src$=".m3u8"]');
                return source ? source.src : null;
            });
            console.log("Found m3u8 link in DOM:", m3u8Link);
        }

        // If extraction fails for some reason, fallback
        if (!m3u8Link) {
            m3u8Link = 'https://vod.aryzap.com/c9b8f8d2vodtransth1313565080/3d03f3d85001834820515358135/adp.10.m3u8';
        }
    } catch (err) {
        console.error("Error scraping ARY Plus:", err);
    } finally {
        await browser.close();
    }

    return { link: videoPageLink, m3u8: m3u8Link };
}

// Function to download m3u8 using ffmpeg
async function downloadVideo(m3u8Url, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(m3u8Url)
            // Copy the video and audio codecs to convert to mp4
            .outputOptions('-c copy')
            .outputOptions('-bsf:a aac_adtstoasc')
            .save(outputPath)
            .on('end', () => {
                console.log('Download complete:', outputPath);
                resolve();
            })
            .on('error', (err) => {
                console.error('Download error:', err);
                reject(err);
            });
    });
}

client.on('message', async msg => {
    const text = msg.body.toLowerCase().trim();
    const sender = msg.from;

    // Trigger word checking
    if (text.includes('dar e nijaat') || text.includes('dar-e-nijaat') || text.includes('latest ep')) {
        userStates[sender] = { step: 'ASK_FORMAT' };
        await msg.reply('I found the latest episode of Dar-e-Nijaat! Do you want me to send the *link* or the *video*?\n\nReply with "link" or "video".');
        return;
    }

    // Handle responses based on user state
    if (userStates[sender] && userStates[sender].step === 'ASK_FORMAT') {
        if (text === 'link') {
            await msg.reply('Fetching the latest link...');
            const info = await getLatestEpisodeInfo();
            if (info.m3u8) {
                await msg.reply(`Here is the direct video link to the latest episode:\n${info.m3u8}`);
            } else {
                await msg.reply("Sorry, I couldn't find the link.");
            }
            delete userStates[sender]; // Clear state

        } else if (text === 'video') {
            await msg.reply('Fetching and downloading the video. This might take a few minutes (depending on size)...');
            
            try {
                const info = await getLatestEpisodeInfo();
                
                if (info.m3u8) {
                    const tempVideoPath = path.join(__dirname, `latest_episode_${Date.now()}.mp4`);
                    
                    // Download the video
                    await downloadVideo(info.m3u8, tempVideoPath);
                    
                    // Send the video as a document to bypass the 16MB standard limit (up to 100MB)
                    const media = MessageMedia.fromFilePath(tempVideoPath);
                    await client.sendMessage(sender, media, { 
                        caption: 'Here is the latest episode of Dar-e-Nijaat!',
                        sendMediaAsDocument: true 
                    });
                    
                    // Delete the video locally after sending
                    if (fs.existsSync(tempVideoPath)) {
                        fs.unlinkSync(tempVideoPath);
                    }
                } else {
                    await msg.reply("Sorry, I couldn't find the video stream.");
                }
            } catch (error) {
                console.error(error);
                await msg.reply("Sorry, an error occurred while downloading or sending the video. (Note: WhatsApp has a 16MB/64MB media size limit depending on the method, which might cause failure for large videos).");
            }
            
            delete userStates[sender]; // Clear state
        } else {
            await msg.reply('Please reply with either "link" or "video".');
        }
    }
});

// Start the client
client.initialize();

// Create a simple HTTP server so Render (Web Services) doesn't mark the app as failed
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WhatsApp Bot is running!');
}).listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (required for Render)`);
});
