import { Router } from 'express';
import { upload } from '../../shared/middleware/upload-handler'; // Multer 미들웨어
import { postUpload } from '../upload/upload.controller'; // 최종 컨트롤러

const MULTER_IMAGE_PATH = 'file';
const router = Router();

// /upload 경로에만 미들웨어 적용
router.post('/upload', upload.single(MULTER_IMAGE_PATH), postUpload);

export default router;
