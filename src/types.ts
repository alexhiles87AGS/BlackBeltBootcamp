export type Exercise = {
  id?: string;
  exercise_id: string;
  name: string;
  description?: string;
  body_part?: string;
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
