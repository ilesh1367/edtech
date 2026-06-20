FROM node:20-slim

# Install ffmpeg for video processing and clean up apt cache
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copy package files FIRST
COPY edtech/package*.json ./

# 2. Install dependencies SECOND
RUN npm install

# 3. Copy the rest of the application THIRD
COPY edtech/ .

# Create the temp_videos directory
RUN mkdir -p temp_videos

EXPOSE 3000

CMD ["node", "server.js"]
