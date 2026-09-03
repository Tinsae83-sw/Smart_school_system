/**
 * Free LLM client with SSE streaming support.
 *
 * Supports two free providers (selected with LLM_PROVIDER):
 *   - groq   : Groq free tier. Needs GROQ_API_KEY (https://console.groq.com).
 *   - ollama : Local Ollama server. No API key, requires Ollama running
 *              (https://ollama.com) with a model pulled, e.g. `ollama pull llama3.1`.
 *
 * Both are called through their OpenAI-compatible chat completions endpoint so
 * the streaming response format is identical.
 */

const PROVIDERS = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: () => {
      const key = process.env.GROQ_API_KEY;
      if (!key) {
        throw new Error(
          "GROQ_API_KEY is not set. Get a free key at https://console.groq.com and add it to backend/.env."
        );
      }
      return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
    },
    model: () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  ollama: {
    url: () => `${(process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "")}/v1/chat/completions`,
    headers: () => ({ "Content-Type": "application/json" }),
    model: () => process.env.OLLAMA_MODEL || "llama3.1",
  },
};

function providerConfig() {
  const name = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown LLM_PROVIDER "${name}". Use "groq" or "ollama" in backend/.env.`
    );
  }
  return {
    name,
    url: typeof provider.url === "function" ? provider.url() : provider.url,
    headers: provider.headers(),
    model: provider.model(),
  };
}

/**
 * Stream a chat completion. Yields content deltas as they arrive.
 * Messages follow the OpenAI format: [{ role, content }, ...].
 */
async function* streamChat(messages, { signal } = {}) {
  const cfg = providerConfig();

  let res;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: cfg.headers,
      signal,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error(
      `Could not reach the LLM provider (${cfg.name}) at ${cfg.url}. ` +
        (cfg.name === "ollama"
          ? "Is Ollama running? Start it and run: ollama pull llama3.1"
          : "Check your GROQ_API_KEY and internet connection.")
    );
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices && json.choices[0].delta && json.choices[0].delta.content;
        if (delta) yield delta;
      } catch {
        /* skip keep-alive / partial lines */
      }
    }
  }
}

module.exports = { streamChat, providerConfig };