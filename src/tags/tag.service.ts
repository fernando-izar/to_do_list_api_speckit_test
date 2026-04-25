import pool from '../db/client';
import { Tag, CreateTagInput } from './tag.types';

/** Maps a database row to a Tag object. */
function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

/** Returns all tags belonging to the given user. */
export async function listTags(userId: string): Promise<Tag[]> {
  const result = await pool.query(
    'SELECT id, name, created_at FROM tags WHERE user_id = $1 ORDER BY name',
    [userId],
  );
  return result.rows.map(rowToTag);
}

/** Creates a new tag for the given user. Throws 409 if name already exists for that user. */
export async function createTag(userId: string, input: CreateTagInput): Promise<Tag> {
  if (!input.name?.trim()) {
    throw Object.assign(new Error('name is required'), { status: 400 });
  }
  try {
    const result = await pool.query(
      'INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [userId, input.name.trim()],
    );
    return rowToTag(result.rows[0]);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      throw Object.assign(new Error('Tag name already exists'), { status: 409 });
    }
    throw err;
  }
}

/** Deletes a tag owned by the given user. Throws 404 if not found. */
export async function deleteTag(tagId: string, userId: string): Promise<void> {
  const result = await pool.query(
    'DELETE FROM tags WHERE id = $1 AND user_id = $2',
    [tagId, userId],
  );
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Tag not found'), { status: 404 });
  }
}

/** Associates a tag with a task. Idempotent — silently ignores if already associated. */
export async function addTagToTask(taskId: string, tagId: string, userId: string): Promise<void> {
  const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);
  if (taskCheck.rowCount === 0) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }

  const tagCheck = await pool.query('SELECT id FROM tags WHERE id = $1 AND user_id = $2', [tagId, userId]);
  if (tagCheck.rowCount === 0) {
    throw Object.assign(new Error('Tag not found'), { status: 404 });
  }

  await pool.query(
    'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [taskId, tagId],
  );
}

/** Removes a tag association from a task. Throws 404 if task or tag not found. */
export async function removeTagFromTask(taskId: string, tagId: string, userId: string): Promise<void> {
  const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);
  if (taskCheck.rowCount === 0) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }

  const result = await pool.query(
    'DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2',
    [taskId, tagId],
  );
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Tag association not found'), { status: 404 });
  }
}
