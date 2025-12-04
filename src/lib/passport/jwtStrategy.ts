import { type StrategyOptions, type VerifiedCallback,Strategy as JwtStrategy } from 'passport-jwt'; 
import { ExtractJwt } from 'passport-jwt';
import {JWT_ACCESS_TOKEN_SECRET, JWT_REFRESH_TOKEN_SECRET } from '../constants.ts';
import prisma from '../prisma.ts'

interface JwtPayloadInterface {
	sub:,
	email:,
	exp:.
	iat:
}
