import express from 'express';
import authRouter from './auth/auth.routes';
import taskRouter from './tasks/task.routes';
import tagRouter from './tags/tag.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api', tagRouter);

app.use(errorHandler);

export default app;
