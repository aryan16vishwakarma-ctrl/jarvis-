const SYSTEM_INSTRUCTION = `You are Jarvis, a highly advanced artificial intelligence assistant with a futuristic HUD interface.
Current User Date & Time: ${new Date().toLocaleString()}.
You can assist the user by:
1. Executing system commands (like simulating a system shutdown).
2. Playing music (specify platform: 'spotify' if requested, otherwise defaults to 'youtube').
3. Controlling media playback (play, pause, next, previous, set volume).
4. Opening requested applications.
5. Answering questions using your knowledge and Google Search tool.
6. Seeing the user through their webcam via the analyzeCamera tool. Use this exclusively when the user asks you to look at them or their environment.
7. Displaying real-time news feeds via the showNews tool.

When asked to perform a system action or control media (open app, play music, shutdown, analyze camera, control media, show news), always use the provided function tool, then briefly confirm the action verbally (e.g. "Right away, sir.", "Opening VS Code now.", "Pausing music.", "Accessing the main news grid."). 
Keep your verbal responses incredibly concise, witty, and polite. Do not apologize unnecessarily. Use a robotic but classy tone. Do not use markdown or emojis in your speech, as it will be fed to a TTS engine.`;

export const openApplicationDecl = {
  name: "openApplication",
  description: "Opens a web application or website.",
  parameters: {
    type: "OBJECT",
    properties: {
      appName: { type: "STRING", description: "Common name of the application (e.g. Chrome, YouTube, Spotify)." },
      url: { type: "STRING", description: "Specific URL if known, e.g. 'https://github.com'." }
    }
  }
};

export const playMusicDecl = {
  name: "playMusic",
  description: "Plays music based on user query.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: { type: "STRING", description: "Song name, artist, or genre." },
      platform: { type: "STRING", enum: ["youtube", "spotify"], description: "The music platform to use." }
    },
    required: ["query"]
  }
};

export const executeSystemCommandDecl = {
  name: "executeSystemCommand",
  description: "Executes simulated system commands like volume or power.",
  parameters: {
    type: "OBJECT",
    properties: {
      command: { type: "STRING", description: "Command to execute (shutdown, restart, volume [0-100])." }
    },
    required: ["command"]
  }
};

export const analyzeCameraDecl = {
  name: "analyzeCamera",
  description: "Triggers visual sensor to analyze user environment via webcam.",
  parameters: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING", description: "What to look for in the visual feed." }
    }
  }
};

export const controlMediaDecl = {
  name: "controlMedia",
  description: "Controls the active media player widgets.",
  parameters: {
    type: "OBJECT",
    properties: {
      action: { type: "STRING", enum: ["play", "pause", "next", "previous", "volume"], description: "Playback control action." },
      volume: { type: "NUMBER", description: "Volume level if action is volume (0-100)." }
    },
    required: ["action"]
  }
};

export const showNewsDecl = {
  name: "showNews",
  description: "Opens the news grid interface to display global headlines.",
  parameters: {
    type: "OBJECT",
    properties: {}
  }
};

class ChatProxy {
  constructor() {
    this.history = [];
  }

  async sendMessage(message) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: this.history,
          model: "gemini-2.0-flash",
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [
            { googleSearch: {} },
            { 
              functionDeclarations: [
                openApplicationDecl, 
                playMusicDecl, 
                executeSystemCommandDecl, 
                analyzeCameraDecl, 
                controlMediaDecl, 
                showNewsDecl
              ] 
            }
          ],
          toolConfig: { includeServerSideToolInvocations: true }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI Bridge link failed.');
      }

      const data = await response.json();
      
      // Update local history
      if (typeof message === 'string') {
        this.history.push({ role: 'user', parts: [{ text: message }] });
      } else {
        this.history.push({ role: 'user', parts: message });
      }

      const aiParts = [];
      if (data.text) aiParts.push({ text: data.text });
      if (data.functionCalls) {
        data.functionCalls.forEach(call => {
          aiParts.push({ functionCall: call });
        });
      }
      this.history.push({ role: 'model', parts: aiParts });

      // Match the SDK result structure for compatibility with App.jsx
      return {
        response: {
          text: () => data.text,
          functionCalls: () => data.functionCalls
        }
      };
    } catch (error) {
      console.error("[AI INTERACTION ERROR]", error);
      throw error;
    }
  }
}

export function createNewChat() {
  return new ChatProxy();
}
