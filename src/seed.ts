import { Exercise, SessionPlan, Profile, Badge, ClassSchedule, BodyMetric } from './types';

export const profiles: Profile[] = [
  { id: 'admin', email: 'admin@blackbeltbootcamp.local', displayName: 'Coach Admin', role: 'admin', primarySport: 'Coaching' },
  { id: 'james', email: 'james@blackbeltbootcamp.local', displayName: 'James Hiles', role: 'athlete', primarySport: 'MMA / BJJ', goals: 'Lean muscle, strength, athletic performance and combat-sport durability.' }
];

export const exercises: Exercise[] = [
  { id:'bench-press', name:'Bench Press', type:'Strength', location:'Gym', equipment:'Barbell, bench', bodyParts:['Chest','Triceps','Shoulders'], muscles:['Pectorals','Anterior delts','Triceps'], difficulty:'Intermediate', instructions:'Feet planted, shoulder blades squeezed, lower the bar with control and press smoothly.', videoUrl:'', source:'James 4-Day Manual' },
  { id:'incline-db-press', name:'Incline Dumbbell Press', type:'Strength', location:'Gym', equipment:'Dumbbells, incline bench', bodyParts:['Chest','Shoulders','Triceps'], muscles:['Upper chest','Triceps'], difficulty:'Intermediate', instructions:'Use a slight incline. Keep wrists stacked and avoid bouncing at the bottom.', source:'James 4-Day Manual' },
  { id:'seated-shoulder-press', name:'Seated Shoulder Press', type:'Strength', location:'Gym', equipment:'Dumbbells or machine', bodyParts:['Shoulders','Triceps'], muscles:['Deltoids','Triceps'], difficulty:'Intermediate', instructions:'Brace ribs down, press overhead, and do not arch the lower back.', source:'James 4-Day Manual' },
  { id:'lateral-raise', name:'Dumbbell Lateral Raise', type:'Strength', location:'Gym', equipment:'Dumbbells', bodyParts:['Shoulders'], muscles:['Lateral delts'], difficulty:'Beginner', instructions:'Soft elbows, raise to shoulder height, pause briefly, lower slowly.', source:'James 4-Day Manual' },
  { id:'tricep-pushdown', name:'Cable Tricep Pushdown', type:'Strength', location:'Gym', equipment:'Cable machine', bodyParts:['Triceps'], muscles:['Triceps'], difficulty:'Beginner', instructions:'Elbows stay close. Extend fully without leaning over the cable.', source:'James 4-Day Manual' },
  { id:'plank', name:'Plank', type:'Strength', location:'Home', equipment:'Bodyweight', bodyParts:['Core'], muscles:['Abs','Glutes'], difficulty:'Beginner', instructions:'Straight line from head to heels. Squeeze glutes and breathe slowly.', source:'James 4-Day Manual' },
  { id:'back-squat', name:'Back Squat', type:'Strength', location:'Gym', equipment:'Barbell, rack', bodyParts:['Quads','Glutes','Hamstrings','Core'], muscles:['Quadriceps','Glutes','Hamstrings'], difficulty:'Intermediate', instructions:'Brace first, knees track over toes, control depth, drive through mid-foot.', source:'James 4-Day Manual' },
  { id:'romanian-deadlift', name:'Romanian Deadlift', type:'Strength', location:'Gym', equipment:'Barbell or dumbbells', bodyParts:['Hamstrings','Glutes','Back'], muscles:['Hamstrings','Glutes','Erectors'], difficulty:'Intermediate', instructions:'Hips move back, spine neutral, feel hamstrings, stand tall without leaning back.', source:'James 4-Day Manual' },
  { id:'walking-lunge', name:'Walking Lunge', type:'Strength', location:'Gym', equipment:'Bodyweight or dumbbells', bodyParts:['Quads','Glutes','Hamstrings'], muscles:['Quadriceps','Glutes'], difficulty:'Beginner', instructions:'Long controlled stride, back knee drops, front foot stays flat.', source:'James 4-Day Manual' },
  { id:'leg-press', name:'Leg Press', type:'Strength', location:'Gym', equipment:'Leg press', bodyParts:['Quads','Glutes'], muscles:['Quadriceps','Glutes'], difficulty:'Beginner', instructions:'Control platform, avoid locking knees hard, keep lower back on pad.', source:'James 4-Day Manual' },
  { id:'calf-raise', name:'Standing Calf Raise', type:'Strength', location:'Gym', equipment:'Machine or dumbbells', bodyParts:['Calves'], muscles:['Gastrocnemius','Soleus'], difficulty:'Beginner', instructions:'Full stretch at bottom, strong squeeze at top, slow tempo.', source:'James 4-Day Manual' },
  { id:'hanging-knee-raise', name:'Hanging Knee Raise', type:'Strength', location:'Gym', equipment:'Pull-up bar', bodyParts:['Core'], muscles:['Abs','Hip flexors'], difficulty:'Intermediate', instructions:'Avoid swinging. Curl pelvis upward and control the lowering phase.', source:'James 4-Day Manual' },
  { id:'lat-pulldown', name:'Lat Pulldown', type:'Strength', location:'Gym', equipment:'Cable pulldown', bodyParts:['Back','Biceps'], muscles:['Lats','Biceps'], difficulty:'Beginner', instructions:'Pull elbows down, chest tall, do not yank with lower back.', source:'James 4-Day Manual' },
  { id:'seated-cable-row', name:'Seated Cable Row', type:'Strength', location:'Gym', equipment:'Cable row', bodyParts:['Back','Biceps'], muscles:['Lats','Rhomboids','Biceps'], difficulty:'Beginner', instructions:'Pull to lower ribs, pause, then let shoulder blades glide forward under control.', source:'James 4-Day Manual' },
  { id:'single-arm-row', name:'Single Arm Dumbbell Row', type:'Strength', location:'Gym', equipment:'Dumbbell, bench', bodyParts:['Back','Biceps'], muscles:['Lats','Rear delts'], difficulty:'Beginner', instructions:'Brace one hand, pull elbow toward hip, keep torso stable.', source:'James 4-Day Manual' },
  { id:'face-pull', name:'Face Pull', type:'Strength', location:'Gym', equipment:'Cable rope', bodyParts:['Shoulders','Back'], muscles:['Rear delts','Rotator cuff'], difficulty:'Beginner', instructions:'Pull toward face with elbows high. Great for shoulder health and posture.', source:'James 4-Day Manual' },
  { id:'db-curl', name:'Dumbbell Bicep Curl', type:'Strength', location:'Gym', equipment:'Dumbbells', bodyParts:['Biceps'], muscles:['Biceps'], difficulty:'Beginner', instructions:'Elbows stay still, no swinging, squeeze at the top.', source:'James 4-Day Manual' },
  { id:'hammer-curl', name:'Hammer Curl', type:'Strength', location:'Gym', equipment:'Dumbbells', bodyParts:['Biceps','Forearms'], muscles:['Brachialis','Forearms'], difficulty:'Beginner', instructions:'Neutral grip, control both directions, build biceps and forearms.', source:'James 4-Day Manual' },
  { id:'trap-bar-deadlift', name:'Trap Bar Deadlift', type:'Strength', location:'Gym', equipment:'Trap bar', bodyParts:['Posterior Chain','Legs','Back'], muscles:['Glutes','Hamstrings','Quads','Back'], difficulty:'Intermediate', instructions:'Hips and chest rise together. Push the floor away and keep bar path close.', source:'James 4-Day Manual' },
  { id:'db-bench-press', name:'Dumbbell Bench Press', type:'Strength', location:'Gym', equipment:'Dumbbells, bench', bodyParts:['Chest','Triceps','Shoulders'], muscles:['Pectorals','Triceps'], difficulty:'Intermediate', instructions:'Control the bells, keep shoulders packed, press evenly.', source:'James 4-Day Manual' },
  { id:'pull-up', name:'Pull Up or Assisted Pull Up', type:'Strength', location:'Gym', equipment:'Pull-up bar or assisted machine', bodyParts:['Back','Biceps','Grip'], muscles:['Lats','Biceps','Forearms'], difficulty:'Intermediate', instructions:'Start from a controlled hang, pull chest upward, stop before form breaks.', source:'James 4-Day Manual' },
  { id:'bulgarian-split-squat', name:'Bulgarian Split Squat', type:'Strength', location:'Gym', equipment:'Bench, dumbbells optional', bodyParts:['Quads','Glutes','Balance'], muscles:['Quadriceps','Glutes'], difficulty:'Intermediate', instructions:'Front foot planted, torso tall, slow controlled lowering.', source:'James 4-Day Manual' },
  { id:'farmer-carry', name:'Farmer Carry', type:'Strength', location:'Gym', equipment:'Dumbbells or farmer handles', bodyParts:['Grip','Core','Full Body'], muscles:['Forearms','Traps','Core'], difficulty:'Beginner', instructions:'Stand tall, ribs down, crush handles, walk with short strong steps.', source:'James 4-Day Manual' },
  { id:'woodchopper', name:'Cable Woodchopper', type:'Strength', location:'Gym', equipment:'Cable machine', bodyParts:['Core','Obliques'], muscles:['Obliques','Abs'], difficulty:'Intermediate', instructions:'Rotate through trunk and hips. Control the return, do not rush.', source:'James 4-Day Manual' },
  { id:'ladder-drills', name:'Ladder Drills', type:'Footwork', location:'Home', equipment:'Agility ladder', bodyParts:['Footwork','Cardio'], muscles:['Calves','Quads','Coordination'], difficulty:'Intermediate', instructions:'Use light feet and rhythm. Stay controlled and accurate before increasing speed.', durationMin:3, source:'Daily footwork routine' },
  { id:'marker-angle-drills', name:'Marker Angle Drills', type:'Footwork', location:'Home', equipment:'Cones or markers', bodyParts:['Footwork','Agility'], muscles:['Calves','Glutes','Core'], difficulty:'Intermediate', instructions:'Step to angles, reset stance, keep guard up and return to base.', durationMin:3, source:'Daily footwork routine' },
  { id:'slip-rope', name:'Slip Rope Movement', type:'Boxing', location:'Home', equipment:'Slip rope', bodyParts:['Boxing','Core'], muscles:['Core','Legs','Neck control'], difficulty:'Intermediate', instructions:'Move under the rope with knees and hips, not by folding the back. Keep balance.', durationMin:3, source:'Daily footwork routine' },
  { id:'metronome-shadowboxing', name:'Shadowboxing To Metronome', type:'Boxing', location:'Home', equipment:'Metronome app', bodyParts:['Boxing','Cardio'], muscles:['Full body'], difficulty:'Intermediate', instructions:'Move and punch on rhythm. Keep breathing smooth and maintain stance.', durationMin:3, source:'Daily footwork routine' },
  { id:'tennis-ball-free-movement', name:'Free Movement Around Tennis Ball', type:'Footwork', location:'Home', equipment:'Tennis ball', bodyParts:['Footwork','Reaction'], muscles:['Calves','Core'], difficulty:'Advanced', instructions:'Use the ball as a moving target/anchor. Circle, cut angles, reset and stay light.', durationMin:3, source:'Daily footwork routine' },
  { id:'recovery-flow', name:'10-Minute Recovery Flow', type:'Recovery', location:'Home', equipment:'Mat', bodyParts:['Mobility'], muscles:['Hips','Hamstrings','Chest'], difficulty:'Beginner', instructions:'Child pose breathing, hip flexor stretch, hamstring stretch, pec doorway stretch and easy walk.', durationMin:10, source:'James 4-Day Manual' }
];

const today = new Date();
const iso = (d:number) => { const t = new Date(today); t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); };

const pushWorkout = (id:string, date:string): SessionPlan => ({ id, title:'Day 1 - Upper Push', date, type:'Strength', location:'Gym', estimatedMinutes:60, athleteId:'james', coachNotes:'Chest, shoulders, triceps and core. Technique before load.', exercises:[
  { exerciseId:'bench-press', sets:4, reps:'8-10', restSec:120 }, { exerciseId:'incline-db-press', sets:3, reps:'10-12', restSec:90 }, { exerciseId:'seated-shoulder-press', sets:3, reps:'10-12', restSec:90 }, { exerciseId:'lateral-raise', sets:3, reps:'12-15', restSec:60 }, { exerciseId:'tricep-pushdown', sets:3, reps:'12-15', restSec:60 }, { exerciseId:'plank', sets:3, reps:'45 sec', restSec:45 }
]});
const lowerWorkout = (id:string, date:string): SessionPlan => ({ id, title:'Day 2 - Lower Body', date, type:'Strength', location:'Gym', estimatedMinutes:60, athleteId:'james', coachNotes:'Quads, hamstrings, glutes, calves and core.', exercises:[
  { exerciseId:'back-squat', sets:4, reps:'8-10', restSec:120 }, { exerciseId:'romanian-deadlift', sets:3, reps:'10', restSec:120 }, { exerciseId:'walking-lunge', sets:3, reps:'12/leg', restSec:90 }, { exerciseId:'leg-press', sets:3, reps:'12', restSec:90 }, { exerciseId:'calf-raise', sets:4, reps:'15', restSec:60 }, { exerciseId:'hanging-knee-raise', sets:3, reps:'15', restSec:60 }
]});
const pullWorkout = (id:string, date:string): SessionPlan => ({ id, title:'Day 3 - Upper Pull', date, type:'Strength', location:'Gym', estimatedMinutes:60, athleteId:'james', coachNotes:'Back, rear delts, biceps and grip.', exercises:[
  { exerciseId:'lat-pulldown', sets:4, reps:'8-12', restSec:90 }, { exerciseId:'seated-cable-row', sets:3, reps:'10-12', restSec:90 }, { exerciseId:'single-arm-row', sets:3, reps:'10/side', restSec:75 }, { exerciseId:'face-pull', sets:3, reps:'15', restSec:60 }, { exerciseId:'db-curl', sets:3, reps:'12', restSec:60 }, { exerciseId:'hammer-curl', sets:3, reps:'12', restSec:60 }
]});
const fullWorkout = (id:string, date:string): SessionPlan => ({ id, title:'Day 4 - Full Body Athletic', date, type:'Strength', location:'Gym', estimatedMinutes:60, athleteId:'james', coachNotes:'Strength, balance, grip, trunk and carryover.', exercises:[
  { exerciseId:'trap-bar-deadlift', sets:4, reps:'6-8', restSec:150 }, { exerciseId:'db-bench-press', sets:3, reps:'10', restSec:90 }, { exerciseId:'pull-up', sets:3, reps:'Max quality', restSec:90 }, { exerciseId:'bulgarian-split-squat', sets:3, reps:'10/leg', restSec:90 }, { exerciseId:'farmer-carry', sets:4, reps:'30m', restSec:75 }, { exerciseId:'woodchopper', sets:3, reps:'12/side', restSec:60 }
]});
const footwork = (id:string, date:string): SessionPlan => ({ id, title:'15-Minute Daily Footwork Routine', date, type:'Footwork', location:'Home', estimatedMinutes:15, athleteId:'james', coachNotes:'Light, sharp and rhythmic. Quality movement over exhaustion.', exercises:[
  { exerciseId:'ladder-drills', durationMin:3 }, { exerciseId:'marker-angle-drills', durationMin:3 }, { exerciseId:'slip-rope', durationMin:3 }, { exerciseId:'metronome-shadowboxing', durationMin:3 }, { exerciseId:'tennis-ball-free-movement', durationMin:3 }
]});

export const sessions: SessionPlan[] = [
  pushWorkout('s1', iso(0)), footwork('f1', iso(0)), lowerWorkout('s2', iso(1)), footwork('f2', iso(1)), pullWorkout('s3', iso(3)), footwork('f3', iso(2)), fullWorkout('s4', iso(5)), footwork('f4', iso(3)), pushWorkout('s5', iso(7)), lowerWorkout('s6', iso(8)), pullWorkout('s7', iso(10)), fullWorkout('s8', iso(12))
];

export const classes: ClassSchedule[] = [
  { id:'fma-advanced-mon', name:'Advanced / Masters Class', day:'Monday', time:'18:00', durationMin:60, level:'Advanced / Masters', location:'FMA Chester', category:'MMA' },
  { id:'fma-bjj-tue', name:'BJJ Class', day:'Tuesday', time:'18:30', durationMin:60, level:'Adult / Teen suitable', location:'FMA Chester', category:'BJJ' },
  { id:'fma-kickboxing-wed', name:'Kickboxing Class', day:'Wednesday', time:'18:00', durationMin:60, level:'Mixed ability', location:'FMA Chester', category:'Kickboxing' },
  { id:'fma-adult-thu', name:'Adult MMA Class', day:'Thursday', time:'19:00', durationMin:75, level:'Adult', location:'FMA Chester', category:'MMA' },
  { id:'fma-boxing-sat', name:'Boxing / Striking Class', day:'Saturday', time:'10:00', durationMin:60, level:'Mixed ability', location:'FMA Chester', category:'Boxing' }
];

export const badges: Badge[] = [
  { id:'first-session', name:'First Session', description:'Complete your first planned session.', icon:'🥋', rule:'complete_1' },
  { id:'seven-day-streak', name:'7-Day Streak', description:'Train for 7 days in a row.', icon:'🔥', rule:'streak_7' },
  { id:'four-gym-week', name:'4 Gym Week', description:'Complete all four gym sessions in one week.', icon:'🏋️', rule:'gym_4_week' },
  { id:'footwork-10', name:'Footwork Sharpener', description:'Complete 10 footwork routines.', icon:'⚡', rule:'footwork_10' },
  { id:'fma-10', name:'FMA Regular', description:'Log 10 FMA Chester classes.', icon:'🛡️', rule:'fma_10' },
  { id:'hundred-sessions', name:'100 Sessions', description:'Complete 100 sessions.', icon:'🏆', rule:'complete_100' }
];

export const metrics: BodyMetric[] = [
  { id:'m1', athleteId:'james', date: iso(-28), weightKg:65, heightCm:172, sleep:8, energy:7, notes:'Starting baseline' },
  { id:'m2', athleteId:'james', date: iso(-14), weightKg:66.2, heightCm:172, sleep:8, energy:8, notes:'Training feeling better' },
  { id:'m3', athleteId:'james', date: iso(0), weightKg:67, heightCm:172, sleep:8.5, energy:8, notes:'Good consistency' }
];
