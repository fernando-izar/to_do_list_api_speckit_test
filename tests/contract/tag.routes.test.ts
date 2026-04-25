jest.mock('../../src/tags/tag.service');
jest.mock('../../src/db/client', () => ({ __esModule: true, default: { query: jest.fn() } }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { listTags, createTag, deleteTag, addTagToTask, removeTagFromTask } from '../../src/tags/tag.service';

const mockList = listTags as jest.Mock;
const mockCreate = createTag as jest.Mock;
const mockDelete = deleteTag as jest.Mock;
const mockAdd = addTagToTask as jest.Mock;
const mockRemove = removeTagFromTask as jest.Mock;

const token = () => `Bearer ${jwt.sign({ sub: 'user-1' }, process.env.JWT_ACCESS_SECRET!)}`;
const tag = { id: 'tag-1', name: 'work', createdAt: new Date().toISOString() };

beforeEach(() => {
  mockList.mockReset();
  mockCreate.mockReset();
  mockDelete.mockReset();
  mockAdd.mockReset();
  mockRemove.mockReset();
});

describe('GET /api/tags', () => {
  it('returns 200 with tag list', async () => {
    mockList.mockResolvedValue([tag]);
    const res = await request(app).get('/api/tags').set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/tags', () => {
  it('returns 201 with created tag', async () => {
    mockCreate.mockResolvedValue(tag);
    const res = await request(app).post('/api/tags').set('Authorization', token()).send({ name: 'work' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('work');
  });

  it('returns 400 for empty name', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('name is required'), { status: 400 }));
    const res = await request(app).post('/api/tags').set('Authorization', token()).send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate tag name', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('Tag name already exists'), { status: 409 }));
    const res = await request(app).post('/api/tags').set('Authorization', token()).send({ name: 'work' });
    expect(res.status).toBe(409);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/tags').send({ name: 'work' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/tags/:id', () => {
  it('returns 204 on success', async () => {
    mockDelete.mockResolvedValue(undefined);
    const res = await request(app).delete('/api/tags/tag-1').set('Authorization', token());
    expect(res.status).toBe(204);
  });

  it('returns 404 when tag not found', async () => {
    mockDelete.mockRejectedValue(Object.assign(new Error('Tag not found'), { status: 404 }));
    const res = await request(app).delete('/api/tags/unknown').set('Authorization', token());
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks/:taskId/tags/:tagId', () => {
  it('returns 200 on success', async () => {
    mockAdd.mockResolvedValue(undefined);
    const res = await request(app).post('/api/tasks/t-1/tags/tag-1').set('Authorization', token());
    expect(res.status).toBe(200);
  });

  it('is idempotent — second call also returns 200', async () => {
    mockAdd.mockResolvedValue(undefined);
    await request(app).post('/api/tasks/t-1/tags/tag-1').set('Authorization', token());
    const res = await request(app).post('/api/tasks/t-1/tags/tag-1').set('Authorization', token());
    expect(res.status).toBe(200);
  });

  it('returns 404 when task or tag not found', async () => {
    mockAdd.mockRejectedValue(Object.assign(new Error('Task not found'), { status: 404 }));
    const res = await request(app).post('/api/tasks/unknown/tags/tag-1').set('Authorization', token());
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/tasks/t-1/tags/tag-1');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/tasks/:taskId/tags/:tagId', () => {
  it('returns 204 on success', async () => {
    mockRemove.mockResolvedValue(undefined);
    const res = await request(app).delete('/api/tasks/t-1/tags/tag-1').set('Authorization', token());
    expect(res.status).toBe(204);
  });

  it('returns 404 when association not found', async () => {
    mockRemove.mockRejectedValue(Object.assign(new Error('Tag association not found'), { status: 404 }));
    const res = await request(app).delete('/api/tasks/t-1/tags/unknown').set('Authorization', token());
    expect(res.status).toBe(404);
  });
});
