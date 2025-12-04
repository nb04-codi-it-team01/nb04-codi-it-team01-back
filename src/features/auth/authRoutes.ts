import express from "express";
import type{ Request, Response, NextFunction} from "express"
import { AuthController } from "./authController.ts" 
import { loginValidate } from "./authValidtor.ts"
const router = express.router();
const authController = new AuthController ();


// 로그인 API 
//[POST] /api/auth/login router

router.post(
	"/auth/login",
        loginValidate,
	async(req: Request, res: Response, next: NextFunction) =>
       	authController.createUser(req, res, next)
)

// 로그아웃 API
// [POST] /api/auth/logout

router.post(
	"/auth/logout", async (req:Request, res: Response, next: NextFunction) =>
	authController.logoutUser(req, res, next)
)
// 리프레시 API
// [POST] /api/auth/refresh

router.post(
	"/auth/refresh", async(req: Request, res: Response, next: NextFucntion) =>
	authController.handleToknenRefresh(req, res, next)
)
