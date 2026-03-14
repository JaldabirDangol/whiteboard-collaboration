import { Router } from "express";

const authRoutes: Router = Router();

import { Signup, Login, Logout } from "@/controllers/auth/authController.js";

authRoutes.route("/signup").post(Signup);
authRoutes.route("/login").post(Login);
authRoutes.route("/logout").post(Logout);

export default authRoutes;