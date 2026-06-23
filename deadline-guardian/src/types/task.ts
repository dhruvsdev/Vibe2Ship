export type Priority = 'Low' | 'Medium' | 'High';
export type Status = 'To Do' | 'In Progress' | 'Completed';

export interface Task {
  id?: string;
  userId: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  deadline: string;
  createdAt: any;
}

// AI response output structures
export interface PrioritizedTask {
  id: string;
  rank: number;
  reasoning: string;
}

export interface UrgentRisk {
  taskId: string;
  riskType: "HIGH" | "MEDIUM";
  description: string;
}

export interface PrioritizationResponse {
  rankedTasks: PrioritizedTask[];
  risks: UrgentRisk[];
}
export interface Milestone {
  title: string;
  description: string;
}

export interface Subtask {
  id: string;
  title: string;
  estimatedHours: number;
  order: number;
}

export interface TaskBreakdownResponse {
  milestones: Milestone[];
  subtasks: Subtask[];
}
export interface ScheduleBlock {
  timeSlot: string;       // e.g. "09:00 AM - 10:30 AM"
  taskTitle: string;      // The task name, or "Rest / Break"
  type: "focus" | "break" | "administrative";
  durationMinutes: number;
  recommendation?: string;
}

export interface DailyScheduleResponse {
  schedule: ScheduleBlock[];
  overloadAlert?: {
    isOverloaded: boolean;
    details: string;
  };
  summary: string;
}
export interface AIReminder {
  taskId: string;
  title: string;
  message: string;
  urgencyScore: number; // 1 to 10 scale
  type: "motivational" | "actionable" | "warning";
}