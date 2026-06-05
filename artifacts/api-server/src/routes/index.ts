import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import templatesRouter from "./templates";
import statsRouter from "./stats";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/templates", templatesRouter);
router.use("/stats", statsRouter);
router.use("/ai", aiRouter);

export default router;
