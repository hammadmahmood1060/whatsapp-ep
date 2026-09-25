FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install ffmpeg
USER root

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Switch back to the pptruser
USER pptruser

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose the port Render assigns
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
