// Proxies GM requests to Groq's free API (OpenAI-compatible). The API key
// lives only on the server (Vercel environment variable GROQ_API_KEY) and
// is never sent to the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
    return;
  }

  try {
    const { system, messages } = req.body || {};
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    const groqMessages = [
      { role: 'system', content: system || '' },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `Groq API error: ${errText}` });
      return;
    }

    const data = await response.json();
    const text = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unknown server error' });
  }
}
