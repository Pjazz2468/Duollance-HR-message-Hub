import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/refine", async (req, res) => {
  const { templateContent, instruction } = req.body as {
    templateContent?: string;
    instruction?: string;
  };

  if (!templateContent || !instruction) {
    res.status(400).json({ error: "templateContent and instruction are required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a professional copywriter for Duollance, an AI-powered smart-match freelance platform. 
Your job is to refine message templates used by the HR and growth team for client acquisition outreach.
Duollance's brand voice is: confident, professional, concise, human, and never salesy. Tagline: "Real work. Real value. Real people."
When refining, preserve the core message intent and any {variable} placeholders exactly as-is.
Return ONLY the refined message text — no preamble, no "Here is the refined version:", no explanation.`,
        },
        {
          role: "user",
          content: `Here is the original template:\n\n${templateContent}\n\nInstruction: ${instruction}`,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error(err, "AI refine error");
    res.write(`data: ${JSON.stringify({ error: "AI refinement failed" })}\n\n`);
    res.end();
  }
});

export default router;
