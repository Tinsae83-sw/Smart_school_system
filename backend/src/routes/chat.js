const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth");
const { streamChat, providerConfig } = require("../utils/llm");
const { buildSystemPrompt } = require("../utils/assistant");

const router = express.Router();

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is empty.").max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(50)
    .optional()
    .default([]),
});

router.post("/", authenticate, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid request." });
  }

  let config;
  try {
    config = providerConfig();
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }

  let system;
  try {
    system = await buildSystemPrompt(req.user);
  } catch (err) {
    console.error("Failed to build assistant prompt:", err.message);
    system = "You are the EduConnect AI Assistant.";
  }

  const { message, history } = parsed.data;
  const messages = [
    { role: "system", content: system },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    for await (const delta of streamChat(messages, { signal: controller.signal })) {
      if (res.writableEnded || res.destroyed) break;
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  } catch (err) {
    console.error("Chat stream error:", err.message);
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  } finally {
    if (!res.writableEnded && !res.destroyed) res.end();
  }
});

module.exports = router;