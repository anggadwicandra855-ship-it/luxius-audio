import { defineConfig } from 'vite';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

function luxiusBackendPlugin() {
  return {
    name: 'luxius-backend-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 🔑 HEADER CORS LENGKAP MENCEGAH FAILED TO FETCH
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const sendJson = (status, data) => {
          if (!res.writableEnded) {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          }
        };

        // 1. CONVERT AUDIO UNTUK LOCAL DOWNLOAD (REAL FFMPEG OGG/MP3/FLAC)
        if (req.url === '/api/convert-audio' && req.method === 'POST') {
          try {
            const format = req.headers['x-format'] || 'ogg';
            const tempDir = path.join(process.cwd(), '.tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const timestamp = Date.now();
            const inputWavPath = path.join(tempDir, `conv_in_${timestamp}.wav`);
            const outputAudioPath = path.join(tempDir, `conv_out_${timestamp}.${format}`);

            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const wavBuffer = Buffer.concat(chunks);
                fs.writeFileSync(inputWavPath, wavBuffer);

                await execPromise(`ffmpeg -y -i "${inputWavPath}" -b:a 128k "${outputAudioPath}"`);
                const fileData = fs.readFileSync(outputAudioPath);

                if (fs.existsSync(inputWavPath)) fs.unlinkSync(inputWavPath);
                if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);

                res.writeHead(200, {
                  'Content-Type': `audio/${format}`,
                  'Content-Length': fileData.length
                });
                res.end(fileData);
              } catch (err) {
                if (fs.existsSync(inputWavPath)) fs.unlinkSync(inputWavPath);
                if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);
                sendJson(500, { success: false, error: "FFmpeg Convert Error: " + err.message });
              }
            });

            req.on('error', (err) => sendJson(500, { success: false, error: "Upload Stream Error: " + err.message }));
          } catch (err) {
            sendJson(500, { success: false, error: err.message });
          }
          return;
        }

        // 2. UPLOAD TO ROBLOX OPEN CLOUD (SAFE BUFFER + REAL OGG COMPRESSION)
        if (req.url === '/api/upload-to-roblox' && req.method === 'POST') {
          try {
            const apiKey = req.headers['x-api-key'];
            const targetId = req.headers['x-target-id'];
            const targetType = req.headers['x-target-type'] || 'user';
            const format = req.headers['x-format'] || 'ogg';
            const displayName = req.headers['x-display-name'] || 'LX_AUDIO';

            const tempDir = path.join(process.cwd(), '.tmp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const timestamp = Date.now();
            const inputWavPath = path.join(tempDir, `up_in_${timestamp}.wav`);
            const outputAudioPath = path.join(tempDir, `up_out_${timestamp}.${format}`);

            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const wavBuffer = Buffer.concat(chunks);
                fs.writeFileSync(inputWavPath, wavBuffer);

                // 🚀 REAL FFMPEG COMPRESSION (18.8 MB WAV -> ~2.1 MB OGG)
                try {
                  await execPromise(`ffmpeg -y -i "${inputWavPath}" -b:a 128k "${outputAudioPath}"`);
                } catch (fErr) {
                  fs.copyFileSync(inputWavPath, outputAudioPath);
                }

                const encodedBuffer = fs.readFileSync(outputAudioPath);
                const fileSizeMB = (encodedBuffer.length / (1024 * 1024)).toFixed(2);

                if (fs.existsSync(inputWavPath)) fs.unlinkSync(inputWavPath);

                // ROBLOX OPEN CLOUD MULTIPART FORM-DATA
                const metaData = {
                  assetType: "Audio",
                  displayName: displayName,
                  description: "Uploaded via Luxius Audio Engine",
                  creationContext: {
                    creator: targetType === "group" ? { groupId: targetId } : { userId: targetId }
                  }
                };

                const boundary = "----WebKitFormBoundaryLuxius" + Math.random().toString(36).substring(2);
                let postParts = [];
                postParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metaData)}\r\n`));
                postParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileContent"; filename="${displayName}.${format}"\r\nContent-Type: audio/${format}\r\n\r\n`));
                postParts.push(encodedBuffer);
                postParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

                const fullPayloadBuffer = Buffer.concat(postParts);

                const robloxRes = await fetch("https://apis.roblox.com/assets/v1/assets", {
                  method: "POST",
                  headers: {
                    "x-api-key": apiKey,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "Content-Length": fullPayloadBuffer.length
                  },
                  body: fullPayloadBuffer
                });

                const robloxData = await robloxRes.json();
                if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);

                if (!robloxRes.ok) {
                  sendJson(robloxRes.status, {
                    success: false,
                    error: robloxData.message || robloxData.errorMessage || JSON.stringify(robloxData)
                  });
                  return;
                }

                // ASYNC POLLING MODERASI ROBLOX
                let finalAssetId = robloxData.assetId || robloxData.response?.assetId;

                if (!finalAssetId && robloxData.path) {
                  const opPath = robloxData.path;
                  for (let i = 0; i < 15; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    const pollRes = await fetch(`https://apis.roblox.com/assets/v1/${opPath}`, {
                      headers: { "x-api-key": apiKey }
                    });
                    if (pollRes.ok) {
                      const pollData = await pollRes.json();
                      if (pollData.done) {
                        finalAssetId = pollData.response?.assetId || (pollData.response?.path ? pollData.response.path.split('/').pop() : null);
                        break;
                      }
                    }
                  }
                }

                if (finalAssetId) {
                  sendJson(200, { success: true, assetId: finalAssetId, fileSizeMB });
                } else {
                  sendJson(500, { success: false, error: "Roblox moderasi terlalu lama. Silakan cek di Creator Dashboard!" });
                }

              } catch (err) {
                if (fs.existsSync(inputWavPath)) fs.unlinkSync(inputWavPath);
                if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);
                sendJson(500, { success: false, error: "Server Internal Error: " + err.message });
              }
            });

            req.on('error', (err) => sendJson(500, { success: false, error: "Request Stream Error: " + err.message }));
          } catch (err) {
            sendJson(500, { success: false, error: err.message });
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [luxiusBackendPlugin()]
});
