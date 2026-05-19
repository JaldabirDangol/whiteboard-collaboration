import { Router } from "express";
import * as userController from "@/controllers/user/userController.js";

const userRoutes: Router = Router();

userRoutes.get("/email", userController.getUserByEmail);
userRoutes.patch("/me", userController.updateUser);
userRoutes.delete("/me", userController.deleteUser);
userRoutes.get("/role", userController.getUserBoardRole);

export default userRoutes;