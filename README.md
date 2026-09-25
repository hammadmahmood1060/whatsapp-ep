# ARY Plus WhatsApp Bot

This bot automatically fetches the latest episode of "Dar-e-Nijaat" from ARY Plus and can send either the link or the downloaded video directly to your WhatsApp.

## Prerequisites

1. **Node.js** installed on your system.
2. **FFmpeg** installed on your system (required for downloading `.m3u8` video streams).

### Installing FFmpeg

**On macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**On Windows:**
- Download the executable from the [official site](https://ffmpeg.org/download.html).
- Add the `bin` folder to your System Environment Variables (PATH).

**On Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

## Setup & Running

1. Open your terminal in this directory (`/Users/hammad/Desktop/downloader/whatsapp-bot`).
2. Run the bot using Node.js:
   ```bash
   node bot.js
   ```
3. A **QR code** will appear in your terminal.
4. Open **WhatsApp** on your phone, go to **Linked Devices**, and scan the QR code to log the bot into your account.
5. Once logged in, the terminal will say `Bot is ready and connected to WhatsApp!`.

## How to use the Bot

Send a message from any WhatsApp chat (or from another number to the bot's number) containing the trigger words:
- `dar e nijaat`
- `dar-e-nijaat`
- `latest ep`

**Example Flow:**
1. **You:** `latest ep of dar e nijaat`
2. **Bot:** `I found the latest episode of Dar-e-Nijaat! Do you want me to send the *link* or the *video*? Reply with "link" or "video".`
3. **You:** `video`
4. **Bot:** `Fetching and downloading the video...` (This may take a few minutes. It will download the video and send it to your WhatsApp).

## Note on Video Limits
WhatsApp has file size limits for sending videos (typically 16MB for standard media, up to 64MB or 100MB as a document depending on the client implementation). If the episode is very large, it might fail to send over WhatsApp directly. If that happens, replying with `link` is the best alternative!
