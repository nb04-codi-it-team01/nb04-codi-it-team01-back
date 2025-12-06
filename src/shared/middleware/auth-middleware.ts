import type { Request, Response, NextFunction } from 'express' 

async function authenticate (req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()){
    return res.status(401).json({message: '인증되지 않았습니다'});
  }
  next();
}
export default authenticate;
