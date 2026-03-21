import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driversRouter from "./drivers";
import ridesRouter from "./rides";
import billingRouter from "./billing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driversRouter);
router.use(ridesRouter);
router.use(billingRouter);

export default router;
