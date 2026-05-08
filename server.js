import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || '');

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, model, systemInstruction, tools, toolConfig } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
    }

    const generativeModel = genAI.getGenerativeModel({
      model: model || "gemini-2.0-flash",
      systemInstruction,
      tools,
      toolConfig
    });

    const chat = generativeModel.startChat({
      history: history || [],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    // Return both text and function calls
    res.json({
      text: response.text(),
      functionCalls: response.functionCalls()
    });
  } catch (error) {
    console.error("[AI ERROR]", error);
    res.status(500).json({ error: error.message || 'Internal AI Error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Server online at http://0.0.0.0:${PORT}`);
    console.log(`[SYSTEM] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("[CRITICAL] Failed to start server:", err);
    process.exit(1);
  });
}

export default app;
