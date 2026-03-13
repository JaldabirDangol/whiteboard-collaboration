import { createUser } from "@/controllers/user/userController.js";
import { Router } from "express";

const userRoutes:Router = Router();

userRoutes.route("/signup").post(createUser);


export default userRoutes;