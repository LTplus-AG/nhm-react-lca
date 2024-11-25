export default async function handler(req, res) {

  // Set CORS headers

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');


  if (req.method === 'OPTIONS') {

    res.status(200).end();

    return;

  }


  try {

    const response = await fetch('https://www.lcadata.ch/api/kbob/materials');

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {

    console.error('Error fetching KBOB data:', error);

    res.status(500).json({ error: 'Failed to fetch KBOB data' });

  }

}