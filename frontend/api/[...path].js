export const config = {
  api: {
    bodyParser: false, // forward raw bytes as-is
  },
}

export default async function handler(req, res) {
  // req.url = /api/agent/chat, /api/generate, etc.
  const targetUrl = `https://api.deepcard.ch${req.url}`

  // Forward all headers except host
  const forwardHeaders = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== 'host') forwardHeaders[key] = value
  }

  // Collect raw body for POST / PUT / PATCH
  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
  }

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: body?.length ? body : undefined,
  })

  // Relay status + headers (skip hop-by-hop headers)
  res.status(upstream.status)
  upstream.headers.forEach((value, key) => {
    if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  })

  const responseBuffer = Buffer.from(await upstream.arrayBuffer())
  res.send(responseBuffer)
}
