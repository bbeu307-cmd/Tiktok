import express from 'express';
import path from 'path';
import { handleApiRequest } from './src/server/apiHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Endpoints
app.all('/api/*', async (req, res) => {
  try {
    const result = await handleApiRequest(req.originalUrl, req.method, req.body);
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Serve static frontend build in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TikTok Live Racing Arena server running on port ${PORT}`);
});
