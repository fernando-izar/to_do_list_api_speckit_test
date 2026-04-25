import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { listTags, createTag, deleteTag, addTagToTask, removeTagFromTask } from './tag.service';

const router = Router();
router.use(requireAuth);

/** GET /tags — list all tags for the authenticated user. */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tags = await listTags(req.userId!);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

/** POST /tags — create a new tag. */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tag = await createTag(req.userId!, req.body);
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
});

/** DELETE /tags/:id — remove a tag (cascades to task associations). */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteTag(req.params.id, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/** POST /tasks/:taskId/tags/:tagId — associate a tag with a task (idempotent). */
router.post('/tasks/:taskId/tags/:tagId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await addTagToTask(req.params.taskId, req.params.tagId, req.userId!);
    res.status(200).send();
  } catch (err) {
    next(err);
  }
});

/** DELETE /tasks/:taskId/tags/:tagId — remove a tag from a task. */
router.delete('/tasks/:taskId/tags/:tagId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await removeTagFromTask(req.params.taskId, req.params.tagId, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
