import pool from '../db/client';
import { Task, CreateTaskInput, UpdateTaskInput, ListTasksFilter, TASK_STATUSES, TASK_PRIORITIES } from './task.types';

const TASK_SELECT = `
  SELECT t.id, t.title, t.description, t.status, t.priority, t.created_at, t.updated_at,
    COALESCE(
      json_agg(json_build_object('id', tg.id, 'name', tg.name)) FILTER (WHERE tg.id IS NOT NULL),
      '[]'
    ) AS tags
  FROM tasks t
  LEFT JOIN task_tags tt ON tt.task_id = t.id
  LEFT JOIN tags tg ON tg.id = tt.tag_id
`;

/** Maps a database row to a Task object. */
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    tags: row.tags as Task['tags'],
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/** Returns all tasks belonging to the given user, with optional status/priority filters. */
export async function listTasks(userId: string, filter: ListTasksFilter = {}): Promise<Task[]> {
  const params: unknown[] = [userId];
  const conditions = ['t.user_id = $1'];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (filter.priority) {
    params.push(filter.priority);
    conditions.push(`t.priority = $${params.length}`);
  }

  const query = `${TASK_SELECT} WHERE ${conditions.join(' AND ')} GROUP BY t.id ORDER BY t.created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows.map(rowToTask);
}

/** Returns a single task by id, enforcing user ownership. Throws 404 if not found. */
export async function getTask(taskId: string, userId: string): Promise<Task> {
  const query = `${TASK_SELECT} WHERE t.id = $1 AND t.user_id = $2 GROUP BY t.id`;
  const result = await pool.query(query, [taskId, userId]);
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }
  return rowToTask(result.rows[0]);
}

/** Creates a new task for the given user. Throws 400 if title is empty. */
export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  if (!input.title?.trim()) {
    throw Object.assign(new Error('title is required'), { status: 400 });
  }
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description, status, priority)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, input.title.trim(), input.description ?? null, input.status ?? 'pendente', input.priority ?? 'media'],
  );
  return getTask(result.rows[0].id, userId);
}

/** Updates allowed fields of a task. Throws 400 on invalid enum values or 404 if not found. */
export async function updateTask(taskId: string, userId: string, input: UpdateTaskInput): Promise<Task> {
  await getTask(taskId, userId);

  if (input.status && !TASK_STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`Invalid status. Valid values: ${TASK_STATUSES.join(', ')}`), { status: 400 });
  }
  if (input.priority && !TASK_PRIORITIES.includes(input.priority)) {
    throw Object.assign(new Error(`Invalid priority. Valid values: ${TASK_PRIORITIES.join(', ')}`), { status: 400 });
  }

  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.title !== undefined) { params.push(input.title); fields.push(`title = $${params.length}`); }
  if (input.description !== undefined) { params.push(input.description); fields.push(`description = $${params.length}`); }
  if (input.status !== undefined) { params.push(input.status); fields.push(`status = $${params.length}`); }
  if (input.priority !== undefined) { params.push(input.priority); fields.push(`priority = $${params.length}`); }

  if (fields.length > 0) {
    params.push(taskId);
    fields.push(`updated_at = NOW()`);
    await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
  }

  return getTask(taskId, userId);
}

/** Permanently deletes a task. Throws 404 if not found or owned by another user. */
export async function deleteTask(taskId: string, userId: string): Promise<void> {
  await getTask(taskId, userId);
  await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);
}
