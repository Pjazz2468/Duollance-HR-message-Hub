import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { templatesTable } from "@workspace/db";
import { CreateCategoryBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        color: categoriesTable.color,
        description: categoriesTable.description,
        createdAt: categoriesTable.createdAt,
        templateCount: sql<number>`cast(count(${templatesTable.id}) as integer)`,
      })
      .from(categoriesTable)
      .leftJoin(templatesTable, eq(categoriesTable.id, templatesTable.categoryId))
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.name);

    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, color, description } = parsed.data;
  try {
    const [cat] = await db
      .insert(categoriesTable)
      .values({ name, color: color ?? "#2B2EFF", description: description ?? null })
      .returning();
    res.status(201).json({ ...cat, templateCount: 0, createdAt: cat.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const deleted = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
