FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install ffmpeg and prepare the directory
USER root

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Create the working directory and give the puppeteer user ownership
RUN mkdir -p /app && chown -R pptruser:pptruser /app

# Switch back to the non-root user for security and to run npm
USER pptruser
WORKDIR /app

# Copy package files with the correct permissions
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY --chown=pptruser:pptruser . .

# Expose the port Render assigns
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
