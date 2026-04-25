import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority } from './task.types';
import { listTasks, getTask, createTask, updateTask, deleteTask } from './task.service';

const router = Router();
router.use(requireAuth);

/** GET /tasks — list authenticated user's tasks with optional filters. */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, priority } = req.query as Record<string, string>;

    if (status && !TASK_STATUSES.includes(status as TaskStatus)) {
      res.status(400).json({ error: `Invalid status. Valid values: ${TASK_STATUSES.join(', ')}` });
      return;
    }
    if (priority && !TASK_PRIORITIES.includes(priority as TaskPriority)) {
      res.status(400).json({ error: `Invalid priority. Valid values: ${TASK_PRIORITIES.join(', ')}` });
      return;
    }

    const tasks = await listTasks(req.userId!, { status: status as TaskStatus, priority: priority as TaskPriority });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

/** POST /tasks — create a new task. */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await createTask(req.userId!, req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

/** GET /tasks/:id — retrieve a single task. */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await getTask(req.params.id, req.userId!);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

/** PUT /tasks/:id — update task fields. */
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await updateTask(req.params.id, req.userId!, req.body);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

/** DELETE /tasks/:id — permanently remove a task. */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteTask(req.params.id, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
