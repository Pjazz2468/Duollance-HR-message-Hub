import { Router } from "express";
import { db, knowledgeDocsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateKnowledgeDocBody,
  UpdateKnowledgeDocParams,
  UpdateKnowledgeDocBody,
  DeleteKnowledgeDocParams,
} from "@workspace/api-zod";

const router = Router();

function fmt(d: typeof knowledgeDocsTable.$inferSelect) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(knowledgeDocsTable)
      .orderBy(knowledgeDocsTable.category, knowledgeDocsTable.title);
    res.json(rows.map(fmt));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list knowledge docs" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateKnowledgeDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { title, content, category } = parsed.data;
  try {
    const [doc] = await db
      .insert(knowledgeDocsTable)
      .values({ title, content, category: category ?? "General" })
      .returning();
    res.status(201).json(fmt(doc));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create knowledge doc" });
  }
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateKnowledgeDocParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateKnowledgeDocBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { id } = paramParsed.data;
  try {
    const [updated] = await db
      .update(knowledgeDocsTable)
      .set({ ...bodyParsed.data, updatedAt: new Date() })
      .where(eq(knowledgeDocsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Knowledge doc not found" });
      return;
    }
    res.json(fmt(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update knowledge doc" });
  }
});

router.delete("/:id", async (req, res) => {
  const paramParsed = DeleteKnowledgeDocParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = paramParsed.data;
  try {
    const deleted = await db
      .delete(knowledgeDocsTable)
      .where(eq(knowledgeDocsTable.id, id))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Knowledge doc not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete knowledge doc" });
  }
});

export default router;
