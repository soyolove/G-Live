import { Router } from 'express';
import { z } from 'zod';

const DanmakuSubmitSchema = z.object({
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  platform: z.string().default('api'),
  roomId: z.string(),
  metadata: z.record(z.any()).optional()
});

export function createDanmakuRouter(danmakuPump: ReturnType<typeof import('../controllers/DanmakuPump.js').createDanmakuPump>): Router {
  const router = Router();

  // Submit single danmaku
  router.post('/danmaku', (req, res) => {
    try {
      const data = DanmakuSubmitSchema.parse(req.body);
      
      danmakuPump.emitDanmaku({
        id: `api-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        ...data
      });

      res.json({
        success: true,
        message: 'Danmaku submitted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  });

  // Submit multiple danmakus
  router.post('/danmaku/batch', (req, res) => {
    try {
      const danmakus = z.array(DanmakuSubmitSchema).parse(req.body);
      
      const processedDanmakus = danmakus.map((d, index) => ({
        id: `api-batch-${Date.now()}-${index}`,
        ...d
      }));

      danmakuPump.emitMultipleDanmakus(processedDanmakus);

      res.json({
        success: true,
        message: `${danmakus.length} danmakus submitted successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  });

  return router;
}