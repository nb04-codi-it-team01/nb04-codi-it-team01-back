import { Strategy as LocalStrategy } from "passport-local";
import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import {AuthService} from "./authService.ts";

const authService = new AuthService(prisma); // 의존성 주입

type veriftCb = (error: any, user?:any, info?: any ) => void;

export const localStrategy = new LocalStrategy(
	{
		usernameField: "email",
		passwordField: "password"
	}
	async (email: string, password: string, cb: verifyCb) =>{
		try{
			const user = await prisma.user.findUnique({
				where: email
			})
			if (!user || !user.password) return cb( null, false, { message: "해당 유저가 존재하지 않습니다.."})

			const isMatched = await bcrypt.compare(password, user.password);
			if(!isMatched){
			       	return cb(null, false,{ message: "잘못된 비밀번호입니다."});
			}else{
				cb(null, user)
			}

		}catch(error){
			cb(error)
		}
	}
)
