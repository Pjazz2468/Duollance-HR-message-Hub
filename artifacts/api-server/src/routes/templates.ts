import { Router } from "express";
import { db, categoriesTable, templatesTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  ListTemplatesQueryParams,
  CreateTemplateBody,
  UpdateTemplateBody,
  GetTemplateParams,
  UpdateTemplateParams,
  DeleteTemplateParams,
  RecordTemplateUseParams,
  ToggleFavoriteParams,
} from "@workspace/api-zod";

const router = Router();

function formatTemplate(t: typeof templatesTable.$inferSelect & { categoryName?: string | null; categoryColor?: string | null }) {
  return {
    id: t.id,
    title: t.title,
    content: t.content,
    categoryId: t.categoryId,
    categoryName: t.categoryName ?? null,
    categoryColor: t.categoryColor ?? null,
    channels: t.channels ?? [],
    tags: t.tags ?? [],
    usageCount: t.usageCount,
    isFavorited: t.isFavorited,
    createdAt: (t.createdAt as Date).toISOString(),
    updatedAt: (t.updatedAt as Date).toISOString(),
  };
}

router.get("/", async (req, res) => {
  const parsed = ListTemplatesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { categoryId, channel, search, favorited } = parsed.data;

  try {
    const conditions = [];
    if (categoryId !== undefined) conditions.push(eq(templatesTable.categoryId, categoryId));
    if (favorited !== undefined) conditions.push(eq(templatesTable.isFavorited, favorited));
    if (search) {
      conditions.push(ilike(templatesTable.title, `%${search}%`));
    }

    let rows = await db
      .select({
        id: templatesTable.id,
        title: templatesTable.title,
        content: templatesTable.content,
        categoryId: templatesTable.categoryId,
        categoryName: categoriesTable.name,
        categoryColor: categoriesTable.color,
        channels: templatesTable.channels,
        tags: templatesTable.tags,
        usageCount: templatesTable.usageCount,
        isFavorited: templatesTable.isFavorited,
        createdAt: templatesTable.createdAt,
        updatedAt: templatesTable.updatedAt,
      })
      .from(templatesTable)
      .leftJoin(categoriesTable, eq(templatesTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(templatesTable.createdAt);

    if (channel) {
      rows = rows.filter((r) => r.channels.includes(channel));
    }

    res.json(rows.map(formatTemplate));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list templates" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { title, content, categoryId, channels, tags } = parsed.data;
  try {
    const [t] = await db
      .insert(templatesTable)
      .values({ title, content, categoryId, channels: channels ?? [], tags: tags ?? [] })
      .returning();

    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, t.categoryId));
    res.status(201).json(formatTemplate({ ...t, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/:id", async (req, res) => {
  const paramParsed = GetTemplateParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = paramParsed.data;
  try {
    const [row] = await db
      .select({
        id: templatesTable.id,
        title: templatesTable.title,
        content: templatesTable.content,
        categoryId: templatesTable.categoryId,
        categoryName: categoriesTable.name,
        categoryColor: categoriesTable.color,
        channels: templatesTable.channels,
        tags: templatesTable.tags,
        usageCount: templatesTable.usageCount,
        isFavorited: templatesTable.isFavorited,
        createdAt: templatesTable.createdAt,
        updatedAt: templatesTable.updatedAt,
      })
      .from(templatesTable)
      .leftJoin(categoriesTable, eq(templatesTable.categoryId, categoriesTable.id))
      .where(eq(templatesTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(formatTemplate(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get template" });
  }
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateTemplateParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { id } = paramParsed.data;
  const updates = parsed.data;
  try {
    const [updated] = await db
      .update(templatesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templatesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId));
    res.json(formatTemplate({ ...updated, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/:id", async (req, res) => {
  const paramParsed = DeleteTemplateParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = paramParsed.data;
  try {
    const deleted = await db.delete(templatesTable).where(eq(templatesTable.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

router.post("/:id/use", async (req, res) => {
  const paramParsed = RecordTemplateUseParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = paramParsed.data;
  try {
    const [updated] = await db
      .update(templatesTable)
      .set({ usageCount: sql`${templatesTable.usageCount} + 1` })
      .where(eq(templatesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId));
    res.json(formatTemplate({ ...updated, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to record usage" });
  }
});

router.patch("/:id/favorite", async (req, res) => {
  const paramParsed = ToggleFavoriteParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = paramParsed.data;
  try {
    const [current] = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
    if (!current) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const [updated] = await db
      .update(templatesTable)
      .set({ isFavorited: !current.isFavorited })
      .where(eq(templatesTable.id, id))
      .returning();

    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId));
    res.json(formatTemplate({ ...updated, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

export default router;
