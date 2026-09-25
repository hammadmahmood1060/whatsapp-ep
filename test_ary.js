const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    // Go to an episode page
    await page.goto('https://aryplus.tv/video/v2/3/6aaeb19765a92de0f19da7e4/6a57868b5bf57c474cc00a50', { waitUntil: 'networkidle2' });
    
    // Extract m3u8 directly from the DOM source tag
    const m3u8Link = await page.evaluate(() => {
        const source = document.querySelector('source[src$=".m3u8"]');
        return source ? source.src : null;
    });
    console.log("DOM m3u8 link:", m3u8Link);
    
    // Now check the series page
    await page.goto('https://aryplus.tv/series/6a57868b5bf57c474cc00a50', { waitUntil: 'networkidle2' });
    const episodes = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(a => a.href).filter(href => href.includes('/video/'));
    });
    console.log("Series episodes:", episodes);

    await browser.close();
})();
