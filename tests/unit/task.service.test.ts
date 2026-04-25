jest.mock('../../src/db/client', () => ({ __esModule: true, default: { query: jest.fn() } }));

import pool from '../../src/db/client';
import { listTasks, getTask, createTask, updateTask, deleteTask } from '../../src/tasks/task.service';

const mockQuery = pool.query as jest.Mock;

const now = new Date();
const taskRow = {
  id: 't-1', title: 'Test', description: null,
  status: 'pendente', priority: 'media', tags: [],
  created_at: now, updated_at: now,
};

beforeEach(() => mockQuery.mockReset());

describe('listTasks', () => {
  it('returns tasks for a user with no filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [taskRow] });
    const result = await listTasks('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t-1');
    const sql: string = mockQuery.mock.calls[0][0];
    expect(sql).not.toContain('status =');
    expect(sql).not.toContain('priority =');
  });

  it('applies status filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await listTasks('user-1', { status: 'concluida' });
    expect(mockQuery.mock.calls[0][1]).toContain('concluida');
  });

  it('applies priority filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await listTasks('user-1', { priority: 'alta' });
    expect(mockQuery.mock.calls[0][1]).toContain('alta');
  });

  it('applies both filters simultaneously', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await listTasks('user-1', { status: 'pendente', priority: 'baixa' });
    const params: unknown[] = mockQuery.mock.calls[0][1];
    expect(params).toContain('pendente');
    expect(params).toContain('baixa');
  });
});

describe('getTask', () => {
  it('returns the task when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 });
    const task = await getTask('t-1', 'user-1');
    expect(task.id).toBe('t-1');
  });

  it('throws 404 when not found or wrong owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(getTask('t-1', 'other')).rejects.toMatchObject({ status: 404 });
  });
});

describe('createTask', () => {
  it('creates and returns a task', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't-1' }] })   // INSERT
      .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 }); // getTask SELECT
    const task = await createTask('user-1', { title: 'New task' });
    expect(task.id).toBe('t-1');
  });

  it('throws 400 for empty title', async () => {
    await expect(createTask('user-1', { title: '' })).rejects.toMatchObject({ status: 400 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 400 for whitespace-only title', async () => {
    await expect(createTask('user-1', { title: '   ' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('updateTask', () => {
  it('updates and returns the task', async () => {
    const updated = { ...taskRow, status: 'em_andamento' };
    mockQuery
      .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 })   // getTask (ownership check)
      .mockResolvedValueOnce({ rows: [] })                        // UPDATE
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 });   // getTask (return)
    const task = await updateTask('t-1', 'user-1', { status: 'em_andamento' });
    expect(task.status).toBe('em_andamento');
  });

  it('throws 400 for invalid status enum', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 });
    await expect(updateTask('t-1', 'user-1', { status: 'invalido' as never })).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 for invalid priority enum', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 });
    await expect(updateTask('t-1', 'user-1', { priority: 'urgente' as never })).rejects.toMatchObject({ status: 400 });
  });

  it('skips UPDATE when no fields provided', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 });
    await updateTask('t-1', 'user-1', {});
    expect(mockQuery).toHaveBeenCalledTimes(2); // only getTask twice, no UPDATE
  });
});

describe('deleteTask', () => {
  it('deletes a task successfully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] });
    await expect(deleteTask('t-1', 'user-1')).resolves.toBeUndefined();
  });

  it('throws 404 if task not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(deleteTask('t-1', 'other')).rejects.toMatchObject({ status: 404 });
  });
});
