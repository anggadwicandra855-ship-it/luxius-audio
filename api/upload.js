export const config = {
  api: {
    bodyParser: false, // Menangani file binary audio
  },
};

export default async function handler(req, res) {
  // Buka CORS agar frontend Vercel bisa mengakses backend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = req.headers['x-api-key'] || req.headers['x-api-key'];
    
    // Tembak langsung ke Roblox Open Cloud API
    const robloxResponse = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: req,
    });

    const data = await robloxResponse.json();
    return res.status(robloxResponse.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
