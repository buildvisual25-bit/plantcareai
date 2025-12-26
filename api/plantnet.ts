export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 1. Try Key from Client Headers (Settings)
    // 2. Try Server Environment Variable (Vercel Env)
    const apiKey = request.headers.get('x-plantnet-api-key') || process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key missing. Please add it in Settings or Vercel Environment Variables.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const binaryStr = atob(image);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    const formData = new FormData();
    // Providing a filename is crucial for some multipart parsers
    formData.append('images', blob, 'image.jpg');
    formData.append('organs', 'auto');

    const project = 'all'; 
    const pnUrl = `https://my-api.plantnet.org/v2/identify/${project}?api-key=${apiKey}`;

    // Forward the Origin header from the client request so PlantNet accepts the domain
    const clientOrigin = request.headers.get('origin') || request.headers.get('referer');
    
    const headers: Record<string, string> = {
      'User-Agent': 'LavenderGardenApp/1.0',
    };
    if (clientOrigin) {
      headers['Origin'] = clientOrigin;
    }

    const response = await fetch(pnUrl, {
      method: 'POST',
      body: formData,
      headers: headers,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}