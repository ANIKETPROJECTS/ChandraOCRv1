import { Router, type IRouter } from "express";
import healthRouter from "./health";
import extractRouter from "./extract";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(extractRouter);
router.use(profilesRouter);

export default router;
