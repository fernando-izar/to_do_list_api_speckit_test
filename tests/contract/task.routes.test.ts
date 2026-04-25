jest.mock('../../src/tasks/task.service');
jest.mock('../../src/db/client', () => ({ __esModule: true, default: { query: jest.fn() } }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { listTasks, getTask, createTask, updateTask, deleteTask } from '../../src/tasks/task.service';

const mockList = listTasks as jest.Mock;
const mockGet = getTask as jest.Mock;
const mockCreate = createTask as jest.Mock;
const mockUpdate = updateTask as jest.Mock;
const mockDelete = deleteTask as jest.Mock;

const token = () => `Bearer ${jwt.sign({ sub: 'user-1' }, process.env.JWT_ACCESS_SECRET!)}`;

const task = {
  id: 't-1', title: 'Test', description: null,
  status: 'pendente', priority: 'media', tags: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  mockList.mockReset();
  mockGet.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

describe('GET /api/tasks', () => {
  it('returns 200 with task list', async () => {
    mockList.mockResolvedValue([task]);
    const res = await request(app).get('/api/tasks').set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status filter', async () => {
    const res = await request(app).get('/api/tasks?status=invalido').set('Authorization', token());
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority filter', async () => {
    const res = await request(app).get('/api/tasks?priority=urgente').set('Authorization', token());
    expect(res.status).toBe(400);
  });

  it('passes valid filters to service', async () => {
    mockList.mockResolvedValue([]);
    await request(app).get('/api/tasks?status=concluida&priority=alta').set('Authorization', token());
    expect(mockList).toHaveBeenCalledWith('user-1', { status: 'concluida', priority: 'alta' });
  });
});

describe('POST /api/tasks', () => {
  it('returns 201 with created task', async () => {
    mockCreate.mockResolvedValue(task);
    const res = await request(app).post('/api/tasks').set('Authorization', token()).send({ title: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('t-1');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty title', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('title is required'), { status: 400 }));
    const res = await request(app).post('/api/tasks').set('Authorization', token()).send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns 200 with the task', async () => {
    mockGet.mockResolvedValue(task);
    const res = await request(app).get('/api/tasks/t-1').set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('t-1');
  });

  it('returns 404 when not found', async () => {
    mockGet.mockRejectedValue(Object.assign(new Error('Task not found'), { status: 404 }));
    const res = await request(app).get('/api/tasks/unknown').set('Authorization', token());
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('returns 200 with updated task', async () => {
    mockUpdate.mockResolvedValue({ ...task, status: 'concluida' });
    const res = await request(app).put('/api/tasks/t-1').set('Authorization', token()).send({ status: 'concluida' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluida');
  });

  it('returns 404 when task not found', async () => {
    mockUpdate.mockRejectedValue(Object.assign(new Error('Task not found'), { status: 404 }));
    const res = await request(app).put('/api/tasks/unknown').set('Authorization', token()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('returns 204 on success', async () => {
    mockDelete.mockResolvedValue(undefined);
    const res = await request(app).delete('/api/tasks/t-1').set('Authorization', token());
    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    mockDelete.mockRejectedValue(Object.assign(new Error('Task not found'), { status: 404 }));
    const res = await request(app).delete('/api/tasks/unknown').set('Authorization', token());
    expect(res.status).toBe(404);
  });
});
