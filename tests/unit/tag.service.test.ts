jest.mock('../../src/db/client', () => ({ __esModule: true, default: { query: jest.fn() } }));

import pool from '../../src/db/client';
import { listTags, createTag, deleteTag, addTagToTask, removeTagFromTask } from '../../src/tags/tag.service';

const mockQuery = pool.query as jest.Mock;
const now = new Date();
const tagRow = { id: 'tag-1', name: 'work', created_at: now };

beforeEach(() => mockQuery.mockReset());

describe('listTags', () => {
  it('returns tags for the user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [tagRow] });
    const tags = await listTags('user-1');
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe('work');
  });
});

describe('createTag', () => {
  it('creates and returns a tag', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [tagRow] });
    const tag = await createTag('user-1', { name: 'work' });
    expect(tag.id).toBe('tag-1');
    expect(tag.name).toBe('work');
  });

  it('throws 400 for empty name', async () => {
    await expect(createTag('user-1', { name: '' })).rejects.toMatchObject({ status: 400 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 409 for duplicate tag name (unique constraint)', async () => {
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('unique violation'), { code: '23505' }));
    await expect(createTag('user-1', { name: 'work' })).rejects.toMatchObject({ status: 409 });
  });

  it('rethrows unexpected db errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection error'));
    await expect(createTag('user-1', { name: 'work' })).rejects.toThrow('connection error');
  });
});

describe('deleteTag', () => {
  it('deletes a tag successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteTag('tag-1', 'user-1')).resolves.toBeUndefined();
  });

  it('throws 404 when tag not found or wrong owner', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    await expect(deleteTag('tag-1', 'other')).rejects.toMatchObject({ status: 404 });
  });
});

describe('addTagToTask', () => {
  it('associates a tag with a task', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't-1' }], rowCount: 1 }) // task check
      .mockResolvedValueOnce({ rows: [{ id: 'tag-1' }], rowCount: 1 }) // tag check
      .mockResolvedValueOnce({ rows: [] }); // insert
    await expect(addTagToTask('t-1', 'tag-1', 'user-1')).resolves.toBeUndefined();
  });

  it('is idempotent (ON CONFLICT DO NOTHING)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'tag-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // conflict ignored
    await expect(addTagToTask('t-1', 'tag-1', 'user-1')).resolves.toBeUndefined();
  });

  it('throws 404 when task not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(addTagToTask('t-1', 'tag-1', 'user-1')).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 when tag not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(addTagToTask('t-1', 'tag-1', 'user-1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('removeTagFromTask', () => {
  it('removes a tag from a task', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });
    await expect(removeTagFromTask('t-1', 'tag-1', 'user-1')).resolves.toBeUndefined();
  });

  it('throws 404 when task not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(removeTagFromTask('t-1', 'tag-1', 'user-1')).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 when association not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 });
    await expect(removeTagFromTask('t-1', 'tag-1', 'user-1')).rejects.toMatchObject({ status: 404 });
  });
});
