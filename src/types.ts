export type UserRole = 'admin' | 'coach' | 'athlete';

export type AthleteProfile = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  belt_rank?: string;
  gym?: string;
  goal?: string;
  competition_weight_kg?: number;
};

export type Exercise = {
  id?: string;
  exercise_id: string;
  name: string;
  description?: string;
  body_part?: string;
  body_parts?: string;
  target?: string;
  secondary_muscles?: string[];
  equipment?: string;
  difficulty?: string;
  category?: string;
  location?: string;
  source_file?: string;
  source_label?: string;
  sources?: string[];
  video_path?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  has_video?: boolean;
  is_archived?: boolean;
  archived?: boolean;
  instructions?: string[];
};

export type ProgrammeExercise = {
  exercise_id: string;
  name: string;
  planned_sets?: number;
  planned_reps?: string;
  planned_weight?: string;
  notes?: string;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  focus: string;
  exercises: ProgrammeExercise[];
};

export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  type: 'strength' | 'mma' | 'bjj' | 'boxing' | 'kickboxing' | 'cardio' | 'mobility' | 'physio' | 'fma';
  time?: string;
  status: 'planned' | 'completed' | 'missed';
};

export type WorkoutLog = {
  id: string;
  date: string;
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  weight?: string;
  rpe?: number;
  notes?: string;
  completed: boolean;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
};
