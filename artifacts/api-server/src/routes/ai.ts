import { Router } from "express";
import OpenAI from "openai";
import { db, knowledgeDocsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getKnowledgeContext(): Promise<string> {
  try {
    const docs = await db
      .select()
      .from(knowledgeDocsTable)
      .orderBy(knowledgeDocsTable.category, knowledgeDocsTable.title);
    if (docs.length === 0) return "";
    const sections = docs.map(
      (d) => `## ${d.title} [${d.category}]\n${d.content}`
    );
    return `\n\n--- DUOLLANCE KNOWLEDGE BASE ---\n${sections.join("\n\n")}\n--- END KNOWLEDGE BASE ---`;
  } catch {
    return "";
  }
}

const DUOLLANCE_BRAND_CONTEXT = `You are an expert on Duollance, an AI-powered smart-match freelance platform.
Duollance connects businesses with pre-vetted freelance talent through AI matching — clients submit a project brief and the system shortlists the best-fit talents. It is NOT a marketplace or gig platform (not like Upwork or Fiverr).
Brand voice: confident, professional, concise, human, never salesy. Tagline: "Real work. Real value. Real people."
Pillars: HR Support, Integrated AI features, Authentic Partnerships.`;

// POST /api/ai/refine — refine a template with custom instruction (SSE)
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
    const knowledgeContext = await getKnowledgeContext();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `${DUOLLANCE_BRAND_CONTEXT}${knowledgeContext}

Your job is to refine message templates used by the HR and growth team for client acquisition outreach.
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

// POST /api/ai/chat — HR knowledge chatbot (SSE)
router.post("/chat", async (req, res) => {
  const { messages } = req.body as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const knowledgeContext = await getKnowledgeContext();

    const systemPrompt = `${DUOLLANCE_BRAND_CONTEXT}${knowledgeContext}

You are the Duollance internal AI assistant helping the HR and growth team. Answer questions accurately and concisely based on your knowledge of Duollance. If you don't know something, say so honestly rather than guessing. Keep responses focused and practical — the team is busy and needs fast, reliable answers.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
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
    logger.error(err, "AI chat error");
    res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
    res.end();
  }
});

// POST /api/ai/suggest-category — suggest a category based on template title (non-streaming)
router.post("/suggest-category", async (req, res) => {
  const { title, categories } = req.body as {
    title?: string;
    categories?: Array<{ id: number; name: string }>;
  };

  if (!title || !categories || categories.length === 0) {
    res.status(400).json({ error: "title and categories are required" });
    return;
  }

  try {
    const categoryList = categories.map((c) => `- ID ${c.id}: ${c.name}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 20,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant for an HR team that writes outreach message templates. Given a template title, pick the single most appropriate category from the provided list. Reply with ONLY the numeric category ID — nothing else.`,
        },
        {
          role: "user",
          content: `Template title: "${title}"\n\nAvailable categories:\n${categoryList}\n\nRespond with only the category ID number.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const categoryId = parseInt(raw, 10);
    const matched = categories.find((c) => c.id === categoryId);

    if (!matched) {
      res.status(422).json({ error: "Could not determine a category" });
      return;
    }

    res.json({ categoryId: matched.id, categoryName: matched.name });
  } catch (err) {
    logger.error(err, "AI suggest-category error");
    res.status(500).json({ error: "Suggestion failed" });
  }
});

export default router;
