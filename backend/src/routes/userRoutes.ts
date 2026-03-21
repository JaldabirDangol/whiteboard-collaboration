import { Signup } from "@/controllers/auth/authController.js";
import { Router } from "express";

const userRoutes:Router = Router();

userRoutes.route("/signup").post(Signup);


export default userRoutes;