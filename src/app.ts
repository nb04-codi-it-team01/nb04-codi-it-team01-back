import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './lib/passport/index.js';
import authRoute from './features/auth/auth.routes.js';
export const app = express();

app.use(cookieParser);
app.use(express.json());
app.use(passport.initialize());
app.use('/api', authRoute);
