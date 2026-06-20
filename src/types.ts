export type Role = 'admin' | 'coach' | 'athlete';
export type ExerciseType = 'Strength' | 'Cardio' | 'Mobility' | 'Physio' | 'Footwork' | 'MMA' | 'Boxing' | 'Kickboxing' | 'BJJ' | 'Recovery';
export type Location = 'Home' | 'Gym' | 'FMA Chester' | 'Outdoors' | 'Other';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  heightCm?: number;
  weightKg?: number;
  dateOfBirth?: string;
  primarySport?: string;
  goals?: string;
  injuryNotes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  location: Location;
  equipment: string;
  bodyParts: string[];
  muscles: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructions: string;
  videoUrl?: string;
  source?: string;
  sourceId?: string;
  sourceFile?: string;
  videoPath?: string;
  importUid?: string;
  description?: string;
  durationMin?: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets?: number;
  reps?: string;
  weight?: string;
  restSec?: number;
  durationMin?: number;
  notes?: string;
}

export interface SessionPlan {
  id: string;
  title: string;
  date: string;
  type: ExerciseType | 'Gym' | 'Class' | 'Rest';
  location: Location;
  estimatedMinutes: number;
  athleteId: string;
  coachNotes?: string;
  exercises: WorkoutExercise[];
  completed?: boolean;
}

export interface WorkoutLogSet { setNumber: number; reps?: string; weight?: string; time?: string; distance?: string; rpe?: string; complete?: boolean; }
export interface WorkoutLog {
  id: string;
  sessionId: string;
  athleteId: string;
  date: string;
  completion: number;
  notes?: string;
  sets: Record<string, WorkoutLogSet[]>;
}

export interface Badge { id: string; name: string; description: string; icon: string; rule: string; }
export interface ClassSchedule { id: string; name: string; day: string; time: string; durationMin: number; level: string; location: 'FMA Chester'; category: ExerciseType; }
export interface BodyMetric { id: string; athleteId: string; date: string; weightKg?: number; heightCm?: number; bodyFat?: number; sleep?: number; energy?: number; notes?: string; }
