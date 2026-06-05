import { Router } from "express";
import { db, categoriesTable, templatesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { GetTopTemplatesQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalTemplates: sql<number>`cast(count(*) as integer)`,
        totalUses: sql<number>`cast(coalesce(sum(${templatesTable.usageCount}), 0) as integer)`,
        favoritedCount: sql<number>`cast(sum(case when ${templatesTable.isFavorited} then 1 else 0 end) as integer)`,
      })
      .from(templatesTable);

    const [catTotal] = await db
      .select({ totalCategories: sql<number>`cast(count(*) as integer)` })
      .from(categoriesTable);

    const channelRows = await db
      .select({
        channels: templatesTable.channels,
      })
      .from(templatesTable);

    const channelMap: Record<string, number> = {};
    for (const row of channelRows) {
      for (const ch of row.channels ?? []) {
        channelMap[ch] = (channelMap[ch] ?? 0) + 1;
      }
    }
    const channelBreakdown = Object.entries(channelMap)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count);

    const categoryBreakdown = await db
      .select({
        categoryId: categoriesTable.id,
        categoryName: categoriesTable.name,
        count: sql<number>`cast(count(${templatesTable.id}) as integer)`,
      })
      .from(categoriesTable)
      .leftJoin(templatesTable, eq(categoriesTable.id, templatesTable.categoryId))
      .groupBy(categoriesTable.id)
      .orderBy(desc(sql`count(${templatesTable.id})`));

    res.json({
      totalTemplates: totals?.totalTemplates ?? 0,
      totalCategories: catTotal?.totalCategories ?? 0,
      totalUses: totals?.totalUses ?? 0,
      favoritedCount: totals?.favoritedCount ?? 0,
      channelBreakdown,
      categoryBreakdown,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/top-templates", async (req, res) => {
  const parsed = GetTopTemplatesQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 5) : 5;
  try {
    const rows = await db
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
      .orderBy(desc(templatesTable.usageCount))
      .limit(limit);

    res.json(
      rows.map((t) => ({
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
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get top templates" });
  }
});

export default router;
