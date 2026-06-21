export type UserRole = 'admin' | 'coach' | 'athlete';

export type AppUser = {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  athlete_id?: string;
};

export type AthleteProfile = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  age?: number;
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  belt_rank?: string;
  gym?: string;
  goal?: string;
  competition_weight_kg?: number;
  profile_photo_url?: string;
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
  session_type?: SessionType;
  location?: string;
  exercises: ProgrammeExercise[];
  remote_id?: string;
};

export type SessionType = 'Home' | 'Gym' | 'FMA' | 'MMA' | 'BJJ' | 'Boxing' | 'Kickboxing' | 'Cardio' | 'Mobility' | 'Physio' | 'Recovery' | 'Strength';

export type CalendarEvent = {
  id: string;
  date: string; // ISO date or weekday label for seed data
  title: string;
  type: SessionType;
  time?: string;
  end_time?: string;
  status: 'planned' | 'completed' | 'missed';
  workout_plan_id?: string;
  athlete_id?: string;
  athlete_email?: string;
  athlete_name?: string;
  assigned_by_user_id?: string;
  class_name?: string;
  remote_id?: string;
  remote_plan_id?: string;
};

export type ExerciseLogSet = {
  set_number: number;
  reps?: string;
  weight?: string;
  completed?: boolean;
};

export type WorkoutLog = {
  id: string;
  session_id?: string;
  date: string;
  session_type?: SessionType;
  exercise_id: string;
  exercise_name: string;
  sets: ExerciseLogSet[];
  reps?: string;
  weight?: string;
  rpe?: number;
  notes?: string;
  completed: boolean;
};

export type AchievementType =
  | 'sessions_completed'
  | 'exercises_completed'
  | 'workout_streak'
  | 'fma_sessions'
  | 'gym_sessions'
  | 'home_sessions'
  | 'bjj_sessions'
  | 'kickboxing_sessions'
  | 'mobility_sessions'
  | 'strength_exercises'
  | 'footwork_sessions'
  | 'completed_workouts';

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_type: AchievementType;
  target_value: number;
  xp_value?: number;
  is_active?: boolean;
  remote_id?: string;
};

export type Badge = BadgeDefinition & {
  unlocked: boolean;
  progress: number;
  current_count: number;
};
