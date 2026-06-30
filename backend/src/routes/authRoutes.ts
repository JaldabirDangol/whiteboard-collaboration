import { Router } from "express";

const authRoutes: Router = Router();

import { Signup, Login, Logout, ForgotPassword, ResetPassword } from "@/controllers/auth/authController.js";

authRoutes.route("/signup").post(Signup);
authRoutes.route("/login").post(Login);
authRoutes.route("/logout").post(Logout);
authRoutes.route("/forgot-password").post(ForgotPassword);
authRoutes.route("/reset-password").post(ResetPassword);

export default authRoutes;