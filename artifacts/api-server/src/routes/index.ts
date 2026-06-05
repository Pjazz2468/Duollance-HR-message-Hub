import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import templatesRouter from "./templates";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/templates", templatesRouter);
router.use("/stats", statsRouter);

export default router;
