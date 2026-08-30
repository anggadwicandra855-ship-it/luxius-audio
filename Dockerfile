FROM node:20-slim

# Install FFmpeg internal di Cloud
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 7860

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "7860"]
