export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export const TASK_STATUSES: TaskStatus[] = ['pendente', 'em_andamento', 'concluida'];
export const TASK_PRIORITIES: TaskPriority[] = ['baixa', 'media', 'alta'];

export interface Tag {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface ListTasksFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
}
