import { badges, classes, exercises, metrics, profiles, sessions } from './seed';
import { BodyMetric, ClassSchedule, Exercise, Profile, SessionPlan, WorkoutLog } from './types';

export interface AppData {
  profiles: Profile[];
  exercises: Exercise[];
  sessions: SessionPlan[];
  logs: WorkoutLog[];
  metrics: BodyMetric[];
  badges: typeof badges;
  classes: ClassSchedule[];
  selectedProfileId: string;
}

const KEY = 'blackbeltbootcamp.v1';

const initial: AppData = {
  profiles,
  exercises,
  sessions,
  logs: [],
  metrics,
  badges,
  classes,
  selectedProfileId: 'james'
};

export function loadData(): AppData {
  const raw = localStorage.getItem(KEY);
  if (!raw) return initial;
  try { return { ...initial, ...JSON.parse(raw) }; } catch { return initial; }
}
export function saveData(data: AppData) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function resetData() { localStorage.removeItem(KEY); }
export function id(prefix='id') { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
