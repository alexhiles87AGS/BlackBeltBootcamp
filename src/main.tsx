import {pad2,dateOnly,normaliseTime,toGmtSessionDate,localDateString,todayISO,dateFromIso,addDays,startOfWeek,weekDates,iso,dayLabel,titleCase,sentence,bodyOf,bmi,getWeightUnit,kgToStLb,stLbToKg,kgToStoneDecimal,formatWeight,classNameForType,normalise,percent,parseNumeric,estimateOneRepMax,nutritionTotals,clampPercent,displaySyncTime,getInitials,type WeightUnit} from './services/domain';
import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, Apple, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award, BarChart3, CalendarDays,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Cloud, Coffee, Database,
  Droplets, Dumbbell, Eye, Flame, GripVertical, Home, Import, Library, ListChecks, LogOut,
  Medal, Menu, MoreHorizontal, PlayCircle, Plus, RefreshCw, Save, Search, Shield, Star, Sun,
  Target, Trash2, Trophy, User, Users, Utensils, Video, Weight, X, ClipboardList, Edit3, KeyRound
} from 'lucide-react';
import { supabase, buildVideoUrl } from './supabaseClient';
import summary from './data/video_sort_summary.json';
import type { AppUser, AthleteProfile, AthleteMetric, Badge, BadgeDefinition, AchievementType, CalendarEvent, Exercise, ExerciseLogSet, MealType, NutritionEntry, NutritionTarget, ProgrammeExercise, SessionType, WorkoutLog, WorkoutPlan } from './types';
import './styles.css';
import {storage,setStorage,removeStorage,setCacheOwner,getCacheOwner,scrubLegacyPasswords,removeExact,mergeById,mergePending} from './services/cache';
import {writeRecord,flushWrites,pendingWrites,confirmedDelete,resolveAthlete,syncMessage} from './services/cloud';
import {AppBoundary} from './components/AppBoundary';
import {CoachingOverview} from './components/CoachingOverview';
import {AdminRecovery} from './components/AdminRecovery';
import {NutritionScreen} from './components/NutritionScreen';
import {WorkoutRunner,WorkoutSummary} from './components/WorkoutRunner';
import {SyncBanner} from './components/SyncBanner';

let localCatalogue:Exercise[]=[];
let cataloguePromise:Promise<Exercise[]>|null=null;
function loadCatalogue(){return cataloguePromise||=import('./data/exercise_catalogue.json').then(module=>{localCatalogue=module.default as Exercise[];return localCatalogue})}

type Page = 'dashboard' | 'calendar' | 'today' | 'library' | 'builder' | 'fma' | 'nutrition' | 'stats' | 'badges' | 'profile' | 'admin' | 'import' | 'session';

const NAV: { page: Page; label: string; icon: React.ReactNode; roles?: string[]; group?: string }[] = [
  { page: 'dashboard', label: 'Home', icon: <Home size={18}/>, group: 'Athlete' },
  { page: 'calendar', label: 'Training Calendar', icon: <CalendarDays size={18}/>, group: 'Training' },
  { page: 'today', label: "Today's Training", icon: <Activity size={18}/>, group: 'Training' },
  { page: 'builder', label: 'Workout Builder', icon: <Dumbbell size={18}/>, group: 'Training' },
  { page: 'library', label: 'Exercise Library', icon: <Library size={18}/>, group: 'Training' },
  { page: 'fma', label: 'FMA Classes', icon: <Shield size={18}/>, group: 'Training' },
  { page: 'nutrition', label: 'Nutrition', icon: <Utensils size={18}/>, group: 'Progress' },
  { page: 'stats', label: 'Progress', icon: <BarChart3 size={18}/>, group: 'Progress' },
  { page: 'badges', label: 'Achievements', icon: <Medal size={18}/>, group: 'Progress' },
  { page: 'admin', label: 'Admin Console', icon: <Users size={18}/>, roles: ['admin','coach'], group: 'Admin' },
  { page: 'import', label: 'Exercise Import', icon: <Database size={18}/>, roles: ['admin','coach'], group: 'Admin' },
];

const APP_VERSION = '4.3.0-reliable-training';

const cleanProfiles: AthleteProfile[] = [
  {
    id: 'alex-admin',
    name: 'Alex Hiles',
    email: 'alex.hiles.ags@gmail.com',
    role: 'admin',
    gym: 'BlackBeltBootcamp',
    goal: 'Manage James’s training platform, programmes and progress.',
    weight_unit: 'kg',
  },
  {
    id: 'james-athlete',
    name: 'James Hiles',
    email: 'james.hiles@blackbeltbootcamp.app',
    role: 'athlete',
    age: 14,
    height_cm: 170,
    weight_kg: 65,
    belt_rank: 'Black Belt',
    gym: 'FMA Chester',
    goal: 'Build complete MMA athleticism and long-term professional fighter habits.',
    competition_weight_kg: 66,
    weight_unit: 'kg',
  },
];

const cleanUsers: AppUser[] = [
  { id: 'admin-alex', email: 'alex.hiles.ags@gmail.com', name: 'Alex Hiles', role: 'admin', athlete_id: 'alex-admin' },
  { id: 'athlete-james', email: 'james.hiles@blackbeltbootcamp.app', name: 'James Hiles', role: 'athlete', athlete_id: 'james-athlete' },
];

const defaultProfile: AthleteProfile = cleanProfiles[1];

const starter: Exercise[] = [
  { exercise_id: 'starter-1', name: 'bench press', description: 'A compound upper body pressing exercise.', equipment:'barbell, bench', category:'strength', difficulty:'intermediate', body_part:'chest', target:'pectorals', location:'Gym', secondary_muscles:['anterior delts','triceps'], instructions:['Set your eyes under the bar and plant your feet.','Squeeze shoulder blades together and brace.','Lower the bar with control and press smoothly.'] },
  { exercise_id: 'starter-2', name: 'plank', description: 'A static core exercise to build bracing and trunk endurance.', equipment:'body weight', category:'strength', difficulty:'beginner', body_part:'waist', target:'abs', location:'Home', secondary_muscles:['glutes'], instructions:['Place forearms under shoulders.','Brace abs and glutes.','Hold a straight line while breathing.'] },
];

const ACHIEVEMENT_TYPES: { value: AchievementType; label: string; help: string }[] = [
  { value:'sessions_completed', label:'Sessions Completed', help:'Counts all completed diary sessions.' },
  { value:'completed_workouts', label:'Completed Workouts', help:'Counts completed workout sessions assigned from a saved workout.' },
  { value:'exercises_completed', label:'Exercises Completed', help:'Counts completed exercise log entries.' },
  { value:'workout_streak', label:'Workout Streak', help:'Counts consecutive training days.' },
  { value:'fma_sessions', label:'FMA Sessions', help:'Counts completed FMA/class sessions.' },
  { value:'gym_sessions', label:'Gym Sessions', help:'Counts completed gym sessions.' },
  { value:'home_sessions', label:'Home Sessions', help:'Counts completed home sessions.' },
  { value:'bjj_sessions', label:'BJJ Sessions', help:'Counts completed BJJ/grappling sessions.' },
  { value:'kickboxing_sessions', label:'Kickboxing Sessions', help:'Counts completed kickboxing sessions.' },
  { value:'mobility_sessions', label:'Mobility / Recovery Sessions', help:'Counts completed mobility, recovery and physio sessions.' },
  { value:'strength_exercises', label:'Strength Exercises Logged', help:'Counts completed gym/strength exercise logs.' },
  { value:'footwork_sessions', label:'Footwork Sessions', help:'Counts completed sessions or exercises with footwork in the title/name.' },
];

const initialBadges: BadgeDefinition[] = [
  { id:'b1', name:'First Workout', icon:'🏁', description:'Complete the first logged workout.', badge_type:'sessions_completed', target_value:1, xp_value:10, is_active:true },
  { id:'b2', name:'7 Day Streak', icon:'🔥', description:'Train seven days in a row.', badge_type:'workout_streak', target_value:7, xp_value:50, is_active:true },
  { id:'b3', name:'Footwork Focus', icon:'⚡', description:'Complete 30 footwork sessions.', badge_type:'footwork_sessions', target_value:30, xp_value:75, is_active:true },
  { id:'b4', name:'FMA Regular', icon:'🥋', description:'Attend 25 FMA classes.', badge_type:'fma_sessions', target_value:25, xp_value:100, is_active:true },
  { id:'b5', name:'Strength Builder', icon:'💪', description:'Log 50 strength or gym exercises.', badge_type:'strength_exercises', target_value:50, xp_value:100, is_active:true },
  { id:'b6', name:'Fight Camp Ready', icon:'🏆', description:'Complete 20 planned training sessions.', badge_type:'completed_workouts', target_value:20, xp_value:150, is_active:true },
];

const defaultNutritionTarget: NutritionTarget = {
  id: 'default-nutrition-target',
  athlete_id: 'james-athlete',
  calories: 2400,
  protein_g: 180,
  carbs_g: 250,
  fats_g: 70,
  water_ml: 3000,
};

const MEAL_TYPES: MealType[] = ['Breakfast','Lunch','Dinner','Snack','Hydration'];

const fmaClasses = [
  { name:'Advanced MMA', type:'MMA' as SessionType, focus:'High-level MMA skill development and live rounds.' },
  { name:'Masters MMA', type:'MMA' as SessionType, focus:'Technical MMA class with controlled sparring and drilling.' },
  { name:'Adult MMA', type:'MMA' as SessionType, focus:'Mixed martial arts class for adults.' },
  { name:'BJJ / Grappling', type:'BJJ' as SessionType, focus:'Ground fighting, submissions and positional control.' },
  { name:'Kickboxing', type:'Kickboxing' as SessionType, focus:'Striking mechanics, defence, combinations and footwork.' },
];




const CLEAN_START_CUTOFF_UTC = '2026-06-21T07:33:32Z';




function isAfterCleanStart(row: any){ return !row?.created_at || new Date(row.created_at).getTime() >= new Date(CLEAN_START_CUTOFF_UTC).getTime(); }











function safeVideo(e: Exercise){ return e.video_url || buildVideoUrl(e.video_path); }










function findLinkedAthleteUser(profile: AthleteProfile, users: AppUser[]){
  const email = normalise(profile.email);
  const name = normalise(profile.name);
  return users.find(u => (
    (profile.id && u.athlete_id === profile.id) ||
    (!!email && normalise(u.email) === email) ||
    (!!name && normalise(u.name) === name)
  ));
}
function resolveAssignmentProfile(profile: AthleteProfile, users: AppUser[], athletes: AthleteProfile[]){
  const linkedUser = findLinkedAthleteUser(profile, users);
  const canonicalId = linkedUser?.athlete_id || profile.id;
  const canonicalProfile = athletes.find(a => a.id === canonicalId) || profile;
  return {
    id: canonicalId,
    name: canonicalProfile.name || linkedUser?.name || profile.name,
    email: canonicalProfile.email || linkedUser?.email || profile.email || '',
  };
}
function repairAssignedEvents(events: CalendarEvent[], athletes: AthleteProfile[], users: AppUser[]){
  let changed = false;
  const repaired = events.map(event => {
    if (!event.athlete_id) return event;
    const currentProfile = athletes.find(a => a.id === event.athlete_id);
    if (!currentProfile) return event;
    const resolved = resolveAssignmentProfile(currentProfile, users, athletes);
    const next: CalendarEvent = {
      ...event,
      athlete_id: resolved.id,
      athlete_email: event.athlete_email || resolved.email || undefined,
      athlete_name: event.athlete_name || resolved.name || undefined,
    };
    if (next.athlete_id !== event.athlete_id || next.athlete_email !== event.athlete_email || next.athlete_name !== event.athlete_name) changed = true;
    return next;
  });
  return changed ? repaired : events;
}
function isEventVisibleForUser(event: CalendarEvent, user: AppUser){
  const eventEmail = normalise(event.athlete_email);
  if(!event.athlete_id&&!eventEmail)return false;
  if (user.athlete_id && event.athlete_id === user.athlete_id) return true;
  if (eventEmail && normalise(user.email) === eventEmail) return true;
  return false;
}
function eventMatchesAthlete(event: CalendarEvent, athlete: AthleteProfile, users: AppUser[]){
  const linkedUser = findLinkedAthleteUser(athlete, users);
  const ids = new Set([athlete.id, linkedUser?.athlete_id].filter(Boolean));
  const emails = new Set([normalise(athlete.email), normalise(linkedUser?.email)].filter(Boolean));
  const names = new Set([normalise(athlete.name), normalise(linkedUser?.name)].filter(Boolean));
  if (event.athlete_id && ids.has(event.athlete_id)) return true;
  if (event.athlete_email && emails.has(normalise(event.athlete_email))) return true;
  if (event.athlete_name && names.has(normalise(event.athlete_name))) return true;
  return false;
}
function isJamesCalendarEvent(event: CalendarEvent){
  const id = normalise(event.athlete_id);
  const email = normalise(event.athlete_email);
  const name = normalise(event.athlete_name);
  // Older builds created unassigned sessions that appeared on James's diary.
  // Treat those as James-visible legacy sessions and clear them for the final clean start.
  if (!id && !email) return true;
  return id === 'james-athlete' || email === 'james.hiles@blackbeltbootcamp.app' || name === 'james hiles';
}

function last14Days(){ return Array.from({length:14},(_,i)=>iso(addDays(new Date(), i-13))); }

function calcStreak(logs:WorkoutLog[], events:CalendarEvent[]){
  const trainingDays = new Set([...logs.filter(l=>l.completed).map(l=>dateOnly(l.date)), ...events.filter(e=>e.status==='completed').map(e=>dateOnly(e.date))]);
  let streak = 0;
  let cursor = dateOnly(new Date());
  while(trainingDays.has(cursor)){ streak += 1; cursor = iso(addDays(cursor, -1)); }
  return streak;
}








function getInitialEvents(): CalendarEvent[] {
  const [mon,tue,wed,thu,fri,sat,sun] = weekDates().map(iso);
  return [
    { id:'e1', date:mon, time:'06:30', end_time:'06:45', title:'15-Minute Footwork Routine', type:'Home', status:'planned' },
    { id:'e2', date:mon, time:'18:00', end_time:'19:00', title:'Lower Body Strength', type:'Gym', status:'planned' },
    { id:'e3', date:tue, time:'19:00', end_time:'20:00', title:'FMA Adult MMA', type:'FMA', status:'planned', class_name:'Adult MMA' },
    { id:'e4', date:wed, time:'06:30', end_time:'07:00', title:'Mobility + Physio', type:'Physio', status:'planned' },
    { id:'e5', date:thu, time:'19:00', end_time:'20:00', title:'BJJ / Grappling', type:'BJJ', status:'planned', class_name:'BJJ / Grappling' },
    { id:'e6', date:fri, time:'18:00', end_time:'19:00', title:'Upper Body Strength', type:'Gym', status:'planned' },
    { id:'e7', date:sat, time:'10:00', end_time:'11:00', title:'Sparring / Class', type:'FMA', status:'planned', class_name:'Advanced MMA' },
    { id:'e8', date:sun, time:'10:30', end_time:'11:00', title:'Recovery Mobility', type:'Mobility', status:'planned' },
  ];
}

function isCanonicalJamesIdentity(id?: string | null, email?: string | null, name?: string | null){
  const nId = normalise(id);
  const nEmail = normalise(email);
  const nName = normalise(name);
  return nId === 'james-athlete' || nEmail === 'james.hiles@blackbeltbootcamp.app' || nEmail === 'james@blackbeltbootcamp.app';
}
function canonicaliseUsers(rawUsers: AppUser[]){
  const extras = rawUsers.filter(u => {
    const email = normalise(u.email);
    const name = normalise(u.name);
    if (email === 'alex.hiles.ags@gmail.com' || name === 'alex hiles') return false;
    if (isCanonicalJamesIdentity(u.athlete_id, u.email, u.name)) return false;
    return true;
  });
  return [cleanUsers[0], cleanUsers[1], ...extras];
}
function canonicaliseAthletes(rawAthletes: AthleteProfile[]){
  const extras = rawAthletes.filter(a => {
    const email = normalise(a.email);
    const name = normalise(a.name);
    if (email === 'alex.hiles.ags@gmail.com' || name === 'alex hiles' || a.id === 'alex-admin') return false;
    if (isCanonicalJamesIdentity(a.id, a.email, a.name)) return false;
    return true;
  });
  return [...cleanProfiles.map(seed=>({...seed,...rawAthletes.find(a=>normalise(a.email)===normalise(seed.email)),id:seed.id})),...extras];
}
function canonicaliseEvents(rawEvents: CalendarEvent[]){
  return rawEvents.map(event => {
    if (isCanonicalJamesIdentity(event.athlete_id, event.athlete_email, event.athlete_name)) {
      return {
        ...event,
        athlete_id: 'james-athlete',
        athlete_email: 'james.hiles@blackbeltbootcamp.app',
        athlete_name: 'James Hiles',
      };
    }
    return event;
  });
}
function canonicaliseCurrentUser(user: AppUser | null){
  if (!user) return null;
  if (normalise(user.email) === 'alex.hiles.ags@gmail.com' || normalise(user.name) === 'alex hiles') return cleanUsers[0];
  if (isCanonicalJamesIdentity(user.athlete_id, user.email, user.name)) return cleanUsers[1];
  return user;
}
function getAthleteOptions(athletes: AthleteProfile[]){
  const seen = new Set<string>();
  const combined = [...cleanProfiles, ...athletes];
  return combined
    .filter(a => ['admin','coach','athlete'].includes(a.role))
    .filter(a => {
      const key = isCanonicalJamesIdentity(a.id, a.email, a.name) ? 'james-athlete' : (normalise(a.email) === 'alex.hiles.ags@gmail.com' || normalise(a.name) === 'alex hiles' || a.id === 'alex-admin') ? 'alex-admin' : `${normalise(a.email)}|${normalise(a.name)}|${a.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function profileForUser(user: AppUser | null, athletes: AthleteProfile[]){
  if (!user) return defaultProfile;
  const byId = user.athlete_id ? athletes.find(a=>a.id===user.athlete_id) : undefined;
  const byEmail = athletes.find(a=>normalise(a.email)===normalise(user.email));
  
  if(byId||byEmail)return byId||byEmail!;
  if (normalise(user.email)==='alex.hiles.ags@gmail.com') return cleanProfiles[0];
  if (isCanonicalJamesIdentity(user.athlete_id, user.email, user.name)) return cleanProfiles[1];
  return { id: user.athlete_id || user.id, name: user.name, email: user.email, role: user.role, gym: 'BlackBeltBootcamp', goal: 'Personal training profile.' } as AthleteProfile;
}


function mergeUniqueById<T extends {id:string}>(local:T[], remote:T[]){
  const map = new Map<string,T>();
  [...local, ...remote].forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

function remoteAthleteDisplayName(a: any){ return a?.name || a?.full_name || a?.fullName || ''; }
function remoteAthleteIsActive(a: any){ return a?.is_active === undefined || a?.is_active === null || a?.is_active === true; }
function mapRemoteAthleteToLocal(a: any): AthleteProfile {
  const remoteName = remoteAthleteDisplayName(a);
  if (isCanonicalJamesIdentity(a?.id,a?.email,remoteName)) return {...a,id:'james-athlete',name:remoteName||'James Hiles',email:'james.hiles@blackbeltbootcamp.app',remote_id:a.id};
  if(normalise(a?.email)==='alex.hiles.ags@gmail.com')return {...a,id:'alex-admin',name:remoteName||'Alex Hiles',remote_id:a.id};
  return {
    id: a?.id,
    remote_id: a?.id,
    name: remoteName || a?.email || 'Athlete',
    email: a?.email || '',
    role: a?.role || 'athlete',
    age: a?.age,
    height_cm: a?.height_cm,
    weight_kg: a?.weight_kg,
    competition_weight_kg: a?.competition_weight_kg,
    belt_rank: a?.belt_rank,
    gym: a?.gym,
    goal: a?.goal,
    profile_photo_url: a?.profile_photo_url,
    weight_unit: a?.weight_unit === 'st' ? 'st' : 'kg',
  } as AthleteProfile;
}


function isActiveBadge(b: any){ return b?.is_active === undefined || b?.is_active === null || b?.is_active === true; }
function isSupportedAchievementType(value: any): value is AchievementType {
  return ACHIEVEMENT_TYPES.some(t => t.value === value);
}
function mapRemoteBadgeToLocal(b: any): BadgeDefinition {
  const type = isSupportedAchievementType(b?.badge_type) ? b.badge_type : 'sessions_completed';
  return {
    id: b?.id || crypto.randomUUID(),
    remote_id: b?.id || undefined,
    name: b?.name || 'Untitled Badge',
    description: b?.description || '',
    icon: b?.icon || '🏅',
    badge_type: type,
    target_value: Number(b?.target_value || 1),
    xp_value: Number(b?.xp_value || 10),
    is_active: isActiveBadge(b),
  };
}
function normaliseBadgeDefinition(b: BadgeDefinition): BadgeDefinition {
  return {
    ...b,
    icon: b.icon || '🏅',
    badge_type: isSupportedAchievementType(b.badge_type) ? b.badge_type : 'sessions_completed',
    target_value: Math.max(1, Number(b.target_value || 1)),
    xp_value: Math.max(0, Number(b.xp_value || 0)),
    is_active: b.is_active !== false,
  };
}
function badgeStableKey(b: Pick<BadgeDefinition, 'name' | 'badge_type' | 'target_value'>) { return `${normalise(b.name)}|${b.badge_type}|${b.target_value}`; }
function getBadgeTombstones(): string[] { return storage<string[]>('bbb_deleted_badges', []); }
function setBadgeTombstones(keys: string[]) { setStorage('bbb_deleted_badges', Array.from(new Set(keys))); }
function isBadgeTombstoned(b: BadgeDefinition) { const keys = getBadgeTombstones(); return keys.includes(b.remote_id || '') || keys.includes(b.id || '') || keys.includes(badgeStableKey(b)); }
function addBadgeTombstone(b: BadgeDefinition) { setBadgeTombstones([...getBadgeTombstones(), b.remote_id || '', b.id || '', badgeStableKey(b)].filter(Boolean)); }
function clearBadgeTombstone(b: BadgeDefinition) { const remove = new Set([b.remote_id || '', b.id || '', badgeStableKey(b)].filter(Boolean)); setBadgeTombstones(getBadgeTombstones().filter(k => !remove.has(k))); }
function mergeBadgeDefinitions(local: BadgeDefinition[], remote: BadgeDefinition[]) {
  const map = new Map<string, BadgeDefinition>();
  [...local, ...remote].forEach(raw => {
    const b = normaliseBadgeDefinition(raw);
    if (isBadgeTombstoned(b)) return;
    const key = badgeStableKey(b);
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, ...b, icon: b.icon || existing.icon || '🏅' } : b);
  });
  return Array.from(map.values());
}
function isUuid(value?: string) { return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
async function saveRemoteBadgeDefinition(def: BadgeDefinition): Promise<BadgeDefinition> {
  const normalised = normaliseBadgeDefinition(def);
  if(!supabase)return {...normalised,sync_state:'failed',sync_error:'Cloud unavailable.'};
  try {
    const badgeId = isUuid(normalised.remote_id || normalised.id) ? (normalised.remote_id || normalised.id) : crypto.randomUUID();
    const row = {
      id: badgeId,
      name: normalised.name,
      description: normalised.description,
      icon: normalised.icon,
      badge_type: normalised.badge_type,
      target_value: normalised.target_value,
      xp_value: normalised.xp_value || 0,
      is_active: normalised.is_active !== false,
    };
    const { data, error } = await supabase.from('badges').upsert(row, { onConflict: 'id' }).select('*').single();
    if (error) throw error;
    const saved = mapRemoteBadgeToLocal(data || row);
    clearBadgeTombstone(saved);
    return {...saved,sync_state:'saved'};
  } catch (err) {
    console.warn('Supabase badge save skipped:', err);
    return {...normalised,sync_state:'failed',sync_error:'Achievement was not saved. Check your connection and retry.'};
  }
}
async function deleteRemoteBadgeDefinition(def:BadgeDefinition){try{await confirmedDelete('badges',def.remote_id||def.id);addBadgeTombstone(def);return true}catch(error:any){notify(`Achievement not deleted: ${error.message}`);return false}}

async function ensureRemoteAthlete(profile:AthleteProfile):Promise<string|null>{try{return await resolveAthlete(profile)}catch(error:any){window.dispatchEvent(new CustomEvent('bbb-write-error',{detail:error.message}));return null}}

async function saveProgrammeWithState(plan:WorkoutPlan):Promise<WorkoutPlan>{const operationOwner=getCacheOwner();
 try{let owner=plan.owner_athlete_id;
 if(owner&&!isUuid(owner)){const profiles=storage<AthleteProfile[]>('bbb_athletes',cleanProfiles);const profile=profiles.find(p=>p.id===owner);if(!profile)throw new Error('Workout owner could not be verified.');owner=await resolveAthlete(profile);}
 const row={id:plan.remote_id||plan.id,name:plan.name,focus:plan.focus||'',session_type:plan.session_type||'Gym',owner_athlete_id:owner||null,is_template:plan.is_template!==false};
 const exercises=plan.exercises.map((e,i)=>({exercise_id:e.exercise_id,exercise_name:e.name,planned_sets:e.planned_sets||3,planned_reps:e.planned_reps||'8-12',planned_weight:e.planned_weight||null,notes:e.notes||null,sort_order:i+1}));
 return await writeRecord('programme','workout_programmes',row,plan,{exercises},operationOwner);
 }catch(error:any){return {...plan,sync_state:'failed',sync_error:error.message};}
}
async function saveRemoteProgramme(plan:WorkoutPlan):Promise<string|null>{const saved=await saveProgrammeWithState(plan);return saved.sync_state==='saved'?saved.remote_id||null:null;}

async function saveRemoteSession(event:CalendarEvent,plan:WorkoutPlan|undefined,profile:AthleteProfile):Promise<CalendarEvent>{const operationOwner=getCacheOwner();
 try{if(plan?.sync_state&&plan.sync_state!=='saved')throw new Error('Upload the workout before assigning it to a calendar.');const athleteId=await resolveAthlete(profile);let programmeId=plan?.remote_id;
 if(plan&&!programmeId){const saved=await saveProgrammeWithState(plan);programmeId=saved.remote_id;if(saved.sync_state!=='saved')return {...event,sync_state:'failed',sync_error:'Save the workout to cloud before assigning it.'};}
 const row={id:event.remote_id||event.id,athlete_id:athleteId,programme_id:programmeId||null,session_date:dateOnly(event.date),start_time:normaliseTime(event.time)||null,title:event.title,session_type:event.type,status:event.status||'planned',class_name:event.class_name||null};
 return await writeRecord('session','training_sessions',row,{...event,athlete_id:profile.id,athlete_email:profile.email,athlete_name:profile.name,remote_plan_id:programmeId},undefined,operationOwner);
 }catch(error:any){return {...event,sync_state:'failed',sync_error:error.message};}
}


async function updateRemoteSessionStatus(event:CalendarEvent,status:CalendarEvent['status'],date?:string,time?:string){const operationOwner=getCacheOwner();
 const row={id:event.remote_id||event.id,status,session_date:dateOnly(date||event.date),start_time:normaliseTime(time||event.time)||null,effort_rating:event.effort_rating||null,athlete_notes:event.athlete_notes||null,skipped_exercises:event.skipped_exercises||[]};
 return writeRecord('session','training_sessions',row,{...event,status},undefined,operationOwner);
}


async function deleteRemoteSession(event:CalendarEvent){try{if(pendingWrites().some(j=>j.key.endsWith(event.remote_id||event.id)))throw new Error('Upload this session before deleting it.');await confirmedDelete('training_sessions',event.remote_id||event.id,event.sync_version);return true}catch(error:any){notify(error.message);return false}}

async function deleteRemoteProgramme(plan:WorkoutPlan){try{if(pendingWrites().some(j=>j.key.endsWith(plan.remote_id||plan.id)))throw new Error('Upload this workout before deleting it.');await confirmedDelete('workout_programmes',plan.remote_id||plan.id,plan.sync_version);return true}catch(error:any){notify(error.message);return false}}




async function saveRemoteSetting(key:string,value:string){if(!supabase)return false;const {error}=await supabase.from('app_settings').upsert({key,value,updated_at:new Date().toISOString()},{onConflict:'key'});return !error;}

async function saveRemoteProfile(profile:AthleteProfile):Promise<AthleteProfile>{const operationOwner=getCacheOwner();try{const id=await resolveAthlete(profile);const row={id,name:profile.name,age:profile.age||null,height_cm:profile.height_cm||null,weight_kg:profile.weight_kg||null,competition_weight_kg:profile.competition_weight_kg||null,belt_rank:profile.belt_rank||null,gym:profile.gym||null,goal:profile.goal||null,profile_photo_url:profile.profile_photo_url||null,weight_unit:profile.weight_unit||'kg'};return await writeRecord('profile','athlete_profiles',row,profile,undefined,operationOwner)}catch(error:any){return {...profile,sync_state:'failed',sync_error:error.message}}}

async function saveRemoteMetric(metric:AthleteMetric):Promise<AthleteMetric>{const operationOwner=getCacheOwner();try{const profile=storage<AthleteProfile>('bbb_profile',defaultProfile);const athlete_id=isUuid(metric.athlete_id)?metric.athlete_id:await resolveAthlete(profile);const row={id:metric.remote_id||metric.id,athlete_id,metric_date:dateOnly(metric.metric_date),weight_kg:metric.weight_kg||null,height_cm:metric.height_cm||null,body_fat_percent:metric.body_fat_percent||null,notes:metric.notes||null};return await writeRecord('metric','athlete_metrics',row,{...metric,athlete_id},undefined,operationOwner)}catch(error:any){return {...metric,sync_state:'failed',sync_error:error.message}}}


async function saveRemoteNutritionTarget(target:NutritionTarget,profile:AthleteProfile):Promise<NutritionTarget>{const operationOwner=getCacheOwner();try{const athlete_id=await resolveAthlete(profile);const row={id:isUuid(target.remote_id||target.id)?target.remote_id||target.id:crypto.randomUUID(),athlete_id,calories:target.calories,protein_g:target.protein_g,carbs_g:target.carbs_g,fats_g:target.fats_g,water_ml:target.water_ml,effective_date:dateOnly(target.effective_date||todayISO())};return await writeRecord('targets','nutrition_targets',row,{...target,id:row.id,athlete_id},undefined,operationOwner)}catch(error:any){return {...target,sync_state:'failed',sync_error:error.message}}}

async function saveRemoteNutritionEntry(entry:NutritionEntry,profile:AthleteProfile):Promise<NutritionEntry>{const operationOwner=getCacheOwner();try{const athlete_id=await resolveAthlete(profile);const row={id:entry.remote_id||entry.id,athlete_id,entry_date:dateOnly(entry.entry_date),meal_type:entry.meal_type,name:entry.name,serving:entry.serving||null,calories:entry.calories,protein_g:entry.protein_g,carbs_g:entry.carbs_g,fats_g:entry.fats_g,water_ml:entry.water_ml,notes:entry.notes||null};return await writeRecord('nutrition','nutrition_entries',row,{...entry,athlete_id},undefined,operationOwner)}catch(error:any){return {...entry,sync_state:'failed',sync_error:error.message}}}

async function deleteRemoteNutritionEntry(entry:NutritionEntry){try{if(pendingWrites().some(j=>j.key.endsWith(entry.remote_id||entry.id)))throw new Error('Upload this entry before deleting it.');await confirmedDelete('nutrition_entries',entry.remote_id||entry.id,entry.sync_version);return true}catch(error:any){notify(error.message);return false}}

async function saveRemoteWorkoutLog(log:WorkoutLog,athlete:AthleteProfile|undefined,event?:CalendarEvent):Promise<WorkoutLog>{const operationOwner=getCacheOwner();
 try{if(!athlete)throw new Error('Athlete ownership is required.');const athleteId=await resolveAthlete(athlete);if(event&&!event.remote_id)throw new Error('Upload the session before logging cloud results. Your draft is retained.');
 const row={id:log.remote_id||log.id,athlete_id:athleteId,session_id:event?.remote_id||null,log_date:dateOnly(log.date),session_type:log.session_type||event?.type||null,exercise_id:log.exercise_id,exercise_name:log.exercise_name,sets:log.sets||[],reps:log.reps||null,weight:log.weight||null,rpe:log.rpe||null,notes:log.notes||null,completed:!!log.completed};
 return await writeRecord('log','workout_logs',row,{...log,athlete_id:athleteId},undefined,operationOwner);
 }catch(error:any){return {...log,sync_state:'failed',sync_error:error.message};}
}



async function buildAppUserFromAuthUser(authUser:any):Promise<AppUser>{
 if(!supabase||!authUser?.id)throw new Error('A verified Supabase account is required.');
 const {data:ap,error:ae}=await supabase.from('athlete_profiles').select('*').eq('auth_user_id',authUser.id).maybeSingle();
 const {data:up,error:ue}=await supabase.from('user_profiles').select('*').eq('auth_user_id',authUser.id).maybeSingle();
 if(ae||ue)throw new Error('Unable to verify your profile and permissions. Retry when connected.');
 if(!ap&&!up)throw new Error('Your account needs an administrator-linked athlete profile.');
 const role=up?.role||ap?.role;if(!['admin','coach','athlete'].includes(role))throw new Error('This account has no valid training role.');
 const mapped=ap?mapRemoteAthleteToLocal(ap):null;
 return {id:authUser.id,email:authUser.email,name:up?.name||up?.full_name||mapped?.name||authUser.email,role,athlete_id:mapped?.id||up.athlete_id};
}



try{scrubLegacyPasswords()}catch{/* Legacy password cleanup can retry next open. */}

function notify(message:string){ window.dispatchEvent(new CustomEvent('bbb-notice',{detail:message})); }
function ActionNotice(){
  const [message,setMessage]=useState('');
  useEffect(()=>{let timer:number; const receive=(event:Event)=>{setMessage((event as CustomEvent<string>).detail);window.clearTimeout(timer);timer=window.setTimeout(()=>setMessage(''),4500);};window.addEventListener('bbb-notice',receive);return()=>{window.removeEventListener('bbb-notice',receive);window.clearTimeout(timer);};},[]);
  return <div className={`actionNotice ${message?'visible':''}`} role="status" aria-live="polite" aria-atomic="true">{message&&<><CheckCircle2 size={20}/><span>{message}</span><button aria-label="Dismiss notification" onClick={()=>setMessage('')}><X size={18}/></button></>}</div>;
}
function useDialog(active:boolean, selector:string, close:()=>void){
  const closeRef=useRef(close);closeRef.current=close;
  useEffect(()=>{if(!active)return;const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLElement>(selector);if(!dialog)return;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href],summary,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
    controls()[0]?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeRef.current();}if(e.key==='Tab'){const items=controls();const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=oldOverflow;if(previous?.isConnected)previous.focus();};
  },[active,selector]);
}

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser|null>(null);
  const [authLoading,setAuthLoading]=useState(!!supabase);
  const [authError,setAuthError]=useState('');
  const userRef=useRef<AppUser|null>(null);
  const [finishedSummary,setFinishedSummary]=useState<any>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  useDialog(drawerOpen, '#app-drawer', ()=>setDrawerOpen(false));
  const [profile, setProfile] = useState<AthleteProfile>(() => storage('bbb_profile', defaultProfile));
  const [athletes, setAthletes] = useState<AthleteProfile[]>(() => storage('bbb_athletes', cleanProfiles));
  const [users, setUsers] = useState<AppUser[]>(() => storage('bbb_users', cleanUsers));
  const [exercises, setExercises] = useState<Exercise[]>(() => storage('bbb_exercises', starter));
  const [events, setEvents] = useState<CalendarEvent[]>(() => storage('bbb_events', []));
  const [logs, setLogs] = useState<WorkoutLog[]>(() => storage('bbb_logs', []));
  const [plans, setPlans] = useState<WorkoutPlan[]>(() => storage('bbb_plans', []));
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(() => storage('bbb_badges', initialBadges));
  const [video, setVideo] = useState<{url: string; title: string} | null>(null);
  const [activeSession, setActiveSession] = useState<CalendarEvent | null>(null);
  const [metrics, setMetrics] = useState<AthleteMetric[]>(() => storage('bbb_metrics', []));
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTarget[]>(() => storage('bbb_nutrition_targets', [defaultNutritionTarget]));
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>(() => storage('bbb_nutrition_entries', []));
  const [dashboardFocusText, setDashboardFocusText] = useState(() => storage('bbb_dashboard_focus', 'Keep stacking the small wins.'));
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncInFlight=useRef<string|null>(null);
  const [syncIssue,setSyncIssue]=useState('');
  const syncTimer = useRef<number | null>(null);

  useEffect(()=>{if(!currentUser||!['builder','library','import','session'].includes(page))return;let active=true;loadCatalogue().then(data=>{if(active)setExercises(prev=>prev.length<=2?data:[...prev])}).catch(()=>notify('Exercise catalogue could not load. Retry when connected.'));return()=>{active=false}},[page,currentUser?.id]);
  useEffect(() => {
    document.documentElement.classList.toggle('drawer-open', drawerOpen);
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.documentElement.classList.remove('drawer-open');
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  function hydrateAccount(user:AppUser){
    if(userRef.current?.id===user.id){setCurrentUser(user);return;}
    setCacheOwner(user.id);userRef.current=user;setSyncIssue('');setSyncing(false);
    const cachedAthletes=storage<AthleteProfile[]>('bbb_athletes',cleanProfiles);
    setAthletes(cachedAthletes);setUsers(storage('bbb_users',cleanUsers));setProfile(profileForUser(user,cachedAthletes));
    setEvents(storage('bbb_events',[]));setLogs(storage('bbb_logs',[]));setPlans(storage('bbb_plans',[]));setMetrics(storage('bbb_metrics',[]));setNutritionTargets(storage('bbb_nutrition_targets',[]));setNutritionEntries(storage('bbb_nutrition_entries',[]));setBadgeDefinitions(storage('bbb_badges',initialBadges));setActiveSession(null);setFinishedSummary(null);setPage('dashboard');setCurrentUser(user);
  }
  useEffect(()=>{
    if(!supabase){setAuthLoading(false);return;}let alive=true;let request=0;
    async function verify(){const turn=++request;setAuthError('');
      try{const {data,error}=await supabase!.auth.getUser();if(!alive||turn!==request)return;
        if(error||!data.user){userRef.current=null;setCacheOwner(null);setCurrentUser(null);return;}
        if(userRef.current?.id===data.user.id)return;
        const user=await buildAppUserFromAuthUser(data.user);if(alive&&turn===request)hydrateAccount(user);
      }catch(err:any){if(alive){userRef.current=null;setCacheOwner(null);setCurrentUser(null);setAuthError(err.message||'Unable to verify your account.');}}
      finally{if(alive&&turn===request)setAuthLoading(false);}
    }
    void verify();const {data:sub}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!session){++request;userRef.current=null;setCacheOwner(null);setCurrentUser(null);setEvents([]);setLogs([]);setPlans([]);setMetrics([]);setNutritionEntries([]);setNutritionTargets([]);setActiveSession(null);setDrawerOpen(false);setAuthLoading(false);return;}
      if(userRef.current?.id!==session.user.id)window.setTimeout(()=>{if(alive)void verify()},0);
    });return()=>{alive=false;++request;sub.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{const complete=(event:Event)=>{
    const {owner,job,row}=(event as CustomEvent).detail;if(owner!==userRef.current?.id)return;
    const saved=(value:any)=>value.id===job.payload.local_id||value.remote_id===row.id||value.id===row.id?{...value,remote_id:row.id,sync_state:'saved',sync_error:undefined,sync_version:row.sync_version}:value;
    if(job.entity==='programme')setPlans(prev=>prev.map(saved));
    if(job.payload.table==='training_sessions')setEvents(prev=>prev.map(saved));
    if(job.payload.table==='workout_logs')setLogs(prev=>prev.map(saved));
    if(job.payload.table==='nutrition_entries')setNutritionEntries(prev=>prev.map(saved));
    if(job.payload.table==='nutrition_targets')setNutritionTargets(prev=>prev.map(saved));
    if(job.payload.table==='athlete_metrics')setMetrics(prev=>prev.map(saved));if(job.payload.table==='athlete_profiles'){setProfile(saved);setAthletes(prev=>prev.map(saved))}
  };window.addEventListener('bbb-write-complete',complete);return()=>window.removeEventListener('bbb-write-complete',complete)},[]);

  function storeAccount<T>(key:string,value:T){if(currentUser&&getCacheOwner()===currentUser.id)setStorage(key,value)}
  useEffect(()=>{if(currentUser)void flushWrites()},[currentUser?.id]);
  useEffect(() => { storeAccount('bbb_profile', profile); }, [profile]);
  useEffect(() => { storeAccount('bbb_athletes', athletes); }, [athletes]);
  useEffect(() => { storeAccount('bbb_users', users); }, [users]);
  useEffect(() => { storeAccount('bbb_exercises', exercises); }, [exercises]);
  useEffect(() => { storeAccount('bbb_events', events); }, [events]);
  useEffect(() => { storeAccount('bbb_logs', logs); }, [logs]);
  useEffect(() => { storeAccount('bbb_plans', plans); }, [plans]);
  useEffect(() => { storeAccount('bbb_badges', badgeDefinitions); }, [badgeDefinitions]);
  useEffect(() => { storeAccount('bbb_metrics', metrics); }, [metrics]);
  useEffect(() => { storeAccount('bbb_nutrition_targets', nutritionTargets); }, [nutritionTargets]);
  useEffect(() => { storeAccount('bbb_nutrition_entries', nutritionEntries); }, [nutritionEntries]);
  useEffect(() => { storeAccount('bbb_dashboard_focus', dashboardFocusText); }, [dashboardFocusText]);

  useEffect(() => {
    if (!currentUser) return;
    const athlete = athletes.find(a => a.id === currentUser.athlete_id)
      || athletes.find(a => normalise(a.email) === normalise(currentUser.email));
    if (athlete) setProfile(athlete);
  }, [currentUser?.id, currentUser?.athlete_id, currentUser?.email, athletes]);

  useEffect(() => {
    const repaired = repairAssignedEvents(events, athletes, users);
    if (repaired !== events) setEvents(repaired);
  }, [athletes, users]);

  const queuedIds=()=>new Set(pendingWrites().flatMap(j=>[j.payload.row.id,j.payload.local_id].filter(Boolean)));
  const loadFromSupabase = useCallback(async (_reason = 'manual') => {
    if(!supabase||!currentUser||syncInFlight.current===currentUser.id)return;
    const accountId=currentUser.id;
    const sameAccount=()=>userRef.current?.id===accountId;
    await flushWrites();
    if(!sameAccount())return;
    syncInFlight.current=accountId;
    setSyncing(true);
    try {
      const { data: exerciseRows, error: exerciseError } = await supabase.from('exercises').select('*').eq('is_archived', false).order('name');
      if(!sameAccount())return;
      if (!exerciseError && exerciseRows?.length) setExercises(exerciseRows as Exercise[]);

      const { data: remoteBadges, error: remoteBadgeError } = await supabase.from('badges').select('*').order('created_at', { ascending:true });
      if(!sameAccount())return;
      if (!remoteBadgeError) setBadgeDefinitions(mergeBadgeDefinitions([], (remoteBadges || []).map(mapRemoteBadgeToLocal).filter(b => !isBadgeTombstoned(b))));

      const { data: remoteAthletes, error: athleteLoadError } = await supabase.from('athlete_profiles').select('*');
      if(!sameAccount())return;
      if (!athleteLoadError) {
        const mappedAthletes = (remoteAthletes || []).filter(remoteAthleteIsActive).map(mapRemoteAthleteToLocal);
        const canonical = canonicaliseAthletes(mappedAthletes.length ? mappedAthletes : cleanProfiles);
        setAthletes(prev=>mergePending(canonical,prev,queuedIds()));
        const current = canonical.find(a => a.id === currentUser.athlete_id) || canonical.find(a => normalise(a.email) === normalise(currentUser.email));
        if(current)setProfile(prev=>pendingWrites().some(j=>j.payload.table==='athlete_profiles'&&j.payload.row.id===current.remote_id)?prev:current);
      }

      const [{ data: remotePlans, error: plansError }, { data: remotePlanExercises, error: planExercisesError }] = await Promise.all([
        supabase.from('workout_programmes').select('*').order('created_at', { ascending:false }),
        supabase.from('workout_programme_exercises').select('*').order('sort_order', { ascending:true }),
      ]);
      if(!sameAccount())return;
      if (!plansError && !planExercisesError) {
        const mappedPlans: WorkoutPlan[] = (remotePlans || []).filter(isAfterCleanStart).map((p:any)=>({
          id:p.id,remote_id:p.id,sync_version:p.sync_version,sync_state:'saved', name:p.name, focus:p.focus || '', session_type:(p.session_type || 'Gym') as SessionType,
          owner_athlete_id:p.owner_athlete_id || undefined, created_by_user_id:p.created_by || undefined, is_template:p.is_template !== false,
          exercises:(remotePlanExercises || []).filter((e:any)=>e.programme_id===p.id).map((e:any)=>({
            exercise_id:e.exercise_id, name:e.exercise_name || e.exercise_id, planned_sets:e.planned_sets || 3,
            planned_reps:e.planned_reps || '8-12', planned_weight:e.planned_weight || '', notes:e.notes || '',
          })),
        }));
        setPlans(prev=>mergePending(mappedPlans,prev,queuedIds()));
      }

      const { data: remoteSessions, error: sessionsError } = await supabase.from('training_sessions').select('*').order('session_date', { ascending:true });
      if(!sameAccount())return;
      if (!sessionsError) {
        const athleteLookup = new Map((remoteAthletes || []).map((a:any)=>[a.id,a]));
        const mappedEvents: CalendarEvent[] = (remoteSessions || []).filter(isAfterCleanStart).map((e:any)=>{
          const remoteAthlete = athleteLookup.get(e.athlete_id) as any;
          const athleteProfile = remoteAthlete ? mapRemoteAthleteToLocal(remoteAthlete) : undefined;
          return {
            id:e.id,remote_id:e.id,sync_version:e.sync_version,sync_state:'saved',effort_rating:e.effort_rating,athlete_notes:e.athlete_notes,skipped_exercises:e.skipped_exercises||[], athlete_id:athleteProfile?.id || e.athlete_id,
            athlete_email:athleteProfile?.email || remoteAthlete?.email || undefined,
            athlete_name:athleteProfile?.name || remoteAthleteDisplayName(remoteAthlete) || undefined,
            workout_plan_id:e.programme_id || undefined, remote_plan_id:e.programme_id || undefined,
            date:dateOnly(e.session_date), time:normaliseTime(e.start_time), end_time:normaliseTime(e.end_time),
            title:e.title, type:(e.session_type || 'Gym') as SessionType,
            status:(e.status || 'planned') as CalendarEvent['status'], class_name:e.class_name || undefined,
          };
        });
        setEvents(prev=>mergePending(canonicaliseEvents(mappedEvents),prev,queuedIds()));
      }

      const { data: remoteLogs, error: logsError } = await supabase.from('workout_logs').select('*').order('created_at', { ascending:false });
      if(!sameAccount())return;
      if (!logsError) setLogs(prev=>mergePending<WorkoutLog>((remoteLogs || []).map((l:any)=>({
        id:l.id, session_id:l.session_id || undefined, date:dateOnly(l.log_date || l.created_at),
        session_type:(l.session_type || 'Gym') as SessionType, exercise_id:l.exercise_id || '',
        exercise_name:l.exercise_name || 'Exercise', sets:Array.isArray(l.sets) ? l.sets : [], reps:l.reps || undefined,
        weight:l.weight || undefined, rpe:l.rpe || undefined, notes:l.notes || undefined, completed:l.completed !== false,remote_id:l.id,athlete_id:l.athlete_id,sync_version:l.sync_version,sync_state:'saved',
      })),prev,queuedIds()));

      const { data: remoteMetrics, error: metricsError } = await supabase.from('athlete_metrics').select('*').order('metric_date', { ascending:true });
      if(!sameAccount())return;
      if (!metricsError) setMetrics(prev=>mergePending<AthleteMetric>((remoteMetrics || []).map((m:any)=>({
        id:m.id,remote_id:m.id,sync_version:m.sync_version,sync_state:'saved', athlete_id:m.athlete_id, metric_date:dateOnly(m.metric_date),
        weight_kg:m.weight_kg ? Number(m.weight_kg) : undefined, height_cm:m.height_cm ? Number(m.height_cm) : undefined,
        body_fat_percent:m.body_fat_percent ? Number(m.body_fat_percent) : undefined, notes:m.notes || undefined,
      })),prev,queuedIds()));

      const { data: settings, error: settingsError } = await supabase.from('app_settings').select('*').in('key', ['dashboard_focus_text']);
      if(!sameAccount())return;
      if (!settingsError) {
        const focus = (settings || []).find((r:any)=>r.key==='dashboard_focus_text')?.value;
        if (focus) setDashboardFocusText(focus);
      }

      const { data: targetRows, error: targetError } = await supabase.from('nutrition_targets').select('*').order('updated_at', { ascending:false });
      if(!sameAccount())return;
      if (!targetError) setNutritionTargets(prev=>mergePending<NutritionTarget>((targetRows || []).map((t:any)=>({
        id:t.id,remote_id:t.id,sync_version:t.sync_version,sync_state:'saved', athlete_id:t.athlete_id, calories:Number(t.calories || 0), protein_g:Number(t.protein_g || 0),
        carbs_g:Number(t.carbs_g || 0), fats_g:Number(t.fats_g || 0), water_ml:Number(t.water_ml || 0), effective_date:dateOnly(t.effective_date || todayISO()),
      })),prev,queuedIds()));

      const startDate = iso(addDays(new Date(), -120));
      const { data: entryRows, error: entryError } = await supabase.from('nutrition_entries').select('*').gte('entry_date', startDate).order('created_at', { ascending:false });
      if(!sameAccount())return;
      if (!entryError) setNutritionEntries(prev=>mergePending<NutritionEntry>((entryRows || []).map((n:any)=>({
        id:n.id,remote_id:n.id,sync_version:n.sync_version,sync_state:'saved', athlete_id:n.athlete_id, entry_date:dateOnly(n.entry_date), meal_type:(n.meal_type || 'Snack') as MealType,
        name:n.name || 'Nutrition entry', serving:n.serving || undefined, calories:Number(n.calories || 0), protein_g:Number(n.protein_g || 0),
        carbs_g:Number(n.carbs_g || 0), fats_g:Number(n.fats_g || 0), water_ml:Number(n.water_ml || 0), notes:n.notes || undefined, created_at:n.created_at,
      })),prev,queuedIds()));

      if(!sameAccount())return;
      const {data:classes,error:classError}=await supabase.from('fma_classes').select('*').eq('is_active',true);if(sameAccount()&&!classError&&classes){setStorage('bbb_fma_classes',classes.map((c:any)=>({name:c.class_name,type:c.class_type||'FMA',focus:c.focus||''})));window.dispatchEvent(new CustomEvent('bbb-classes-updated'));}
      const errors=[exerciseError,remoteBadgeError,athleteLoadError,plansError,planExercisesError,sessionsError,logsError,metricsError,settingsError,targetError,entryError,classError].filter(Boolean);if(errors.length){setSyncIssue('Some cloud data could not refresh. Your local work is retained. Retry Sync when connected.');}else{setSyncIssue('');setLastSynced(new Date());}
    } catch (err) {
      console.warn('Supabase cloud sync skipped:',err);if(sameAccount())setSyncIssue('Cloud refresh was interrupted. Your local work is retained. Retry Sync.');
    } finally {
      if(syncInFlight.current===accountId)syncInFlight.current=null;
      if(sameAccount())setSyncing(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.athlete_id]);

  const requestSync = useCallback((reason='auto') => {
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => loadFromSupabase(reason), 80);
  }, [loadFromSupabase]);

  // Controlled cloud refresh: load once when the authenticated user opens/refreshes the app.
  // Further refreshes happen only when the user presses the sync control. This prevents
  // background refreshes from overwriting an in-progress form or completion action.
  useEffect(() => { if (currentUser) requestSync('open'); }, [currentUser?.id, requestSync]);

  useEffect(()=>{const useCloud=(event:Event)=>{const {id,local_id,key}=(event as CustomEvent).detail;const remove=(rows:any[])=>rows.filter(r=>r.id!==local_id&&r.id!==id&&r.remote_id!==id);if(key.startsWith('workout_programmes:'))setPlans(remove);if(key.startsWith('workout_logs:'))setLogs(remove);if(key.startsWith('training_sessions:'))setEvents(remove);if(key.startsWith('nutrition_entries:'))setNutritionEntries(remove);if(key.startsWith('nutrition_targets:'))setNutritionTargets(remove);if(key.startsWith('athlete_metrics:'))setMetrics(remove);requestSync('user-conflict-resolution');};window.addEventListener('bbb-use-cloud',useCloud);return()=>window.removeEventListener('bbb-use-cloud',useCloud)},[requestSync]);
  const visibleEvents = useMemo(() => currentUser ? events.filter(e => isEventVisibleForUser(e, currentUser)) : [], [events, currentUser]);
  const visibleLogs = useMemo(() => {
    if (!currentUser) return [];
    const sessionIds = new Set(visibleEvents.map(e=>e.id));
    return logs.filter(l=>l.athlete_id===profile.id||!!profile.remote_id&&l.athlete_id===profile.remote_id||!!l.session_id&&sessionIds.has(l.session_id));
  }, [logs,visibleEvents,currentUser,profile.id,profile.remote_id]);
  const liveBadges = useMemo(() => buildBadges(visibleLogs, visibleEvents, badgeDefinitions), [visibleLogs, visibleEvents, badgeDefinitions]);
  const targetForProfile = useMemo(() => nutritionTargets.find(t => t.athlete_id === profile.remote_id || t.athlete_id === profile.id) || { ...defaultNutritionTarget, athlete_id: profile.remote_id || profile.id }, [nutritionTargets, profile.id, profile.remote_id]);
  const nutritionForProfile = useMemo(() => nutritionEntries.filter(n => n.athlete_id === profile.remote_id || n.athlete_id === profile.id), [nutritionEntries, profile.id, profile.remote_id]);

  async function handleLogout(){userRef.current=null;setCacheOwner(null);setCurrentUser(null);setEvents([]);setLogs([]);setPlans([]);setMetrics([]);setNutritionEntries([]);setActiveSession(null);setDrawerOpen(false);if(supabase)await supabase.auth.signOut();}
  function go(p: Page){ setPage(p); setDrawerOpen(false); window.scrollTo({top:0, behavior:'smooth'}); }
  function openSession(event: CalendarEvent){ setActiveSession(event); setPage('session'); setDrawerOpen(false); }

  if(authLoading)return <main className="authLoading"><Shield/><p>Verifying your account…</p></main>;
  if(!currentUser)return <><LoginScreen users={users} setCurrentUser={hydrateAccount}/>{authError&&<div className="authProblem" role="alert">{authError}<button onClick={()=>window.location.reload()}>Retry account verification</button></div>}</>;

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(currentUser.role));
  const activeTitle = page === 'session' ? (activeSession?.class_name || activeSession?.type === 'FMA' ? 'Class Session' : 'Complete Workout') : visibleNav.find(n=>n.page===page)?.label || 'Home';

  function guard<T>(setter:React.Dispatch<React.SetStateAction<T>>):React.Dispatch<React.SetStateAction<T>>{const owner=currentUser!.id;return value=>{if(userRef.current?.id===owner)setter(value)}}
  return <div className="appShell v4Shell">
    <header className="topbar v4Topbar">
      <button className="iconButton navTrigger" onClick={()=>setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="app-drawer"><Menu size={25}/></button>
      <button className="topBrand" onClick={()=>go('dashboard')} aria-label="Go home"><span className="brandShield"><Shield size={24}/></span><div><b>BlackBelt<span className="brandLight">Bootcamp</span></b><span>ATHLETE DEVELOPMENT</span></div></button>
      <button className="syncPill" aria-label={syncing?'Syncing':'Sync latest data'} title={displaySyncTime(lastSynced)} onClick={()=>requestSync('manual')} disabled={syncing}><Cloud size={16}/><span>{syncing ? 'Syncing…' : displaySyncTime(lastSynced)}</span><RefreshCw size={15} className={syncing ? 'spinning' : ''}/></button>
      <button className="profileChip" aria-label="Open profile" onClick={()=>go('profile')}><span className="avatar">{profile.profile_photo_url ? <img src={profile.profile_photo_url} alt=""/> : getInitials(profile.name)}</span><span><b>{currentUser.name}</b><em>{titleCase(currentUser.role)}</em></span><ChevronRight size={17}/></button>
    </header>

    {drawerOpen && <div className="drawerBackdrop" onClick={()=>setDrawerOpen(false)} />}
    <aside id="app-drawer" className={`drawer v4Drawer ${drawerOpen ? 'open' : ''}`} role="dialog" aria-modal={drawerOpen || undefined} aria-label="App menu" aria-hidden={!drawerOpen} {...(!drawerOpen?{inert:''}:{})}>
      <div className="drawerHead"><div className="brand"><span className="brandShield"><Shield size={24}/></span><div><h1>BlackBeltBootcamp</h1><span>Your training, connected</span></div></div><button className="iconButton" aria-label="Close menu" onClick={()=>setDrawerOpen(false)}><X size={20}/></button></div>
      <button className="drawerUser drawerUserButton" onClick={()=>go('profile')}><span className="avatar large">{getInitials(profile.name)}</span><span className="drawerIdentity"><b>{currentUser.name}</b><span>{currentUser.email}</span><em>{titleCase(currentUser.role)} profile</em></span><ChevronRight size={18}/></button>
      <nav>{['Athlete','Training','Progress','Admin'].map(group => {
        const links = visibleNav.filter(n=>n.group===group);
        if (!links.length) return null;
        return <div className="navGroup" key={group}><small>{group}</small>{links.map(n => <button key={n.page} onClick={() => go(n.page)} className={page===n.page?'active':''}>{n.icon}<span>{n.label}</span></button>)}</div>;
      })}</nav>
      <button className="logoutButton" onClick={handleLogout}><LogOut size={18}/> Sign out</button>
    </aside>

    <main className={`pageFrame v4PageFrame page-${page}`}><SyncBanner key={currentUser.id}/>{syncIssue&&<div className="status" role="alert">{syncIssue}<button onClick={()=>requestSync('retry')} disabled={syncing}>Retry Sync</button></div>}
      {['calendar','today','builder','library','fma'].includes(page)&&<nav className="trainingNav" aria-label="Training tools">{([['calendar','Calendar',CalendarDays],['builder','Builder',Dumbbell],['library','Exercises',Library],['fma','Classes',Shield]] as const).map(([id,label,Icon])=><button key={id} aria-current={page===id?'page':undefined} className={page===id?'active':''} onClick={()=>go(id)}><Icon size={17}/>{label}</button>)}</nav>}
      {page!=='dashboard' && page!=='session' && <PageIntro page={page} title={activeTitle} profile={profile} />}
      {page==='dashboard'&&finishedSummary&&<WorkoutSummary summary={finishedSummary} onDone={()=>setFinishedSummary(null)} onProgress={()=>{setFinishedSummary(null);go('stats')}}/>}
      {page==='dashboard'&&!finishedSummary && <Dashboard logs={visibleLogs} events={visibleEvents} badges={liveBadges} profile={profile} focusText={dashboardFocusText} target={targetForProfile} nutritionEntries={nutritionForProfile} plans={plans} setPage={go} openSession={openSession}/>} 
      {page==='library' && <ExerciseLibrary exercises={exercises} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} />}
      {page==='import'&&currentUser.role!=='athlete' && <Importer setExercises={setExercises} reloadSupabase={()=>loadFromSupabase('import')} exercises={exercises} />}
      {page==='builder' && <WorkoutBuilder exercises={exercises} plans={plans} setPlans={guard(setPlans)} currentUser={currentUser} athletes={athletes} users={users} events={events} setEvents={guard(setEvents)} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} />}
      {page==='today' && <Today events={visibleEvents} exercises={exercises} logs={visibleLogs} setLogs={guard(setLogs)} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} openSession={openSession}/>} 
      {page==='calendar' && <TrainingCalendar events={visibleEvents} allEvents={events} setEvents={guard(setEvents)} openSession={openSession} currentUser={currentUser} profile={profile} plans={plans} syncing={syncing} lastSynced={lastSynced} onRefresh={()=>requestSync('calendar')} />}
      {page==='session' && <SessionWorkout session={activeSession} setSession={guard(setActiveSession)} exercises={exercises} plans={plans} logs={visibleLogs} setLogs={guard(setLogs)} events={events} setEvents={guard(setEvents)} profile={profile} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} onSessionFinished={(summary)=>{if(userRef.current?.id!==currentUser.id)return;setFinishedSummary(summary);setActiveSession(null);go('dashboard')}} onBack={()=>{ setActiveSession(null); go('today'); }}/>} 
      {page==='fma' && <FmaClasses currentUser={currentUser} events={visibleEvents} setEvents={guard(setEvents)} openSession={openSession} profile={profile}/>} 
      {page==='nutrition' && <Nutrition profile={profile} target={targetForProfile} entries={nutritionForProfile} setTargets={guard(setNutritionTargets)} allTargets={nutritionTargets} setEntries={guard(setNutritionEntries)} allEntries={nutritionEntries}/>} 
      {page==='stats' && <Suspense fallback={<section className="panel">Loading progress…</section>}><Stats logs={visibleLogs} events={visibleEvents} profile={profile} metrics={metrics}/></Suspense>} 
      {page==='badges' && <Badges badges={liveBadges}/>} 
      {page==='profile' && <Profile profile={profile} metrics={metrics} setMetrics={guard(setMetrics)} setProfile={async (p)=>{const owner=currentUser.id;const saved=await saveRemoteProfile(p);if(userRef.current?.id!==owner)return;setProfile(saved);setAthletes(prev=>prev.map(a=>a.id===p.id?saved:a));return saved;}}/>} 
      {page==='admin'&&currentUser.role!=='athlete' && <Admin profile={profile} events={events} setEvents={guard(setEvents)} plans={plans} setPlans={guard(setPlans)} logs={logs} setLogs={guard(setLogs)} exercises={exercises} setExercises={setExercises} users={users} setUsers={guard(setUsers)} athletes={athletes} setAthletes={guard(setAthletes)} metrics={metrics} setMetrics={guard(setMetrics)} dashboardFocusText={dashboardFocusText} setDashboardFocusText={setDashboardFocusText} badgeDefinitions={badgeDefinitions} setBadgeDefinitions={guard(setBadgeDefinitions)}/>} 
    </main>

    <nav className="bottomNav" aria-label="Primary navigation">
      <button aria-current={page==='dashboard'?'page':undefined} className={page==='dashboard'?'active':''} onClick={()=>go('dashboard')}><Home/><span>Home</span></button>
      <button aria-current={['calendar','today','builder','library','fma','session'].includes(page)?'page':undefined} className={['calendar','today','builder','library','fma','session'].includes(page)?'active':''} onClick={()=>go('calendar')}><Activity/><span>Training</span></button>
      <button aria-current={page==='nutrition'?'page':undefined} className={page==='nutrition'?'active':''} onClick={()=>go('nutrition')}><Utensils/><span>Nutrition</span></button>
      <button aria-current={['stats','badges'].includes(page)?'page':undefined} className={['stats','badges'].includes(page)?'active':''} onClick={()=>go('stats')}><Trophy/><span>Progress</span></button>
    </nav>
    <ActionNotice key={currentUser.id}/>
    {video && <VideoModal title={video.title} url={video.url} onClose={()=>setVideo(null)} />}
  </div>;
}

function PageIntro({page,title,profile}:{page:Page;title:string;profile:AthleteProfile}){
  const copy: Partial<Record<Page,string>> = {
    calendar:'Plan and review training.', today:'Open the session you need.',
    library:'Find the right movement quickly.', builder:'Build, preview and order the session.',
    fma:'Classes and attendance.', nutrition:'Track today’s fuel and hydration.',
    stats:'See progress over time.', badges:'Milestones earned through consistency.', profile:'Goals, preferences and progress data.',
    admin:'Coach, plan and review athletes.', import:'Manage exercises and demo videos.'
  };
  return <section className={`compactPageHeader compactPageHeader-${page}`}><div><h2>{title}</h2><p>{copy[page] || `${profile.name} · ${profile.gym || 'BlackBeltBootcamp'}`}</p></div></section>;
}
function LoginScreen({setCurrentUser}:{users:AppUser[]; setCurrentUser:(u:AppUser)=>void}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [resetEmail,setResetEmail]=useState('');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [showReset,setShowReset]=useState(false);
  async function login(e: React.FormEvent){
    e.preventDefault(); setStatus(''); setBusy(true);
    try {
      if (!supabase) { setStatus('Supabase is not configured. Add the environment variables in Netlify.'); return; }
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) { setStatus(error?.message || 'Unable to sign in.'); return; }
      setCurrentUser(await buildAppUserFromAuthUser(data.user));
    } finally { setBusy(false); }
  }
  async function resetPassword(){
    setStatus(''); if(!supabase){setStatus('Supabase is not configured.');return;}
    const target=(resetEmail||email).trim(); if(!target){setStatus('Enter your email first.');return;}
    const {error}=await supabase.auth.resetPasswordForEmail(target,{redirectTo:window.location.origin});
    setStatus(error?error.message:`Password reset email sent to ${target}.`);
  }
  return <main className="loginPage v4Login"><section className="loginVisual"><span className="brandShield giant"><Shield/></span><span className="eyebrow">BlackBeltBootcamp</span><h1>Built for<br/>the work.</h1><p>Your training. Your progress. Every session counts.</p><div className="loginPromises"><span><CheckCircle2/>Cloud synced</span><span><CheckCircle2/>Coach assigned</span><span><CheckCircle2/>Athlete focused</span></div></section><section className="loginCard"><div className="loginBrand"><span className="brandShield"><Shield/></span><div><h2>Welcome back</h2><p>Sign in to continue your training.</p></div></div><form onSubmit={login} className="loginForm"><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/></label>{status&&<div className={`status ${/unable|error|invalid/i.test(status)?'error':''}`}>{status}</div>}<button className="primary big wide" type="submit" disabled={!email||!password||busy}>{busy?'Signing in…':'Sign in'}<ChevronRight/></button></form><button className="forgotButton" onClick={()=>setShowReset(v=>!v)}>Forgot your password?</button>{showReset&&<div className="passwordResetBox"><label>Password reset email<input value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="Use login email if blank"/></label><button onClick={resetPassword}><KeyRound size={16}/>Send reset link</button></div>}<p className="secureNote"><Shield size={15}/>Private account · training connected across devices</p></section></main>
}
function Dashboard({logs,events,badges,profile,focusText,target,nutritionEntries,plans,setPage,openSession}:{logs:WorkoutLog[];events:CalendarEvent[];badges:Badge[];profile:AthleteProfile;focusText:string;target:NutritionTarget;nutritionEntries:NutritionEntry[];plans:WorkoutPlan[];setPage:(p:Page)=>void;openSession:(e:CalendarEvent)=>void}) {
  const today = todayISO();
  const weekStart = iso(startOfWeek());
  const weekEnd = iso(addDays(weekStart,6));
  const todaySessions = events.filter(e=>dateOnly(e.date)===today).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const futureSessions = events.filter(e=>e.status==='planned' && dateOnly(e.date)>=today).sort((a,b)=>`${dateOnly(a.date)} ${a.time||''}`.localeCompare(`${dateOnly(b.date)} ${b.time||''}`));
  const next = todaySessions.find(e=>e.status==='planned') || futureSessions[0];
  const nextPlan = next ? plans.find(p=>p.id===next.workout_plan_id || p.remote_id===next.remote_plan_id || p.remote_id===next.workout_plan_id) : undefined;
  const hasStarted = !!next && (storage<string|null>('bbb_active_workout',null)===next.id || logs.some(l=>l.session_id===next.id || (!!next.remote_id && l.session_id===next.remote_id)));
  const weekEvents = events.filter(e=>dateOnly(e.date)>=weekStart && dateOnly(e.date)<=weekEnd);
  const weekCompleted = weekEvents.filter(e=>e.status==='completed').length;
  const weekPercent = clampPercent(weekCompleted, Math.max(weekEvents.length,1));
  const todayNutrition = nutritionTotals(nutritionEntries.filter(e=>dateOnly(e.entry_date)===today));
  const nextBadges = badges.filter(b=>!b.unlocked).sort((a,b)=>{
    const aRemaining=(a.target_value-a.current_count)/Math.max(1,a.target_value);
    const bRemaining=(b.target_value-b.current_count)/Math.max(1,b.target_value);
    return aRemaining-bRemaining || b.progress-a.progress;
  }).slice(0,3);
  const firstName = profile.name.split(' ')[0] || profile.name;
  const friendlyDate = dateFromIso(today).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  return <div className="dashboardV4 compactDashboard">
    <section className="homeGreeting"><div><span>{friendlyDate}</span><h1>Ready, {firstName}?</h1><p>Build the athlete. One session at a time.</p></div><span className="homeMonogram">{getInitials(profile.name)}</span></section>

    <nav className="homeQuickActions" aria-label="Quick actions"><button onClick={()=>setPage('builder')}><Plus size={18}/>Build workout<ChevronRight size={16}/></button><button onClick={()=>setPage('calendar')}><CalendarDays size={18}/>Your schedule<ChevronRight size={16}/></button></nav>
    <div className="dashboardMainGrid homePriorityGrid">
      <section className="featureCard nextSessionCard compactNextSession">
        <div className="cardLabel"><span className="liveDot"/><span>{next && dateOnly(next.date)!==today ? 'Next workout' : 'Today’s workout'}</span></div>
        {next ? <><h3>{next.title}</h3><div className="compactSessionMeta"><span><Clock size={15}/>{dateOnly(next.date)===today?'Today':dayLabel(next.date)} · {next.time || 'Time TBC'}</span><span><Dumbbell size={15}/>{next.class_name?'Class attendance':`${nextPlan?.exercises.length || '—'} exercises`} · {nextPlan?.location || next.type}</span></div><button className="primary wide" onClick={()=>openSession(next)}>{next.class_name? 'Open class':hasStarted?'Resume workout':'Start workout'}<ArrowRight size={18}/></button></> : <><div className="emptyFeature compactEmpty"><CalendarDays/><h3>No workout planned</h3></div><button className="primary wide" onClick={()=>setPage('calendar')}>Open calendar</button></>}
      </section>

      <section className="featureCard weeklyProgressCard compactWeeklyProgress">
        <div className="cardLabel"><BarChart3 size={18}/><span>Weekly progress</span></div>
        <div className="compactProgressLine"><div className="compactProgressValue"><b>{weekCompleted}/{weekEvents.length || 0}</b><span>sessions</span></div><div className="progress"><i style={{width:`${weekPercent}%`}}/></div><em>{weekPercent}% complete</em></div>
        <div className="weekDots">{Array.from({length:7},(_,i)=>{const d=iso(addDays(weekStart,i));const dayEvents=weekEvents.filter(e=>dateOnly(e.date)===d);const completed=dayEvents.some(e=>e.status==='completed');const planned=dayEvents.some(e=>e.status==='planned');return <span key={d} className={completed?'complete':planned?'planned':''}><i>{completed?'✓':planned?'•':''}</i>{dateFromIso(d).toLocaleDateString('en-GB',{weekday:'short'}).slice(0,1)}</span>})}</div>
      </section>

      <section className="featureCard nutritionSummaryCard"><button className="cardOpenAction" aria-label="Open nutrition" onClick={()=>setPage('nutrition')}/>
        <div className="cardLabel"><Utensils size={18}/><span>Nutrition today</span><ChevronRight size={17}/></div>
        <div className="homeFuelStats"><div><span>Protein</span><strong>{todayNutrition.protein_g}<small> / {target.protein_g} g</small></strong><div className="progress"><i style={{width:`${clampPercent(todayNutrition.protein_g,target.protein_g)}%`}}/></div></div><div><span>Water</span><strong>{(todayNutrition.water_ml/1000).toFixed(1)}<small> / {(target.water_ml/1000).toFixed(1)} L</small></strong><div className="progress waterProgress"><i style={{width:`${clampPercent(todayNutrition.water_ml,target.water_ml)}%`}}/></div></div></div>
      </section>

      <section className="featureCard achievementsCard"><div className="cardLabel"><Trophy size={18}/><span>Next achievements</span><button className="textButton" aria-label="Open achievements" onClick={()=>setPage('badges')}><ChevronRight size={17}/></button></div>{nextBadges.length ? nextBadges.map(b=><div className="achievementLine" key={b.id}><span>{b.icon}</span><div><div><b>{b.name}</b><em>{b.current_count}/{b.target_value}</em></div><div className="progress"><i style={{width:`${b.progress}%`}}/></div></div></div>) : <p className="muted">All current achievements unlocked.</p>}</section>

      <section className="featureCard focusCard"><div className="cardLabel"><Target size={18}/><span>Today’s focus</span></div><blockquote>{focusText || 'Keep stacking the small wins.'}</blockquote></section>
    </div>
  </div>
}
function MetricRing({value,target,label,suffix,tone}:{value:number;target:number;label:string;suffix:string;tone:string}){
  const pct=clampPercent(value,target);
  const display=Number.isInteger(value)?value:value.toFixed(1);
  return <div className={`metricRing ${tone}`}><div className="metricCircle" style={{'--progress':`${pct * 3.6}deg`} as React.CSSProperties}><b>{display}{suffix}</b></div><strong>{label}</strong><span>of {target}{suffix}</span></div>
}
function Kpi({label,value}:{label:string;value:string|number}){ return <div className="kpi"><span>{label}</span><b>{value}</b></div> }
function SessionRow({event,onClick}:{event:CalendarEvent; onClick:()=>void}){ return <button className="sessionRow" onClick={onClick}><span className={classNameForType(event.type)}>{event.type}</span><div><b>{event.time || 'Time TBC'} · {event.title}</b><em>{dayLabel(event.date)}</em></div><ChevronRight size={18}/></button> }
function ExerciseLibrary({exercises,onPlay}:{exercises:Exercise[];onPlay:(e:Exercise)=>void}){
  const [q,setQ]=useState(''); const [category,setCategory]=useState('all'); const [body,setBody]=useState('all'); const [muscle,setMuscle]=useState('all');
  const [mode,setMode]=useState<'all'|'favorites'|'recent'>('all');
  const [favoriteIds,setFavoriteIds]=useState<string[]>(()=>storage('bbb_favorite_exercises',[]));
  const [recentIds,setRecentIds]=useState<string[]>(()=>storage('bbb_recent_exercises',[]));
  const [equipment,setEquipment]=useState('all');
  const equipmentOptions=useMemo(()=>Array.from(new Set(exercises.map(e=>e.equipment||'body weight'))).sort(),[exercises]);
  const [selected,setSelected]=useState<Exercise|null>(null);
  const cats=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>e.category).filter(Boolean))).sort()], [exercises]);
  const bodies=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>bodyOf(e)).filter(Boolean))).sort()], [exercises]);
  const muscleOptions=useMemo(()=>['all',...Array.from(new Set(exercises.filter(e=>body==='all'||bodyOf(e)===body).flatMap(e=>[e.target,...(e.secondary_muscles||[])]).filter(Boolean))).sort()], [exercises, body]);
  useEffect(()=>{ if(!muscleOptions.includes(muscle)) setMuscle('all'); }, [body, muscleOptions.join('|')]);
  useEffect(()=>setStorage('bbb_favorite_exercises',favoriteIds),[favoriteIds]);
  useEffect(()=>setStorage('bbb_recent_exercises',recentIds),[recentIds]);
  function openExercise(ex:Exercise){setSelected(ex);setRecentIds(prev=>[ex.exercise_id,...prev.filter(id=>id!==ex.exercise_id)].slice(0,20));}
  function toggleFavorite(id:string){setFavoriteIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[id,...prev]);}
  const filtered=exercises.filter(e=>
    (equipment==='all'||(e.equipment||'body weight')===equipment)&&(category==='all'||e.category===category) && (body==='all'||bodyOf(e)===body) &&
    (muscle==='all'||e.target===muscle||(e.secondary_muscles||[]).includes(muscle)) &&
    (mode==='all'||mode==='favorites'&&favoriteIds.includes(e.exercise_id)||mode==='recent'&&recentIds.includes(e.exercise_id)) &&
    `${e.name} ${e.exercise_id} ${e.target} ${(e.secondary_muscles||[]).join(' ')} ${bodyOf(e)} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())
  ).sort((a,b)=>mode==='recent'?recentIds.indexOf(a.exercise_id)-recentIds.indexOf(b.exercise_id):a.name.localeCompare(b.name)).slice(0,150);
  const selectedInstructions=(selected?.instructions||[]).filter(x=>x&&!/no written instructions stored yet/i.test(x));
  const duplicateNameCounts=useMemo(()=>exercises.reduce<Record<string,number>>((acc,e)=>{const key=normalise(e.name);acc[key]=(acc[key]||0)+1;return acc;},{}),[exercises]);
  const libraryName=(ex:Exercise)=>duplicateNameCounts[normalise(ex.name)]>1 ? `${titleCase(ex.name)} · ${titleCase(ex.equipment||ex.target||bodyOf(ex)||'Variant')}` : titleCase(ex.name);
  return <section className="libraryCompact">
    <div className="libraryToolbarCompact"><div className="searchBox"><Search/><input placeholder="Search exercises" value={q} onChange={e=>setQ(e.target.value)}/></div><div className="libraryMode"><button className={mode==='all'?'active':''} onClick={()=>setMode('all')}>All</button><button className={mode==='favorites'?'active':''} onClick={()=>setMode('favorites')}><Star/>Favourites</button><button className={mode==='recent'?'active':''} onClick={()=>setMode('recent')}><Clock/>Recent</button></div><div className="libraryFilters"><select aria-label="Library equipment" value={equipment} onChange={e=>setEquipment(e.target.value)}><option value="all">All equipment</option>{equipmentOptions.map(eq=><option value={eq} key={eq}>{titleCase(eq)}</option>)}</select><select aria-label="Body area" value={body} onChange={e=>setBody(e.target.value)}>{bodies.map(c=><option key={c} value={c}>{c==='all'?'All body parts':titleCase(c)}</option>)}</select><select aria-label="Target muscle" value={muscle} onChange={e=>setMuscle(e.target.value)}>{muscleOptions.map(c=><option key={c} value={c}>{c==='all'?'All muscles':titleCase(c)}</option>)}</select><select aria-label="Exercise category" value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c} value={c}>{c==='all'?'All types':titleCase(c)}</option>)}</select></div></div>
    {selected&&<section className="libraryDetailPanel"><div className="row between"><div><span className="tag">{titleCase(selected.equipment||'Exercise')}</span><h3>{libraryName(selected)}</h3><p>{[bodyOf(selected),selected.target,...(selected.secondary_muscles||[]).slice(0,3)].filter(Boolean).map(titleCase).join(' · ')}</p></div><button className="iconButton" aria-label="Close exercise details" onClick={()=>setSelected(null)}><X/></button></div>{selected.description&&<p>{sentence(selected.description)}</p>}<div className="row actions"><button className="primary" disabled={!safeVideo(selected)} onClick={()=>onPlay(selected)}><PlayCircle/>Watch demo</button><button onClick={()=>toggleFavorite(selected.exercise_id)}><Star/>{favoriteIds.includes(selected.exercise_id)?'Remove favourite':'Add favourite'}</button></div>{selectedInstructions.length>0&&<details><summary>Instructions</summary><ol>{selectedInstructions.map((line,i)=><li key={i}>{sentence(line)}</li>)}</ol></details>}</section>}
    <p className="resultCount">{filtered.length}{filtered.length===150?'+':''} movements</p>{!filtered.length&&<div className="emptyDraft"><Search/><h4>No exercises found</h4><p>Try another search or change your filters.</p></div>}<div className="exerciseCompactList">{filtered.map(ex=><div className="exerciseCompactRow" key={ex.exercise_id}><button className="exerciseCompactMain" onClick={()=>openExercise(ex)}><span className="exerciseCompactThumb">{ex.thumbnail_url?<img src={ex.thumbnail_url} alt=""/>:<Dumbbell/>}</span><span className="exerciseCompactCopy"><b>{libraryName(ex)}</b><em>{titleCase(ex.equipment||'Body weight')} · {titleCase(ex.target||bodyOf(ex))}</em></span><ChevronRight/></button><button className={`favoriteButton ${favoriteIds.includes(ex.exercise_id)?'active':''}`} aria-label={`${favoriteIds.includes(ex.exercise_id)?'Remove':'Add'} ${titleCase(ex.name)} ${favoriteIds.includes(ex.exercise_id)?'from':'to'} favourites`} onClick={()=>toggleFavorite(ex.exercise_id)}><Star/></button></div>)}</div>
  </section>;
}
function ExerciseCard({e,onPlay}:{e:Exercise;onPlay:(e:Exercise)=>void}) {
  const [open,setOpen]=useState(false); const hasVideo=!!(e.video_url||e.video_path);
  const instructions=(e.instructions||[]).filter(s=>s && !/no written instructions stored yet/i.test(s));
  return <article className="exerciseCard">
    <div className="row between"><h3>{titleCase(e.name)}</h3><span className="tag">{titleCase(e.category||'exercise')}</span></div>
    <div className="detailGrid"><span><b>Equipment</b>{titleCase(e.equipment||'Body weight')}</span><span><b>Location</b>{titleCase(e.location||'Home/Gym')}</span><span><b>Level</b>{titleCase(e.difficulty||'General')}</span></div>
    <div className="chips">{[bodyOf(e),e.target,...(e.secondary_muscles||[]).slice(0,3)].filter(Boolean).map(m=><span key={m}>{titleCase(m)}</span>)}</div>
    <div className="row actions"><button disabled={!hasVideo} onClick={()=>onPlay(e)}><PlayCircle size={16}/>{hasVideo?'Watch Demo':'Demo Missing'}</button><button onClick={()=>setOpen(!open)}>{open?<ChevronDown size={16}/>:<ChevronRight size={16}/>}Instructions</button></div>
    {open && <div className="instructionsPanel">
      {e.description && <p className="instructionDescription">{sentence(e.description)}</p>}
      {instructions.length>0 && <ol className="instructions">{instructions.map((s,i)=><li key={i}>{sentence(s)}</li>)}</ol>}
    </div>}
  </article>
}

function TrainingCalendar({events,allEvents,setEvents,openSession,currentUser,profile,plans,syncing,lastSynced,onRefresh}:{events:CalendarEvent[];allEvents:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;openSession:(e:CalendarEvent)=>void;currentUser:AppUser;profile:AthleteProfile;plans:WorkoutPlan[];syncing:boolean;lastSynced:Date|null;onRefresh:()=>void}){
  const [weekOffset,setWeekOffset]=useState(0);
  const baseStart = addDays(startOfWeek(), weekOffset*7);
  const visibleWeek = Array.from({length:7}, (_,i)=>addDays(baseStart, i));
  const [selectedDate,setSelectedDate]=useState(()=>todayISO());
  useEffect(()=>{ if(!visibleWeek.some(d=>iso(d)===selectedDate)) setSelectedDate(iso(visibleWeek[0])); },[weekOffset]);
  const [newDate,setNewDate]=useState(todayISO()); const [newTime,setNewTime]=useState('18:00'); const [newTitle,setNewTitle]=useState('Training Session'); const [newType,setNewType]=useState<SessionType>('Gym'); const [newPlanId,setNewPlanId]=useState('none'); const [addStatus,setAddStatus]=useState(''); const [adding,setAdding]=useState(false);
  const selectedEvents=events.filter(e=>dateOnly(e.date)===selectedDate).sort((a,b)=>(normaliseTime(a.time)||'').localeCompare(normaliseTime(b.time)||''));
  async function add(){
    if (adding) return;
    const plan = plans.find(p=>p.id===newPlanId);
    const event: CalendarEvent = {id:crypto.randomUUID(), date:dateOnly(newDate), time:normaliseTime(newTime), title: plan?.name || newTitle, type: plan?.session_type || newType, status:'planned', workout_plan_id: plan?.id, athlete_id: currentUser.athlete_id || profile.id, athlete_email: currentUser.email, athlete_name: currentUser.name};
    setAdding(true); setAddStatus('Adding session…');
    // Optimistic UI: show the session immediately rather than waiting for the network.
    setEvents(prev=>mergeById(prev,event));
    setSelectedDate(dateOnly(newDate));
    try {
      const synced = await saveRemoteSession(event, plan, profile);
      setEvents(prev=>mergeById(prev,synced));
      setAddStatus(syncMessage(synced,'Session'));
    } finally { setAdding(false); }
  }
  const weekLabel=`${dayLabel(visibleWeek[0])} – ${dayLabel(visibleWeek[6])}`;
  return <div className="trainingCalendarV4">
    <section className="featureCard calendarBoard">
      <div className="calendarHeader"><div><p><Cloud size={16}/>{syncing?'Syncing diary…':displaySyncTime(lastSynced)}</p></div><button className="iconButton" onClick={onRefresh} disabled={syncing}><RefreshCw className={syncing?'spinning':''}/></button></div>
      <div className="weekSelector"><button className="iconButton" aria-label="Previous week" onClick={()=>setWeekOffset(v=>v-1)}><ChevronLeft/></button><strong>{weekLabel}</strong><button className="iconButton" aria-label="Next week" onClick={()=>setWeekOffset(v=>v+1)}><ChevronRight/></button></div>
      <div className="weekStrip">{visibleWeek.map(d=>{const key=iso(d);const dayEvents=events.filter(e=>dateOnly(e.date)===key);const done=dayEvents.some(e=>e.status==='completed');const planned=dayEvents.some(e=>e.status==='planned');return <button key={key} className={`${selectedDate===key?'selected':''} ${done?'done':planned?'planned':''}`} onClick={()=>setSelectedDate(key)}><span>{dateFromIso(d).toLocaleDateString('en-GB',{weekday:'short'})}</span><b>{dateFromIso(d).getUTCDate()}</b><i>{done?'✓':planned?'•':''}</i></button>})}</div>
      <div className="calendarLegend"><span><i className="doneDot">✓</i>Completed</span><span><i className="plannedDot">•</i>Scheduled</span><span><i/>No session</span></div>
    </section>

    <section className="selectedDayPanel"><div className="row between"><div><span className="eyebrow">Selected day</span><h3>{dateFromIso(selectedDate).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</h3></div><span>{selectedEvents.length} {selectedEvents.length===1?'session':'sessions'}</span></div>
      <div className="daySessionList">{selectedEvents.length ? selectedEvents.map(event=><button className={`calendarListCard typeLine-${event.type.toLowerCase()}`} key={event.id} onClick={()=>openSession(event)}><div className="sessionIcon"><Dumbbell/></div><div><span>{event.time || 'Time TBC'}{event.end_time?` – ${event.end_time}`:''}</span><h4>{event.title}</h4><p>{event.class_name ? 'Class session · attendance tracking' : event.workout_plan_id ? 'Assigned workout · exercise logging' : `${event.type} training session`}</p></div><span className={classNameForType(event.type)}>{event.class_name?'Class':event.type}</span><ChevronRight/></button>) : <div className="emptyCalendarDay"><CalendarDays/><h4>No training planned</h4><p>Add a session below or move to another week.</p></div>}</div>
    </section>


    <section className="panel compact addSessionPanel"><div className="row between"><div><h3>Add Session</h3><p className="muted">Add a class, ad-hoc session or an existing saved workout to this profile.</p></div><Plus/></div><div className="formGrid calendarForm"><label>Date<input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}/></label><label>Time<input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><label>Type<select value={newType} onChange={e=>setNewType(e.target.value as SessionType)}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label><label>Saved Workout<select value={newPlanId} onChange={e=>setNewPlanId(e.target.value)}><option value="none">No saved workout</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="fullSpan">Title<input value={newTitle} onChange={e=>setNewTitle(e.target.value)}/></label></div><div className="formActions"><button type="button" className="primary wide" onClick={add} disabled={adding}><Plus size={16}/>{adding?'Adding…':'Add to calendar'}</button></div>{addStatus&&<div className="status">{addStatus}</div>}</section>
  </div>
}
const sessionTypes: SessionType[] = ['Home','Gym','FMA','MMA','BJJ','Boxing','Kickboxing','Cardio','Mobility','Physio','Recovery','Strength'];

function Today({events,exercises,logs,setLogs,onPlay,openSession}:{events:CalendarEvent[];exercises:Exercise[];logs:WorkoutLog[];setLogs:React.Dispatch<React.SetStateAction<WorkoutLog[]>>;onPlay:(e:Exercise)=>void;openSession:(e:CalendarEvent)=>void}){
  const [date,setDate]=useState(todayISO());
  const sessions=events.filter(e=>dateOnly(e.date)===dateOnly(date)).sort((a,b)=>(normaliseTime(a.time)||'').localeCompare(normaliseTime(b.time)||''));
  return <section className="panel"><div className="row between"><div><h3>Today's Training</h3><p className="muted">Choose a date, open a session, follow the exercises and log completion.</p></div><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>{sessions.length===0 && <p className="muted">No sessions planned for this date.</p>}{sessions.map(e=><SessionRow key={e.id} event={e} onClick={()=>openSession(e)}/>)}</section>
}

function SessionWorkout({session,setSession,exercises,plans,logs,setLogs,events,setEvents,profile,onPlay,onSessionFinished,onBack}:{session:CalendarEvent|null; setSession:(s:CalendarEvent|null)=>void; exercises:Exercise[]; plans:WorkoutPlan[]; logs:WorkoutLog[]; setLogs:React.Dispatch<React.SetStateAction<WorkoutLog[]>>; events:CalendarEvent[]; setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>; profile:AthleteProfile; onPlay:(e:Exercise)=>void; onSessionFinished:(summary?:any)=>void; onBack:()=>void}){
  const fallback: CalendarEvent = session || { id:'adhoc', date:todayISO(), time:'', title:'Ad hoc Workout', type:'Gym', status:'planned' };
  const isClassSession = !!fallback.class_name || fallback.type === 'FMA';
  if (isClassSession) return <ClassSessionCompletion session={fallback} setSession={setSession} events={events} setEvents={setEvents}/>;
  return <ExerciseSessionCompletion session={fallback} setSession={setSession} exercises={exercises} plans={plans} logs={logs} setLogs={setLogs} events={events} setEvents={setEvents} profile={profile} onPlay={onPlay} onSessionFinished={onSessionFinished} onBack={onBack}/>;
}

function ExerciseSessionCompletion({session,exercises,plans,logs,setLogs,setEvents,profile,onPlay,onSessionFinished,onBack}:any){const plan=plans.find((p:WorkoutPlan)=>p.id===session.workout_plan_id||p.remote_id===session.remote_plan_id);return <WorkoutRunner key={session.id} session={session} exercises={getSessionExercises(session,exercises,plans)} plan={plan} logs={logs} profile={profile} setLogs={setLogs} setEvents={setEvents} onPlay={onPlay} onBack={onBack} onFinish={onSessionFinished} saveLog={saveRemoteWorkoutLog} saveSession={updateRemoteSessionStatus} formatDate={dayLabel}/>;}

function ClassSessionCompletion({session,setSession,events,setEvents}:{session:CalendarEvent; setSession:(s:CalendarEvent|null)=>void; events:CalendarEvent[]; setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>}){
  const [date,setDate]=useState(session.date || todayISO());
  const [time,setTime]=useState(session.time || '19:00');
  const [statusMessage,setStatusMessage]=useState('');const [busy,setBusy]=useState(false);
  async function updateStatus(status:'completed'|'missed'){if(busy)return;setBusy(true);try{const saved=await updateRemoteSessionStatus({...session,date:dateOnly(date),time:normaliseTime(time)},status);setEvents(prev=>mergeById(prev,saved));setSession(saved);setStatusMessage(syncMessage(saved,'Attendance'));}finally{setBusy(false)}}

  return <section className="panel classCompletionPanel"><div className="classHero"><div><span className={classNameForType(session.type)}>{session.class_name ? 'FMA Class' : session.type}</span><h3>{session.class_name || session.title}</h3><p className="muted">This is a class session. It tracks attendance and calendar completion only. There are no individual exercise logs, sets, reps or weight entries for FMA classes.</p></div><div className={`classStatus ${session.status}`}><b>{titleCase(session.status)}</b><span>Attendance status</span></div></div><div className="grid two"><label>Class Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Class Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="classActions"><button type="button" className="primary big" disabled={busy} onClick={()=>updateStatus('completed')}><CheckCircle2 size={18}/>Mark Class Attended</button><button type="button" className="big" disabled={busy} onClick={()=>updateStatus('missed')}><X size={18}/>Mark Class Missed</button></div>{statusMessage&&<p className="status" role="status">{statusMessage}</p>}<div className="classNote"><b>Class focus</b><p>{fmaClasses.find(c=>c.name===session.class_name)?.focus || 'FMA academy session added to the training calendar.'}</p></div></section>
}
function InstructionsBlock({exercise}:{exercise:Exercise}){ const [open,setOpen]=useState(false); const instructions=(exercise.instructions||[]).filter(s=>s && !/no written instructions stored yet/i.test(s)); return <div className="compactInstructions"><button onClick={()=>setOpen(!open)}>{open?<ChevronDown size={16}/>:<ChevronRight size={16}/>} Exercise Details & Instructions</button>{open && <div className="instructionsPanel">{exercise.description && <p>{sentence(exercise.description)}</p>}{instructions.length>0 && <ol>{instructions.map((s,i)=><li key={i}>{sentence(s)}</li>)}</ol>}<div className="chips">{[bodyOf(exercise),exercise.target,...(exercise.secondary_muscles||[])].filter(Boolean).map(x=><span key={x}>{titleCase(x)}</span>)}</div></div>}</div> }
function pickExercisesForSession(session:CalendarEvent, exercises:Exercise[]){ const t=session.type; let terms:string[]=['plank','push-up','dead bug','squat','row']; if(t==='Home') terms=['ladder','shadow','plank','mountain climber','push-up']; if(t==='Gym'||t==='Strength') terms=['back squat','romanian deadlift','bench press','shoulder press','row']; if(t==='FMA'||t==='MMA'||t==='Boxing'||t==='Kickboxing') terms=['agility','boxing','jumping jack','mountain climber','plank']; if(t==='BJJ') terms=['bear crawl','bridge','superman','plank','hip']; if(t==='Mobility'||t==='Physio'||t==='Recovery') terms=['stretch','mobility','rotation','hamstring','shoulder']; const found=terms.map(term=>exercises.find(e=>e.name.toLowerCase().includes(term))).filter(Boolean) as Exercise[]; return found.length ? found.slice(0,6) : exercises.slice(0,5); }


function getSessionExercises(session: CalendarEvent, exercises: Exercise[], plans: WorkoutPlan[]): Exercise[] {
  const plan = plans.find(p => p.id === session.workout_plan_id);
  if (plan?.exercises?.length) {
    return plan.exercises.map(pe => {
      const detailed = exercises.find(e => e.exercise_id === pe.exercise_id);
      return detailed || {
        exercise_id: pe.exercise_id,
        name: pe.name,
        description: pe.notes || 'Assigned exercise from trainer programme.',
        body_part: 'programme',
        target: 'assigned focus',
        equipment: 'as programmed',
        category: plan.session_type || 'Gym',
        location: plan.location || 'Training',
        instructions: [],
      } as Exercise;
    });
  }
  return pickExercisesForSession(session, exercises);
}

function QuickCompletion({exercises,logs,setLogs,onPlay}:{exercises:Exercise[];logs:WorkoutLog[];setLogs:React.Dispatch<React.SetStateAction<WorkoutLog[]>>;onPlay:(e:Exercise)=>void}){ const picks=exercises.slice(0,3); return <div className="quickBox"><h3>Quick Exercise Completion</h3><p className="muted">Use this when James completes a standalone drill outside a planned session.</p><div className="grid three">{picks.map(e=><div className="miniExercise" key={e.exercise_id}><b>{titleCase(e.name)}</b><span>{titleCase(bodyOf(e))}</span><div className="row actions"><button onClick={()=>onPlay(e)}>Demo</button><button className="primary" onClick={()=>setLogs([{id:crypto.randomUUID(),date:todayISO(),session_type:'Home',exercise_id:e.exercise_id,exercise_name:titleCase(e.name),sets:[],completed:true},...logs])}>Complete</button></div></div>)}</div></div> }

function WorkoutBuilder({exercises,plans,setPlans,currentUser,athletes,users,events,setEvents,onPlay}:{exercises:Exercise[];plans:WorkoutPlan[];setPlans:React.Dispatch<React.SetStateAction<WorkoutPlan[]>>;currentUser:AppUser;athletes:AthleteProfile[];users:AppUser[];events:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;onPlay:(e:Exercise)=>void}){
  const draftKey=`bbb_builder_draft_${currentUser.id}_${currentUser.athlete_id||''}`;
  const cachedDraft=useMemo(()=>{try{return JSON.parse(sessionStorage.getItem(draftKey)||'null')}catch{return null}},[draftKey]);
  const bodies=useMemo(()=>Array.from(new Set(['full body',...exercises.map(e=>bodyOf(e)).filter(Boolean)])).sort(),[exercises]);
  const [body,setBody]=useState('full body');
  const [muscle,setMuscle]=useState('all');
  const [q,setQ]=useState('');
  const [equipment,setEquipment]=useState('all');
  const equipmentOptions=useMemo(()=>Array.from(new Set(exercises.map(e=>e.equipment||'body weight'))).sort(),[exercises]);
  const [substitutionIndex,setSubstitutionIndex]=useState<number|null>(null);
  const [visibleCount,setVisibleCount]=useState(40);
  useEffect(()=>setVisibleCount(40),[q,body,muscle,equipment]);
  const [name,setName]=useState<string>(cachedDraft?.name ?? 'Strength & Athletic Development');
  const [focus,setFocus]=useState<string>(cachedDraft?.focus ?? 'MMA strength and athletic development');
  const [sessionType,setSessionType]=useState<SessionType>(cachedDraft?.sessionType || 'Gym');
  const [selected,setSelected]=useState<ProgrammeExercise[]>(Array.isArray(cachedDraft?.selected)?cachedDraft.selected:[]);
  const [editingPlanId,setEditingPlanId]=useState<string>(cachedDraft?.editingPlanId||'');
  const [scheduleDate,setScheduleDate]=useState(todayISO());
  const [scheduleTime,setScheduleTime]=useState('18:00');
  const [builderStatus,setBuilderStatus]=useState('');
  const [previewing,setPreviewing]=useState<Exercise|null>(null);
  const [workspace,setWorkspace]=useState<'build'|'review'|'saved'>('build');
  const [saving,setSaving]=useState(false);
  const [scheduling,setScheduling]=useState(false);
  const workspaceTitle=useRef<HTMLHeadingElement>(null);
  function openWorkspace(next:'build'|'review'|'saved'){setWorkspace(next);window.scrollTo({top:0,behavior:'smooth'});window.setTimeout(()=>workspaceTitle.current?.focus(),0);}
  useEffect(()=>{try{sessionStorage.setItem(draftKey,JSON.stringify({name,focus,sessionType,selected,editingPlanId}));}catch{/* Draft resilience is optional when storage is unavailable. */}},[draftKey,name,focus,sessionType,selected,editingPlanId]);
  const selfProfile = profileForUser(currentUser, athletes);
  const ownsPlan=(p:WorkoutPlan)=>!!p.owner_athlete_id&&[currentUser.athlete_id,selfProfile.id,selfProfile.remote_id].filter(Boolean).includes(p.owner_athlete_id);
  const bodyFiltered=exercises.filter(e=>body==='full body'||bodyOf(e)===body||e.target==='full body');
  const muscles=useMemo(()=>['all',...Array.from(new Set(bodyFiltered.flatMap(e=>[e.target,...(e.secondary_muscles||[])]).filter(Boolean))).sort()],[body,exercises]);
  useEffect(()=>{if(!muscles.includes(muscle)) setMuscle('all')},[body,muscles.join('|')]);
  const matches=bodyFiltered.filter(e=>(equipment==='all'||(e.equipment||'body weight')===equipment)&&(muscle==='all'||e.target===muscle||(e.secondary_muscles||[]).includes(muscle)) && `${e.name} ${e.target} ${(e.secondary_muscles||[]).join(' ')} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()));
  const list=matches.slice(0,visibleCount);
  function addExercise(e: Exercise){
    if(substitutionIndex!==null){if(selected.some((item,i)=>i!==substitutionIndex&&item.exercise_id===e.exercise_id)){notify('That exercise is already in this workout.');return;}setSelected(prev=>prev.map((item,i)=>i===substitutionIndex?{...item,exercise_id:e.exercise_id,name:titleCase(e.name)}:item));setSubstitutionIndex(null);openWorkspace('review');notify('Exercise substituted. Sets, reps and weight retained.');return;}
    if(selected.some(item=>item.exercise_id===e.exercise_id)){ setBuilderStatus(`${titleCase(e.name)} is already in the draft.`); return; }
    setSelected([...selected,{exercise_id:e.exercise_id,name:titleCase(e.name),planned_sets:3,planned_reps:'8-12',planned_weight:''}]);
    setBuilderStatus(`${titleCase(e.name)} added to the draft.`);notify(`${titleCase(e.name)} added to your workout`);
  }
  function updateSelected(index:number, field:keyof ProgrammeExercise, value:any){ setSelected(selected.map((item,i)=>i===index?{...item,[field]: field==='planned_sets' ? Number(value) : value}:item)); }
  function moveExercise(index:number, direction:-1|1){ const next=[...selected]; const target=index+direction; if(target<0||target>=next.length)return; [next[index],next[target]]=[next[target],next[index]]; setSelected(next); }
  function detailedExercise(ex:ProgrammeExercise){ return exercises.find(e=>e.exercise_id===ex.exercise_id); }
  function resetDraft(){ openWorkspace('build');setEditingPlanId(''); setName('Strength & Athletic Development'); setFocus('MMA strength and athletic development'); setSessionType('Gym'); setSelected([]); setBuilderStatus('New workout draft started.'); }
  async function savePlan(){
    if(saving)return null;
    if(!selected.length){notify('Add at least one exercise first.');return null;}
    if(!name.trim()){notify('Give your workout a name.');return null;}
    setSaving(true);
    const plan:WorkoutPlan={...plans.find(p=>p.id===editingPlanId),id:editingPlanId||crypto.randomUUID(),name:name.trim(),focus,session_type:sessionType,exercises:selected,created_by_user_id:currentUser.id,owner_athlete_id:currentUser.role==='athlete'?(currentUser.athlete_id||selfProfile.id):undefined,is_template:currentUser.role!=='athlete'};
    const nextPlans=editingPlanId?plans.map(p=>p.id===editingPlanId?{...p,...plan,remote_id:p.remote_id}:p):[plan,...plans];
    setPlans(nextPlans);
    const syncedPlan=await saveProgrammeWithState(plan);const remoteId=syncedPlan.sync_state==='saved'?syncedPlan.remote_id:null;
    const syncedNext=nextPlans.map(p=>p.id===plan.id?{...p,...syncedPlan}:p);setPlans(prev=>mergeById(prev,syncedPlan));
    setBuilderStatus(syncMessage(syncedPlan,'Workout'));notify(syncMessage(syncedPlan,'Workout'));setSaving(false);if(!editingPlanId)setEditingPlanId(plan.id);return syncedPlan;
  }
  function editPlan(plan:WorkoutPlan){setEditingPlanId(plan.id);setName(plan.name);setFocus(plan.focus||'');setSessionType(plan.session_type||'Gym');setSelected(plan.exercises||[]);setBuilderStatus(`Editing ${plan.name}.`);openWorkspace('review');}
  async function deletePlan(plan:WorkoutPlan){if(!await deleteRemoteProgramme(plan))return;setPlans(prev=>removeExact(prev,plan));if(editingPlanId===plan.id)resetDraft();}
  const assignedPlanIds=new Set(events.filter(e=>isEventVisibleForUser(e,currentUser)).flatMap(e=>[e.workout_plan_id,e.remote_plan_id]).filter(Boolean) as string[]);
  const visibleSavedPlans=currentUser.role==='athlete'?plans.filter(p=>ownsPlan(p)||assignedPlanIds.has(p.id)||!!p.remote_id&&assignedPlanIds.has(p.remote_id)):plans;
  function createProfileCopy(plan:WorkoutPlan){const copy:WorkoutPlan={...plan,id:crypto.randomUUID(),remote_id:undefined,name:`${plan.name} - ${currentUser.name} copy`,owner_athlete_id:currentUser.athlete_id||selfProfile.id,created_by_user_id:currentUser.id,is_template:false,exercises:(plan.exercises||[]).map(e=>({...e}))};setPlans([copy,...plans]);editPlan(copy);}
  async function addToMyCalendar(plan:WorkoutPlan){if(scheduling)return;setScheduling(true);try{const assigned=resolveAssignmentProfile(selfProfile,users,athletes);const event:CalendarEvent={id:crypto.randomUUID(),athlete_id:assigned.id,athlete_email:assigned.email||currentUser.email,athlete_name:assigned.name||currentUser.name,assigned_by_user_id:currentUser.id,workout_plan_id:plan.id,date:dateOnly(scheduleDate),time:normaliseTime(scheduleTime),title:plan.name,type:plan.session_type||'Gym',status:'planned'};const optimistic=[event,...events.filter(e=>e.id!==event.id)];setEvents(optimistic);setBuilderStatus(`${plan.name} added to ${assigned.name}'s calendar. Saving to cloud…`);const remoteSynced=await saveRemoteSession(event,plan,selfProfile);const next=[remoteSynced,...events.filter(e=>e.id!==event.id&&e.id!==remoteSynced.id&&e.remote_id!==remoteSynced.remote_id)];setEvents(prev=>mergeById(prev,remoteSynced));setBuilderStatus(remoteSynced.sync_state==='saved'?`${plan.name} added to ${assigned.name}'s calendar for ${dateOnly(scheduleDate)} at ${normaliseTime(scheduleTime)} and synced.`:`${plan.name} added locally. Cloud save could not be confirmed — press Sync after checking your connection.`);}finally{setScheduling(false)}}
  const totalSets=selected.reduce((n,e)=>n+Number(e.planned_sets||0),0);
  return <div className="workoutBuilderV4">
    <div className="workspaceTabs" aria-label="Workout builder views"><button className={workspace==='build'?'active':''} aria-pressed={workspace==='build'} onClick={()=>openWorkspace('build')}>Find exercises</button><button className={workspace==='review'?'active':''} aria-pressed={workspace==='review'} onClick={()=>openWorkspace('review')}>Review <span>{selected.length}</span></button><button className={workspace==='saved'?'active':''} aria-pressed={workspace==='saved'} onClick={()=>openWorkspace('saved')}>Saved <span>{visibleSavedPlans.length}</span></button></div>
    <h3 ref={workspaceTitle} tabIndex={-1} className="srOnly">{workspace==='build'?'Find exercises':workspace==='review'?'Review workout':'Saved workouts'}</h3>
    {workspace!=='saved'&&<details className="panel builderMeta"><summary><span><b>{name || 'Untitled workout'}</b><small>{sessionType} · {selected.length} exercises</small></span><Edit3 size={18}/></summary><div className="builderStepTitle"><Target/><div><span>Workout details</span><h3>Build the session</h3></div></div><div className="grid three"><label>Workout Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Training Focus<input value={focus} onChange={e=>setFocus(e.target.value)}/></label><label>Session Type<select value={sessionType} onChange={e=>setSessionType(e.target.value as SessionType)}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label></div></details>}

    {workspace==='build'&&<><section className="panel bodyAreaPanel"><div className="builderStepTitle"><span className="stepNumber">1</span><div><h3>Find your movements</h3><p>Search, preview and add. Your selections stay with you.</p></div></div><div className="builderFilters builderFiltersClean"><label>Equipment<select aria-label="Available equipment" value={equipment} onChange={e=>setEquipment(e.target.value)}><option value="all">All equipment</option>{equipmentOptions.map(eq=><option value={eq} key={eq}>{titleCase(eq)}</option>)}</select></label><label>Body Area<select aria-label="Body area" value={body} onChange={e=>setBody(e.target.value)}>{bodies.map(b=><option value={b} key={b}>{b==='full body'?'All areas':titleCase(b)}</option>)}</select></label><label>Muscle / Target<select aria-label="Target muscle" value={muscle} onChange={e=>setMuscle(e.target.value)}>{muscles.map(m=><option value={m} key={m}>{m==='all'?'All muscles':titleCase(m)}</option>)}</select></label><div className="searchBox builderSearch"><Search/><input aria-label="Search builder exercises" value={q} onChange={e=>setQ(e.target.value)} placeholder={body==='full body'?'Search all exercises':`Search ${titleCase(body)} exercises`}/></div></div></section>

    <section className="panel exercisePickerPanel">{substitutionIndex!==null&&<div className="status">Choose a replacement for {selected[substitutionIndex]?.name}.<button className="textButton" onClick={()=>{setSubstitutionIndex(null);openWorkspace('review')}}>Cancel substitution</button></div>}<div className="row between"><div className="builderStepTitle"><span className="stepNumber">2</span><div><h3>Select Exercises</h3><p>{matches.length} movements · preview before adding</p></div></div><span className="draftCount">{selected.length} in draft</span></div><div className="exercisePickerList">{list.map(ex=><div className={`exercisePickerRow ${selected.some(item=>item.exercise_id===ex.exercise_id)?'isAdded':''}`} key={ex.exercise_id}><div className="exerciseThumb"><Dumbbell/></div><div className="exercisePickerCopy"><b>{titleCase(ex.name)}</b><span>{[ex.target,...(ex.secondary_muscles||[]).slice(0,2)].filter(Boolean).map(titleCase).join(' · ')}</span></div><button className="previewButton" onClick={()=>setPreviewing(ex)}><Eye size={17}/>Preview</button><button className="addButton" aria-label={`${selected.some(item=>item.exercise_id===ex.exercise_id)?'Added':'Add'} ${titleCase(ex.name)}`} disabled={selected.some(item=>item.exercise_id===ex.exercise_id)} onClick={()=>addExercise(ex)}>{selected.some(item=>item.exercise_id===ex.exercise_id)?<><CheckCircle2 size={18}/>Added</>:<><Plus size={18}/>Add</>}</button></div>)}</div>{matches.length>list.length&&<button className="loadMore" onClick={()=>setVisibleCount(n=>n+40)}>Show more exercises ({matches.length-list.length} remaining)<ChevronDown size={16}/></button>}{!list.length&&<div className="emptyDraft"><Search/><h4>No matching exercises</h4><p>Try a different search or body area.</p><button onClick={()=>{setBody('full body');setMuscle('all');setEquipment('all');setQ('')}}>Clear filters</button></div>}</section></>}

    {workspace==='review'&&<section className="panel draftWorkoutPanel"><div className="row between"><div className="builderStepTitle"><span className="stepNumber">3</span><div><h3>Your session</h3><p>{selected.length} exercises · {totalSets} total sets</p></div></div>{selected.length>0&&<button className="textButton" onClick={()=>setSelected([])}><Trash2 size={16}/>Clear all</button>}</div>{selected.length===0?<div className="emptyDraft"><ListChecks/><h4>Your draft is empty</h4><p>Find a movement, watch the demo, then add it here.</p></div>:<div className="draftExerciseList">{selected.map((item,index)=>{const detail=detailedExercise(item);return <div className="draftExerciseRow" key={`${item.exercise_id}-${index}`}><div className="dragHandle"><GripVertical/><span>{index+1}</span></div><div className="draftMain"><b>{item.name}</b><span>{detail?[detail.target,...(detail.secondary_muscles||[]).slice(0,2)].filter(Boolean).map(titleCase).join(' · '):'Assigned exercise'}</span><div className="draftFields"><label>Sets<input type="number" inputMode="numeric" min="1" value={item.planned_sets||3} onChange={e=>updateSelected(index,'planned_sets',e.target.value)}/></label><label>Reps<input inputMode="numeric" value={item.planned_reps||''} onChange={e=>updateSelected(index,'planned_reps',e.target.value)}/></label><label>Weight<input inputMode="decimal" value={item.planned_weight||''} onChange={e=>updateSelected(index,'planned_weight',e.target.value)}/></label></div></div><div className="draftActions"><button aria-label={`Substitute ${item.name}`} onClick={()=>{setSubstitutionIndex(index);setBody(detail?bodyOf(detail):'full body');setMuscle(detail?.target||'all');setEquipment('all');setQ('');openWorkspace('build')}}><RefreshCw/></button><button aria-label={`Preview ${item.name}`} onClick={()=>detail&&setPreviewing(detail)} disabled={!detail}><Eye/></button><button aria-label={`Move ${item.name} up`} onClick={()=>moveExercise(index,-1)} disabled={index===0}><ArrowUp/></button><button aria-label={`Move ${item.name} down`} onClick={()=>moveExercise(index,1)} disabled={index===selected.length-1}><ArrowDown/></button><button className="dangerIcon" aria-label={`Remove ${item.name}`} onClick={()=>{setSelected(selected.filter((_,i)=>i!==index));notify(`${item.name} removed`)}}><Trash2/></button></div></div>})}</div>}
      <div className="draftFooter"><div className="draftStats"><span><Clock/>~{Math.max(15,selected.length*8)} min</span><span><Dumbbell/>{selected.length} exercises</span><span><ListChecks/>{totalSets} sets</span></div><button className="primary saveWorkoutButton" onClick={savePlan} disabled={!selected.length||saving}><Save/>{saving?'Saving…':editingPlanId?'Update workout':'Save workout'}<ChevronRight/></button></div><button className="secondaryWide" onClick={()=>openWorkspace('build')}><Plus size={18}/>Add more exercises</button>{editingPlanId&&<button className="secondaryWide" onClick={resetDraft}>Start a new workout</button>}{builderStatus&&<div className="status" role="status">{builderStatus}</div>}</section>}

    {workspace==='saved'&&<section className="panel savedWorkoutsPanel"><div className="row between"><div><span className="eyebrow">Your library</span><h3>Saved Workouts</h3></div><div className="scheduleInputs"><input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)}/><input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}/></div></div>{visibleSavedPlans.length===0?<p className="muted">No saved workouts available yet.</p>:<div className="savedWorkoutGrid">{visibleSavedPlans.map(plan=><article className="savedWorkoutCard" key={plan.id}><div><span className={classNameForType(plan.session_type||'Gym')}>{plan.session_type||'Gym'}</span><h4>{plan.name}</h4><p>{plan.focus}</p><em>{plan.exercises.length} exercises</em></div><div className="savedWorkoutActions"><button onClick={()=>currentUser.role==='athlete'&&!ownsPlan(plan)?createProfileCopy(plan):editPlan(plan)}><Edit3/>{currentUser.role==='athlete'&&!ownsPlan(plan)?'Customise a copy':'View / edit'}</button>{currentUser.role==='athlete'&&<button onClick={()=>createProfileCopy(plan)}><Plus/>Make my copy</button>}<button className="primary" disabled={scheduling} onClick={()=>addToMyCalendar(plan)}><CalendarDays/>Add to calendar</button>{(currentUser.role!=='athlete'||ownsPlan(plan))&&<button className="dangerIcon" aria-label={`Delete ${plan.name}`} onClick={()=>deletePlan(plan)}><Trash2/></button>}</div></article>)}</div>}</section>}
    {workspace==='build'&&<div className="builderDock"><div><b>{selected.length} {selected.length===1?'exercise':'exercises'}</b><span>{totalSets} sets · Unsaved draft</span></div><button className="primary" disabled={!selected.length} onClick={()=>openWorkspace('review')}>Review workout<ArrowRight size={18}/></button></div>}

    {previewing&&<ExercisePreviewSheet exercise={previewing} onClose={()=>setPreviewing(null)} isAdded={selected.some(item=>item.exercise_id===previewing.exercise_id)} onAdd={()=>{addExercise(previewing);setPreviewing(null)}}/>}
  </div>
}

function ExercisePreviewSheet({exercise,onClose,onAdd,isAdded=false}:{exercise:Exercise;onClose:()=>void;onAdd:()=>void;isAdded?:boolean}){
  const url=safeVideo(exercise);
  useDialog(true,'.exercisePreviewSheet',onClose);
  return <div className="modalBackdrop previewBackdrop" onClick={onClose}><section className="exercisePreviewSheet" role="dialog" aria-modal="true" aria-label={`Preview ${titleCase(exercise.name)}`} onClick={e=>e.stopPropagation()}><div className="sheetHandle"/><button className="closeSheet" aria-label="Close exercise preview" onClick={onClose}><X/></button><div className="previewMedia">{url?<video src={url} controls playsInline preload="metadata"/>:<div className="videoMissing"><Video/><span>No demo video available</span></div>}</div><div className="previewDetails"><div className="row between"><div><span className="tag">{titleCase(exercise.equipment||'Exercise')}</span><h3>{titleCase(exercise.name)}</h3></div></div><p>{sentence(exercise.description||'Review the exercise demonstration and target muscles before adding it to the workout.')}</p><div className="chips">{[exercise.target,...(exercise.secondary_muscles||[])].filter(Boolean).map(m=><span key={m}>{titleCase(m)}</span>)}</div><details><summary>Instructions</summary>{(exercise.instructions||[]).length?<ol>{(exercise.instructions||[]).filter(Boolean).map((instruction,i)=><li key={i}>{sentence(instruction)}</li>)}</ol>:<p className="muted">No written instructions are stored for this exercise.</p>}</details><button className="primary wide" disabled={isAdded} onClick={onAdd}>{isAdded?<>Added to workout<CheckCircle2/></>:<>Add to Workout<Plus/></>}</button></div></section></div>
}
function FmaClasses({events,setEvents,openSession,profile,currentUser}:{events:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;openSession:(e:CalendarEvent)=>void;profile:AthleteProfile;currentUser:AppUser}){
  const [classOptions,setClassOptions]=useState(() => storage('bbb_fma_classes', fmaClasses));
  const [selectedName,setSelectedName]=useState(classOptions[0]?.name || 'Advanced MMA');
  const selected = classOptions.find(c=>c.name===selectedName) || classOptions[0] || fmaClasses[0];
  const [date,setDate]=useState(todayISO()); const [time,setTime]=useState('19:00');
  const [newClassName,setNewClassName]=useState(''); const [newClassFocus,setNewClassFocus]=useState(''); const [status,setStatus]=useState('');
  useEffect(()=>{ setStorage('bbb_fma_classes', classOptions); }, [classOptions]);

  const [adding,setAdding]=useState(false);
  async function add(){if(adding)return;setAdding(true);try{const event:CalendarEvent={id:crypto.randomUUID(),athlete_id:profile.id,athlete_email:profile.email,athlete_name:profile.name,date:dateOnly(date),time:normaliseTime(time),title:`FMA ${selected.name}`,type:'FMA',status:'planned',class_name:selected.name,sync_state:'pending'};setEvents(prev=>mergeById(prev,event));const saved=await saveRemoteSession(event,undefined,profile);setEvents(prev=>mergeById(prev,saved));setStatus(syncMessage(saved,'Class session'));}finally{setAdding(false)}}
  useEffect(()=>{const update=()=>setClassOptions(storage('bbb_fma_classes',fmaClasses));window.addEventListener('bbb-classes-updated',update);return()=>window.removeEventListener('bbb-classes-updated',update)},[]);
  async function addClassType(){
    const name = newClassName.trim();
    const focus = newClassFocus.trim() || 'Class session.';
    if(!name) return;
    const newClass = { name, type:'FMA' as SessionType, focus };
    const updated = [...classOptions.filter(c=>c.name.toLowerCase()!==name.toLowerCase()), newClass];
    if(!supabase){setStatus('Cloud unavailable. Class type was not created.');return;}const {error}=await supabase.from('fma_classes').insert({class_name:name,class_type:'FMA',focus});if(error){setStatus(`Class type was not saved: ${error.message}`);return;}setClassOptions(updated);setStatus('Class type saved to cloud.');setSelectedName(name); setNewClassName(''); setNewClassFocus('');
  }
  return <div className="fmaLayout"><section className="panel"><h3>FMA Chester Classes</h3><p className="muted">Select a class, choose a date and time, then add it to James’s calendar as a class session. Class sessions track attendance only — no sets, reps or exercise log required.</p><div className="classList">{classOptions.map(c=><button className={selected?.name===c.name?'selected':''} onClick={()=>setSelectedName(c.name)} key={c.name}><b>{c.name}</b><span>{c.focus}</span></button>)}</div>{currentUser.role!=='athlete'&&<div className="panel inner newClassPanel"><h3>Add New Class Type</h3><p className="muted">Create additional class types for the FMA list. These are still class sessions and do not require sets, reps or exercise logs.</p><div className="formGrid two"><label>Class Name<input value={newClassName} onChange={e=>setNewClassName(e.target.value)} placeholder="e.g. Wrestling"/></label><label>Class Description<input value={newClassFocus} onChange={e=>setNewClassFocus(e.target.value)} placeholder="Short class focus"/></label></div><div className="formActions"><button onClick={addClassType} disabled={!newClassName.trim()}><Plus size={16}/>Add class type</button></div></div>}</section><section className="panel fmaSchedulePanel"><h3>Add {selected.name}</h3><p>{selected.focus}</p><div className="formGrid two"><label>Class Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Class Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="formActions"><button type="button" className="primary big" disabled={adding} onClick={add}><CalendarDays size={18}/>Add class to calendar</button></div>{status&&<div className="status">{status}</div>}<h3>Upcoming FMA Sessions</h3>{events.filter(e=>(e.type==='FMA'||e.class_name)&&dateOnly(e.date)>=todayISO()).map(e=><SessionRow key={e.id} event={e} onClick={()=>openSession(e)}/>)}</section></div>
}

function Nutrition(props:any){return <NutritionScreen {...props} saveEntry={saveRemoteNutritionEntry} saveTarget={saveRemoteNutritionTarget} deleteEntry={deleteRemoteNutritionEntry} today={todayISO} previousDay={d=>iso(addDays(d,-1))}/>;}

const Stats=lazy(()=>import('./components/ProgressScreen'));
function achievementCount(type: AchievementType, logs: WorkoutLog[], events: CalendarEvent[]) {
  const completedSessions = events.filter(e=>e.status==='completed');
  const completedLogs = logs.filter(l=>l.completed);
  const streak = calcStreak(logs, events);
  switch(type) {
    case 'sessions_completed': return completedSessions.length;
    case 'completed_workouts': return completedSessions.filter(e=>!!e.workout_plan_id || !!e.remote_plan_id || (!!e.title && !e.class_name)).length;
    case 'exercises_completed': return completedLogs.length;
    case 'workout_streak': return streak;
    case 'fma_sessions': return completedSessions.filter(e=>e.type==='FMA' || !!e.class_name).length;
    case 'gym_sessions': return completedSessions.filter(e=>e.type==='Gym').length;
    case 'home_sessions': return completedSessions.filter(e=>e.type==='Home').length;
    case 'bjj_sessions': return completedSessions.filter(e=>e.type==='BJJ' || /bjj|grappling/i.test(e.title || '')).length;
    case 'kickboxing_sessions': return completedSessions.filter(e=>e.type==='Kickboxing' || /kickboxing|boxing|striking/i.test(e.title || '')).length;
    case 'mobility_sessions': return completedSessions.filter(e=>['Mobility','Recovery','Physio'].includes(e.type)).length;
    case 'strength_exercises': return completedLogs.filter(l=>['Gym','Strength'].includes(l.session_type || '') || /squat|deadlift|press|row|curl|raise|strength|barbell|dumbbell/i.test(l.exercise_name || '')).length;
    case 'footwork_sessions': return [...completedSessions.map(e=>e.title), ...completedLogs.map(l=>l.exercise_name)].filter(v=>/footwork/i.test(v || '')).length;
    default: return 0;
  }
}
function buildBadges(logs:WorkoutLog[], events:CalendarEvent[], definitions:BadgeDefinition[]): Badge[] {
  return definitions
    .map(normaliseBadgeDefinition)
    .filter(b => b.is_active !== false)
    .map(b => {
      const count = achievementCount(b.badge_type, logs, events);
      const progress = percent(count, b.target_value);
      return { ...b, current_count: count, progress, unlocked: count >= b.target_value };
    });
}

function Badges({badges}:{badges:Badge[]}){ return <section className="panel"><h3>Achievements</h3><p className="muted">Counters update from completed sessions, FMA attendance and exercise logs. New achievements can now be managed from the Admin Console.</p><div className="badgeGrid">{badges.map(b=><div className={`badgeCard ${b.unlocked?'unlocked':''}`} key={b.id}><span>{b.icon}</span><h3>{b.name}</h3><p>{b.description}</p><div className="progress"><i style={{width:`${b.progress}%`}}/></div><em>{b.current_count} / {b.target_value} · {b.progress}% complete{b.xp_value ? ` · ${b.xp_value} XP` : ''}</em></div>)}</div></section> }
function Profile({profile:storedProfile,metrics,setMetrics,setProfile:onSaveProfile}:{profile:AthleteProfile;metrics:AthleteMetric[];setMetrics:React.Dispatch<React.SetStateAction<AthleteMetric[]>>;setProfile:(p:AthleteProfile)=>Promise<AthleteProfile|void>}){
  const [profile,setProfileDraft]=useState(storedProfile);
  const [savingProfile,setSavingProfile]=useState(false);
  const [profileStatus,setProfileStatus]=useState('');
  useEffect(()=>setProfileDraft(storedProfile),[storedProfile.id]);
  async function saveProfile(){setSavingProfile(true);try{const saved=await onSaveProfile(profile);if(saved){setProfileDraft(saved);setProfileStatus(syncMessage(saved,'Profile'));}}finally{setSavingProfile(false)}}
  const [weightUnit,setWeightUnit]=useState<WeightUnit>(getWeightUnit(profile));
  const initialParts = kgToStLb(profile.weight_kg);
  const [weight,setWeight]=useState(String(profile.weight_kg || ''));
  const [weightSt,setWeightSt]=useState(String(initialParts.st || ''));
  const [weightLb,setWeightLb]=useState(String(initialParts.lb || ''));
  const [weightNotes,setWeightNotes]=useState('');
  function upd(k:keyof AthleteProfile,v:any){ setProfileDraft({...profile,[k]:v}); }
  function setPreferredUnit(unit: WeightUnit){ setWeightUnit(unit); setStorage('bbb_weight_unit', unit); setProfileDraft({...profile, weight_unit:unit}); }
  function updateKgWeight(v:string){ setWeight(v); upd('weight_kg', Number(v)); }
  function updateStoneWeight(nextSt=weightSt,nextLb=weightLb){ setWeightSt(nextSt); setWeightLb(nextLb); const kg = stLbToKg(nextSt, nextLb); upd('weight_kg', kg); setWeight(String(kg)); }
  const athleteMetrics = metrics.filter(m=>m.athlete_id===profile.remote_id || m.athlete_id===profile.id).sort((a,b)=>dateOnly(a.metric_date).localeCompare(dateOnly(b.metric_date)));
  async function logWeight(){
    const weightKg = weightUnit === 'st' ? stLbToKg(weightSt, weightLb) : Number(weight);
    const metric: AthleteMetric = { id:crypto.randomUUID(), athlete_id: profile.remote_id || profile.id, metric_date: todayISO(), weight_kg: weightKg, height_cm: profile.height_cm, notes: weightNotes };
    const saved = await saveRemoteMetric(metric);
    setMetrics(prev=>mergeById(prev,saved));setProfileStatus(syncMessage(saved,'Weight measurement'));
    setProfileDraft({...profile, weight_kg: weightKg, weight_unit: weightUnit});
    setWeight(String(weightKg));
    setWeightNotes('');
  }
  return <section className="panel profilePage"><h3>Athlete Profile</h3><p className="muted">These details personalise targets, competition planning and progress tracking.</p><div className="grid three"><Field label="Athlete Name" help="Shown throughout the app." value={profile.name} onChange={v=>upd('name',v)}/><Field label="Age" help="Current age in years." value={profile.age||''} type="number" onChange={v=>upd('age',Number(v))}/><Field label="Gym / Academy" help="Primary training location." value={profile.gym||''} onChange={v=>upd('gym',v)}/><Field label="Height (cm)" help="Used for weight trend context." value={profile.height_cm||''} type="number" onChange={v=>upd('height_cm',Number(v))}/><label className="fieldLabel">Weight Preference<span>Choose how body weight is entered and displayed.</span><select value={weightUnit} onChange={e=>setPreferredUnit(e.target.value as WeightUnit)}><option value="kg">Kilograms (kg)</option><option value="st">Stone / pounds (st, lb)</option></select></label>{weightUnit==='kg' ? <Field label="Current Weight (kg)" help="Snapshot weight. Use the log section below to track changes over time." value={profile.weight_kg||''} type="number" onChange={updateKgWeight}/> : <label className="fieldLabel">Current Weight (st/lb)<span>Enter stones and pounds. The app stores the converted kg value for syncing.</span><div className="miniGrid"><input type="number" value={weightSt} onChange={e=>updateStoneWeight(e.target.value, weightLb)} placeholder="st"/><input type="number" value={weightLb} onChange={e=>updateStoneWeight(weightSt, e.target.value)} placeholder="lb"/></div></label>}<Field label="Competition Weight (kg)" help="Target fight or competition weight." value={profile.competition_weight_kg||''} type="number" onChange={v=>upd('competition_weight_kg',Number(v))}/><Field label="Belt Rank" help="Current martial arts rank." value={profile.belt_rank||''} onChange={v=>upd('belt_rank',v)}/><Field label="Profile Photo URL" help="Optional image link for later use." value={profile.profile_photo_url||''} onChange={v=>upd('profile_photo_url',v)}/></div><label className="fullLabel">Athlete Goal<span>Main training objective.</span><textarea value={profile.goal||''} onChange={e=>upd('goal',e.target.value)}/></label><button className="primary" disabled={savingProfile} onClick={saveProfile}><Save size={16}/>{savingProfile?'Saving…':'Save profile changes'}</button>{profileStatus&&<p className="status" role="status">{profileStatus}</p>}<section className="panel inner weightLogger"><h3>Weight Tracker</h3><p className="muted">Log changes in body weight so progress stats show trends rather than only snapshots.</p><div className="grid three">{weightUnit==='kg' ? <label>Weight today (kg)<input type="number" value={weight} onChange={e=>setWeight(e.target.value)}/></label> : <><label>Weight today (st)<input type="number" value={weightSt} onChange={e=>setWeightSt(e.target.value)}/></label><label>Weight today (lb)<input type="number" value={weightLb} onChange={e=>setWeightLb(e.target.value)}/></label></>}<label className="fullSpan">Notes<input value={weightNotes} onChange={e=>setWeightNotes(e.target.value)} placeholder="Optional note"/></label></div><div className="formActions"><button className="primary" onClick={logWeight} disabled={weightUnit==='kg' ? !weight : (!weightSt && !weightLb)}><Save size={16}/>Log weight</button></div>{athleteMetrics.length>0 && <div className="miniHistory">{athleteMetrics.slice(-6).reverse().map(m=><div className="preview" key={m.id}><b>{dateOnly(m.metric_date)} · {formatWeight(m.weight_kg, weightUnit)}</b><span>{m.notes || 'Weight logged'}</span></div>)}</div>}</section></section>
}
function Field({label,help,value,onChange,type='text'}:{label:string;help:string;value:any;type?:string;onChange:(v:string)=>void}){ return <label className="fieldLabel">{label}<span>{help}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label> }

function Admin({profile,events,setEvents,plans,setPlans,logs,setLogs,exercises,setExercises,users,setUsers,athletes,setAthletes,metrics,setMetrics,dashboardFocusText,setDashboardFocusText,badgeDefinitions,setBadgeDefinitions}:{profile:AthleteProfile;events:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;plans:WorkoutPlan[];setPlans:React.Dispatch<React.SetStateAction<WorkoutPlan[]>>;logs:WorkoutLog[];setLogs:React.Dispatch<React.SetStateAction<WorkoutLog[]>>;exercises:Exercise[];setExercises:(e:Exercise[])=>void;users:AppUser[];setUsers:(u:AppUser[])=>void;athletes:AthleteProfile[];setAthletes:(a:AthleteProfile[])=>void;metrics:AthleteMetric[];setMetrics:React.Dispatch<React.SetStateAction<AthleteMetric[]>>;dashboardFocusText:string;setDashboardFocusText:(v:string)=>void;badgeDefinitions:BadgeDefinition[];setBadgeDefinitions:(b:BadgeDefinition[])=>void}){
  const tabs = [
    ['overview','Overview'],['assignment','Assign Workouts'],['athlete','Athlete Review'],['workouts','Saved Workouts'],['achievements','Achievements'],['content','Content'],['maintenance','Maintenance']
  ] as const;
  const [tab,setTab]=useState<typeof tabs[number][0]>('overview');
  return <div className="adminConsole"><section className="panel"><h3>Admin Console</h3><p className="muted">Cloud-synced admin tools. Use the menu below to keep each admin area clean and manageable.</p><div className="adminTabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div><div className="grid three"><Kpi label="Athletes" value={athletes.length}/><Kpi label="Diary Items" value={events.length}/><Kpi label="Saved Workouts" value={plans.length}/></div></section>{tab==='overview' && <><CoachingOverview athletes={athletes} events={events} logs={logs}/><AdminFocusManager value={dashboardFocusText} setValue={setDashboardFocusText}/></>} {tab==='assignment' && <WorkoutAssignment plans={plans} athletes={athletes} users={users} events={events} setEvents={setEvents}/>} {tab==='athlete' && <><AdminAthleteProfile events={events} logs={logs} metrics={metrics} athletes={athletes} users={users}/><AdminTrainingDiary events={events} setEvents={setEvents} athletes={athletes} users={users}/><AdminWorkoutReview events={events} logs={logs} athletes={athletes} users={users}/></>} {tab==='workouts' && <AdminWorkoutManager plans={plans} setPlans={setPlans}/>} {tab==='achievements' && <AchievementManager badges={badgeDefinitions} setBadges={setBadgeDefinitions}/>} {tab==='content' && <><AthleteCreator users={users} setUsers={setUsers} athletes={athletes} setAthletes={setAthletes}/><ManualExercise setExercises={setExercises} exercises={exercises}/></>} {tab==='maintenance' && <AdminResetControls events={events} setEvents={setEvents} plans={plans} setPlans={setPlans} logs={logs} setLogs={setLogs}/>}</div>
}

function AdminFocusManager({value,setValue}:{value:string;setValue:(v:string)=>void}){
  const [draft,setDraft]=useState(value); const [status,setStatus]=useState('');
  async function save(){const ok=await saveRemoteSetting('dashboard_focus_text',draft);if(!ok){setStatus('Focus text was not saved. Check the connection and retry.');return;}setValue(draft);setStorage('bbb_dashboard_focus',draft);setStatus('Focus text saved to cloud.');}
  return <section className="panel"><h3>Dashboard Focus Text</h3><p className="muted">Change the text in the Today’s Focus box on the athlete dashboard without redeploying.</p><label>Focus Message<textarea value={draft} onChange={e=>setDraft(e.target.value)}/></label><div className="formActions"><button className="primary" onClick={save}><Save size={16}/>Save focus text</button></div>{status && <div className="status">{status}</div>}</section>
}

function AdminAthleteProfile({events,logs,metrics,athletes,users}:{events:CalendarEvent[];logs:WorkoutLog[];metrics:AthleteMetric[];athletes:AthleteProfile[];users:AppUser[]}){
  const opts=getAthleteOptions(athletes); const [athleteId,setAthleteId]=useState((opts.find(a=>normalise(a.name)==='james hiles')||opts[0])?.id||'');
  const athlete=opts.find(a=>a.id===athleteId)||opts[0];
  const diary=athlete?events.filter(e=>eventMatchesAthlete(e,athlete,users)):[]; const completed=diary.filter(e=>e.status==='completed'); const missed=diary.filter(e=>e.status==='missed');
  const linkedUser=athlete?findLinkedAthleteUser(athlete,users):undefined; const athleteLogs=logs.filter(l=>l.athlete_id===athlete?.id||!!athlete?.remote_id&&l.athlete_id===athlete.remote_id||!!l.session_id&&diary.some(e=>e.id===l.session_id || e.remote_id===l.session_id));
  const athleteMetrics=athlete?metrics.filter(m=>m.athlete_id===athlete.id || m.athlete_id===athlete.remote_id):[];
  return <section className="panel"><div className="row between"><div><h3>Athlete Profile Review</h3><p className="muted">Consolidated athlete view so admin can review one athlete without mixing in other users.</p></div><label>View Athlete<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{opts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>{athlete && <><div className="grid three"><Kpi label="Profile" value={athlete.name}/><Kpi label="Completed" value={completed.length}/><Kpi label="Missed" value={missed.length}/><Kpi label="Exercises Logged" value={athleteLogs.length}/><Kpi label="Current Weight" value={formatWeight(athlete.weight_kg, getWeightUnit(athlete))}/><Kpi label="Login Email" value={linkedUser?.email||athlete.email||'—'}/></div><div className="preview"><b>{athlete.gym || 'No gym set'}</b><span>{athlete.goal || 'No goal set'}</span><em>{athlete.belt_rank || 'No rank set'} · Target {athlete.competition_weight_kg || '—'}kg</em></div>{athleteMetrics.length>0 && <div className="preview"><b>Weight History</b><span>{athleteMetrics.slice(-5).map(m=>`${dateOnly(m.metric_date)}: ${formatWeight(m.weight_kg, getWeightUnit(athlete))}`).join(' · ')}</span></div>}</>}</section>
}

function AdminWorkoutReview({events,logs,athletes,users}:{events:CalendarEvent[];logs:WorkoutLog[];athletes:AthleteProfile[];users:AppUser[]}){
  const opts=getAthleteOptions(athletes); const [athleteId,setAthleteId]=useState((opts.find(a=>normalise(a.name)==='james hiles')||opts[0])?.id||''); const athlete=opts.find(a=>a.id===athleteId)||opts[0];
  const diary=athlete?events.filter(e=>eventMatchesAthlete(e,athlete,users)).sort((a,b)=>`${b.date} ${b.time||''}`.localeCompare(`${a.date} ${a.time||''}`)):[];
  return <section className="panel"><div className="row between"><div><h3>Workout Results Review</h3><p className="muted">Review completed exercises, reps, weights, skipped sets and missed sessions.</p></div><label>Athlete<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{opts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>{diary.length===0?<p className="status">No diary items for this athlete.</p>:diary.slice(0,20).map(e=>{ const sessionLogs=logs.filter(l=>l.session_id===e.id || !!e.remote_id&&l.session_id===e.remote_id); const skipped=sessionLogs.flatMap(l=>l.sets||[]).filter(s=>s.completed===false).length; return <div className="preview reviewCard" key={e.id}><b>{dateOnly(e.date)} · {e.title}</b><span>{e.type} · {titleCase(e.status)} · {normaliseTime(e.time)||'Time TBC'}</span><em>{sessionLogs.length} exercises logged · {skipped} unfinished sets · {(e.skipped_exercises||[]).length} skipped exercises{e.effort_rating?` · Effort ${e.effort_rating}/10`:''}</em>{e.athlete_notes&&<blockquote>{e.athlete_notes}</blockquote>}{sessionLogs.map(l=><div className="setReview" key={l.id}><strong>{l.exercise_name}</strong><span>{(l.sets||[]).length ? (l.sets||[]).map(s=>`Set ${s.set_number}: ${s.reps||'—'} reps @ ${s.weight||'—'} ${s.completed===false?'(skipped)':''}`).join(' | ') : 'Marked complete only'}</span></div>)}</div>})}</section>
}

function AdminResetControls({events,setEvents,plans,setPlans,logs,setLogs}:any){return <AdminRecovery events={events} plans={plans} logs={logs} onReset={()=>{setEvents([]);setPlans([]);setLogs([]);}} onRestore={()=>notify('Recovery complete. Press Sync to refresh your diary.')}/>;}

function AdminTrainingDiary({events,setEvents,athletes,users}:{events:CalendarEvent[]; setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>; athletes:AthleteProfile[]; users:AppUser[]}){
  const athleteOptions = getAthleteOptions(athletes);
  const defaultAthlete = athleteOptions.find(a=>normalise(a.name)==='james hiles') || athleteOptions[0];
  const [athleteId,setAthleteId] = useState(defaultAthlete?.id || '');
  useEffect(()=>{ if(!athleteId && defaultAthlete) setAthleteId(defaultAthlete.id); }, [athleteOptions.length]);
  const athlete = athleteOptions.find(a=>a.id===athleteId) || defaultAthlete;
  const diary = athlete ? events.filter(e=>eventMatchesAthlete(e, athlete, users)).sort((a,b)=>`${a.date} ${a.time||''}`.localeCompare(`${b.date} ${b.time||''}`)) : [];
  const completed = diary.filter(e=>e.status==='completed').length;
  const planned = diary.filter(e=>e.status==='planned').length;
  const classSessions = diary.filter(e=>e.type==='FMA' || !!e.class_name).length;
  async function removeDiaryEvent(event: CalendarEvent){ if(!await deleteRemoteSession(event))return; setEvents(prev=>removeExact(prev,event));  }
  return <section className="panel adminDiaryPanel"><div className="row between diaryHeader"><div><h3>Athlete Training Diary</h3><p className="muted">View and delete the selected athlete's calendar items, assigned workouts and class sessions from the admin profile.</p></div><label>View Athlete<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{athleteOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div><div className="kpiRow diaryKpis"><Kpi label="Planned" value={planned}/><Kpi label="Completed" value={completed}/><Kpi label="Class Sessions" value={classSessions}/><Kpi label="Total Diary Items" value={diary.length}/></div>{diary.length===0 ? <p className="status">No sessions are currently assigned to {athlete?.name || 'this athlete'}. Their diary is clean and ready for new programmes.</p> : <div className="diaryList">{diary.map(e=><div className="preview diaryItem" key={e.id}><b>{e.title}</b><span>{dateOnly(e.date)} · {normaliseTime(e.time) || 'Time TBC'} · {e.type}</span><em>{titleCase(e.status)}{e.workout_plan_id ? ' · Assigned workout' : e.class_name ? ` · ${e.class_name}` : ''}</em><button className="miniBtn dangerBtn" onClick={()=>removeDiaryEvent(e)}>Delete diary item</button></div>)}</div>}</section>
}

function AdminWorkoutManager({plans,setPlans}:{plans:WorkoutPlan[];setPlans:React.Dispatch<React.SetStateAction<WorkoutPlan[]>>}){
  async function removePlan(plan: WorkoutPlan){ if(!await deleteRemoteProgramme(plan))return;setPlans(prev=>removeExact(prev,plan));  }
  return <section className="panel"><h3>Saved Workout Management</h3><p className="muted">View and delete workouts already built in the Workout Builder.</p>{plans.length===0 ? <p className="status">No saved workouts.</p> : plans.map(p=><div className="preview" key={p.id}><b>{p.name}</b><span>{p.focus || 'No focus added'}</span><em>{p.exercises.length} exercises · {p.session_type || 'Gym'}</em><button className="miniBtn dangerBtn" onClick={()=>removePlan(p)}>Delete saved workout</button></div>)}</section>
}

function AchievementManager({badges,setBadges}:{badges:BadgeDefinition[];setBadges:(b:BadgeDefinition[])=>void}){
  const defaultForm: BadgeDefinition = { id:'', name:'', description:'', icon:'🏅', badge_type:'sessions_completed', target_value:1, xp_value:10, is_active:true };
  const [form,setForm]=useState<BadgeDefinition>(defaultForm);
  const [status,setStatus]=useState('');
  const activeBadges = badges.filter(b=>b.is_active !== false);
  const inactiveBadges = badges.filter(b=>b.is_active === false);
  const editing = !!form.id;
  function update<K extends keyof BadgeDefinition>(key:K,value:BadgeDefinition[K]){ setForm({...form,[key]:value}); }
  function editBadge(b: BadgeDefinition){ setForm(normaliseBadgeDefinition(b)); window.scrollTo({top:0, behavior:'smooth'}); }
  function resetForm(){ setForm(defaultForm); }
  async function saveBadge(){
    if(!form.name.trim()){ setStatus('Add an achievement name before saving.'); return; }
    const candidate = normaliseBadgeDefinition({ ...form, id: form.id || crypto.randomUUID(), name: form.name.trim(), description: form.description.trim() || 'Achievement target.', icon: form.icon || '🏅' });
    setStatus('Saving achievement...');
    clearBadgeTombstone(candidate);
    const saved = await saveRemoteBadgeDefinition(candidate);if(saved.sync_state==='failed'){setStatus(syncMessage(saved,'Achievement'));return;}
    const next = [saved, ...badges.filter(b => b.id!==form.id && !(form.remote_id&&b.remote_id===form.remote_id) && normalise(b.name) !== normalise(saved.name))];
    setBadges(next);
    
    setStatus(`${saved.name} has been saved. It will update automatically from the selected counter.`);
    resetForm();
  }
  async function toggleBadge(b: BadgeDefinition){
    const updated = { ...b, is_active: b.is_active === false };
    const saved = await saveRemoteBadgeDefinition(updated);if(saved.sync_state==='failed'){setStatus(syncMessage(saved,'Achievement'));return;}
    const next = badges.map(x => x.id===b.id || !!b.remote_id&&x.remote_id===b.remote_id ? saved : x);
    setBadges(next); 
    setStatus(`${saved.name} is now ${saved.is_active === false ? 'inactive' : 'active'}.`);
  }
  async function deleteBadge(b: BadgeDefinition){
    const ok = await deleteRemoteBadgeDefinition(b);if(!ok){setStatus('Achievement was not deleted. Retry when connected.');return;}
    const next=removeExact(badges,b).filter(x=>badgeStableKey(x)!==badgeStableKey(b));
    setBadges(next); 
    setStatus(ok ? `${b.name} has been deleted.` : `${b.name} was removed locally. If it reappears, run the badge delete policy SQL in Supabase.`);
    if(form.id===b.id) resetForm();
  }
  return <section className="panel achievementManager"><h3>Achievement Manager</h3><p className="muted">Create and update badges without redeploying the app. Use the fixed achievement types below so the counters can update automatically from training data.</p><div className="achievementEditor"><div className="grid three"><label>Badge Name<input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. 10 FMA Classes"/></label><label>Icon<input value={form.icon} onChange={e=>update('icon',e.target.value)} placeholder="🏆"/></label><label>Achievement Type<select value={form.badge_type} onChange={e=>update('badge_type',e.target.value as AchievementType)}>{ACHIEVEMENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label>Target Number<input type="number" min="1" value={form.target_value} onChange={e=>update('target_value',Number(e.target.value))}/></label><label>XP Value<input type="number" min="0" value={form.xp_value || 0} onChange={e=>update('xp_value',Number(e.target.value))}/></label><label>Status<select value={form.is_active === false ? 'inactive' : 'active'} onChange={e=>update('is_active', e.target.value==='active')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><label className="fullLabel">Description<span>Shown on the athlete badges page.</span><textarea value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Describe what the athlete needs to do."/></label><div className="typeHelp"><b>{ACHIEVEMENT_TYPES.find(t=>t.value===form.badge_type)?.label}</b><span>{ACHIEVEMENT_TYPES.find(t=>t.value===form.badge_type)?.help}</span></div><div className="formActions"><button className="primary" onClick={saveBadge}><Save size={16}/>{editing?'Update achievement':'Create achievement'}</button>{editing && <button onClick={resetForm}>Cancel edit</button>}</div>{status && <div className="status">{status}</div>}</div><h4>Active Achievements</h4>{activeBadges.length===0 ? <p className="status">No active achievements yet.</p> : <div className="achievementList">{activeBadges.map(b=><AchievementAdminCard key={b.id} badge={b} onEdit={()=>editBadge(b)} onToggle={()=>toggleBadge(b)} onDelete={()=>deleteBadge(b)}/>)}</div>}{inactiveBadges.length>0 && <><h4>Inactive Achievements</h4><div className="achievementList inactive">{inactiveBadges.map(b=><AchievementAdminCard key={b.id} badge={b} onEdit={()=>editBadge(b)} onToggle={()=>toggleBadge(b)} onDelete={()=>deleteBadge(b)}/>)}</div></>}</section>
}
function AchievementAdminCard({badge,onEdit,onToggle,onDelete}:{badge:BadgeDefinition;onEdit:()=>void;onToggle:()=>void;onDelete:()=>void}){
  const type = ACHIEVEMENT_TYPES.find(t=>t.value===badge.badge_type);
  return <div className="preview achievementAdminCard"><div><b><span className="badgeIconSmall">{badge.icon}</span>{badge.name}</b><span>{badge.description}</span><em>{type?.label || badge.badge_type} · Target {badge.target_value} · {badge.xp_value || 0} XP · {badge.is_active === false ? 'Inactive' : 'Active'}</em></div><div className="actions"><button className="miniBtn" onClick={onEdit}>Edit</button><button className="miniBtn" onClick={onToggle}>{badge.is_active === false ? 'Activate' : 'Deactivate'}</button><button className="miniBtn dangerBtn" onClick={onDelete}>Delete</button></div></div>
}

function WorkoutAssignment({plans,athletes,users,events,setEvents}:{plans:WorkoutPlan[]; athletes:AthleteProfile[]; users:AppUser[]; events:CalendarEvent[]; setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>}){
  const athleteOptions = getAthleteOptions(athletes);
  const [planId,setPlanId]=useState(plans[0]?.id || '');
  const [athleteId,setAthleteId]=useState((athleteOptions.find(a=>normalise(a.name)==='james hiles') || athleteOptions[0])?.id || '');
  const [date,setDate]=useState(todayISO());
  const [time,setTime]=useState('18:00');
  const [status,setStatus]=useState('');const [assigning,setAssigning]=useState(false);
  useEffect(()=>{ if(!planId && plans[0]) setPlanId(plans[0].id); }, [plans.length]);
  useEffect(()=>{ if(!athleteId && athleteOptions[0]) setAthleteId((athleteOptions.find(a=>normalise(a.name)==='james hiles') || athleteOptions[0]).id); }, [athleteOptions.length]);
  async function assign(){if(assigning)return;setAssigning(true);try{
    const plan = plans.find(p=>p.id===planId);
    const athlete = athleteOptions.find(a=>a.id===athleteId);
    if(!plan || !athlete){ setStatus('Create a saved programme and profile before assigning.'); return; }
    const assigned = resolveAssignmentProfile(athlete, users, athletes);
    const assignedProfile: AthleteProfile = { ...athlete, id: assigned.id, name: assigned.name, email: assigned.email || athlete.email };
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      athlete_id: assigned.id,
      athlete_email: assigned.email || athlete.email || undefined,
      athlete_name: assigned.name || athlete.name,
      assigned_by_user_id: 'admin-alex',
      workout_plan_id: plan.id,
      date:dateOnly(date),
      time:normaliseTime(time),
      title: plan.name,
      type: plan.session_type || 'Gym',
      status: 'planned',
    };
    setStatus('Workout added. Saving assignment to cloud...');
    const optimisticEvents = [event, ...events.filter(e => e.id !== event.id)];
    setEvents(optimisticEvents); 
    const remoteSynced = await saveRemoteSession(event, plan, assignedProfile);
    const nextEvents = [remoteSynced, ...events.filter(e => e.id !== event.id && e.id !== remoteSynced.id && e.remote_id !== remoteSynced.remote_id)];
    setEvents(prev=>mergeById(prev,remoteSynced));
    setStatus(remoteSynced.sync_state==='saved' ? `${plan.name} has been pushed to ${assigned.name}. It will appear after ${assigned.name} opens/refreshes the app or presses Sync.` : `${plan.name} was added locally, but cloud save could not be confirmed. Check the connection and press Sync before relying on another device.`);}finally{setAssigning(false)}
  }
  return <section className="panel"><h3>Assign Workout To Athlete</h3><p className="muted">Create workouts in the Workout Builder, then push the saved workout to a selected athlete. The session is attached to the athlete profile selected below, not automatically to the trainer profile.</p>{plans.length===0 ? <p className="status">No saved workouts yet. Create and save a workout in the Workout Builder first.</p> : <><div className="grid two"><label>Saved Workout<select value={planId} onChange={e=>setPlanId(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.exercises.length} exercises</option>)}</select></label><label>Assign To Profile<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{athleteOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Session Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Session Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="formActions"><button className="primary" disabled={assigning} onClick={assign}><CalendarDays size={16}/>Push workout to profile</button></div></>}{status && <div className="status">{status}</div>}<div className="assignmentList"><h4>Recently Assigned To Profiles</h4>{events.filter(e=>e.workout_plan_id && e.athlete_id).slice(0,5).map(e=><div className="preview" key={e.id}><b>{e.title}</b><span>{dateOnly(e.date)} · {normaliseTime(e.time) || 'Time TBC'}</span><em>{e.athlete_name || athletes.find(a=>a.id===e.athlete_id)?.name || 'Athlete not assigned'}</em></div>)}</div></section>
}

function AthleteCreator({users,setUsers,athletes,setAthletes}:{users:AppUser[];setUsers:(u:AppUser[])=>void;athletes:AthleteProfile[];setAthletes:(a:AthleteProfile[])=>void}){
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [role,setRole]=useState<AppUser['role']>('athlete'); const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false);
  async function create(){
    setBusy(true);setStatus('Creating secure athlete profile and invitation…');
    try {
      if (supabase) {
        const { data, error } = await supabase.functions.invoke('invite-athlete', { body:{ name, email, role, gym:'FMA Chester', goal:'Build consistent training habits.' } });
        if (!error && data?.athlete) {
          const created=mapRemoteAthleteToLocal(data.athlete);const next=canonicaliseAthletes([...athletes,created]);setAthletes(next);
          setUsers(canonicaliseUsers([...users,{id:`profile-${created.id}`,email,name,role,athlete_id:created.id}]));
          setStatus(`Created ${name} and sent a secure Supabase invitation to ${email}.`);setName('');setEmail('');return;
        }
        if (error) console.warn('Invite athlete Edge Function unavailable:', error);
      }
      setStatus('The athlete invitation could not be completed. Check the invite-athlete function and connection, then retry. No local login has been created.');
    }catch(error:any){setStatus(`Invitation failed: ${error.message}`)}finally{setBusy(false);}
  }
  return <section className="panel"><h3>Create Athlete</h3><p className="muted">Creates a separated cloud profile and, when the V4 Edge Function is deployed, sends a secure Supabase Auth invitation.</p><div className="grid three"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Athlete name"/></label><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="athlete@email.com"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value as AppUser['role'])}><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="admin">Admin</option></select></label></div><button className="primary" onClick={create} disabled={!name||!email||busy}><Users size={16}/>{busy?'Creating…':'Create & invite athlete'}</button>{status&&<div className="status">{status}</div>}{canonicaliseAthletes(athletes).map(a=><div className="preview" key={a.id}><b>{a.name}</b><span>{a.email}</span><em>{a.gym}</em></div>)}</section>
}
function ManualExercise({exercises,setExercises}:{exercises:Exercise[];setExercises:(e:Exercise[])=>void}){
  const [name,setName]=useState(''); const [description,setDescription]=useState(''); const [body,setBody]=useState('waist'); const [target,setTarget]=useState('abs'); const [category,setCategory]=useState('strength'); const [equipment,setEquipment]=useState('body weight'); const [location,setLocation]=useState('Home'); const [videoUrl,setVideoUrl]=useState('');
  const bodyOptions=Array.from(new Set(['full body', ...exercises.map(e=>bodyOf(e)).filter(Boolean)])).sort(); const targetOptions=Array.from(new Set(['full body', ...exercises.map(e=>e.target).filter(Boolean)])).sort(); const categoryOptions=Array.from(new Set(exercises.map(e=>e.category).filter(Boolean))).sort();
  const [saving,setSaving]=useState(false);
  async function save(){if(saving)return;setSaving(true);try{if(!supabase)throw new Error('Cloud unavailable. Your exercise has not been saved.');const exercise:Exercise={exercise_id:`manual-${crypto.randomUUID()}`,name:name.trim(),description,body_part:body,target,category,equipment,location,video_url:videoUrl,has_video:!!videoUrl,instructions:[]};const {error}=await supabase.from('exercises').upsert({...exercise,exercise_type:category,archived:false,is_archived:false},{onConflict:'exercise_id'});if(error)throw error;setExercises([exercise,...exercises]);setName('');setDescription('');setVideoUrl('');notify('Exercise saved to cloud.');}catch(e:any){notify(`Exercise not saved: ${e.message}`)}finally{setSaving(false)}}

  return <section className="panel"><h3>Manually Add Exercise</h3><p className="muted">Add custom MMA, boxing, BJJ, physio or flexibility drills and link any open video URL.</p><div className="grid three"><label>Exercise Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Slip rope footwork"/></label><label>Body Part<select aria-label="Body area" value={body} onChange={e=>setBody(e.target.value)}>{bodyOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Target Muscle / Focus<select value={target} onChange={e=>setTarget(e.target.value)}>{targetOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Type<select aria-label="Exercise category" value={category} onChange={e=>setCategory(e.target.value)}>{categoryOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Equipment<input value={equipment} onChange={e=>setEquipment(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label></div><label className="fullLabel">Short Description<span>Keep this short. Full written instructions can be added later.</span><textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Demo Video URL<input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://..."/></label><button className="primary" onClick={save} disabled={!name||saving}><Plus size={16}/>{saving?'Saving…':'Add exercise'}</button></section>
}

function Importer({setExercises,reloadSupabase,exercises}:{setExercises:(e:Exercise[])=>void; reloadSupabase:()=>void; exercises:Exercise[]}) {
  const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState('Ready to load the bundled V2.2.9 catalogue.'); const [busy,setBusy]=useState(false); const [missingOpen,setMissingOpen]=useState(false);
  const missing = localCatalogue.filter(e=>!e.video_path && !e.video_url).slice(0,50);
  const prepared = useMemo(()=>localCatalogue.map(e=>({...e, video_url: e.video_url || buildVideoUrl(e.video_path), has_video: !!(e.video_url || e.video_path)})),[localCatalogue]);
  async function importLocal(){ setExercises(prepared); setStatus(`Loaded ${prepared.length} exercises into app data.`); }
  async function importSupabase(){
    if (!supabase) { setStatus('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'); return; }
    setBusy(true); setStatus('Importing exercises to Supabase...');
    try {
      const rows = prepared.map(({instructions, ...e}) => ({...e, archived: !!e.is_archived, exercise_type: e.category || 'general'}));
      for (let i=0;i<rows.length;i+=200) { const { error } = await supabase.from('exercises').upsert(rows.slice(i,i+200), { onConflict: 'exercise_id' }); if (error) throw error; }
      const instructionRows = prepared.flatMap(e => (e.instructions||[]).map((instruction,idx)=>({exercise_id:e.exercise_id, step_number:idx+1, instruction})));
      for (let i=0;i<instructionRows.length;i+=500) { const { error } = await supabase.from('exercise_instructions').upsert(instructionRows.slice(i,i+500), { onConflict: 'exercise_id,step_number' }); if (error) throw error; }
      setStatus(`Supabase import complete: ${rows.length} exercises and ${instructionRows.length} instruction steps.`); await reloadSupabase();
    } catch (err:any) { setStatus(`Supabase import failed: ${err.message || err}`); } finally { setBusy(false); }
  }
  return <div><section className="panel"><h3>Exercise Import</h3><p className="muted">Import the corrected exercise catalogue and manage any missing video URLs.</p><div className="row actions"><button className="primary" onClick={()=>{setLoaded(true);setStatus(`Catalogue loaded: ${localCatalogue.length} unique exercises.`)}}>Load Catalogue</button><button disabled={!loaded} onClick={importLocal}>Import To App Data</button><button disabled={!loaded||busy} onClick={importSupabase}><Import size={16}/>Import Catalogue To Supabase</button></div><div className="status">{status}</div></section><div className="kpiRow"><Kpi label="Records" value={(summary as any).records || 1659}/><Kpi label="Unique IDs" value={localCatalogue.length}/><Kpi label="Videos Mapped" value={localCatalogue.filter(e=>e.video_path).length}/><Kpi label="Missing Videos" value={(summary as any).missing_records || missing.length}/></div><section className="panel"><div className="row between"><h3>Missing Video Manager</h3><button onClick={()=>setMissingOpen(!missingOpen)}>{missingOpen?'Hide':'Open'} Missing List</button></div>{missingOpen && missing.map(e=><MissingVideoRow key={e.exercise_id} exercise={e} setExercises={setExercises} exercises={exercises}/>)}</section></div>
}
function MissingVideoRow({exercise,exercises,setExercises}:{exercise:Exercise;exercises:Exercise[];setExercises:(e:Exercise[])=>void}){const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);async function save(){if(busy)return;setBusy(true);try{if(!supabase)throw new Error('Cloud unavailable.');const updated={...exercise,video_url:url,has_video:!!url};const {error}=await supabase.from('exercises').upsert({...updated,exercise_type:updated.category||'general',archived:false,is_archived:false},{onConflict:'exercise_id'});if(error)throw error;setExercises(exercises.map(e=>e.exercise_id===exercise.exercise_id?updated:e));notify('Video URL saved to cloud.');}catch(e:any){notify(`Video URL not saved: ${e.message}`)}finally{setBusy(false)}}return <div className="missingRow"><b>{titleCase(exercise.name)}</b><span>{titleCase(bodyOf(exercise))} · {titleCase(exercise.target)}</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste replacement video URL"/><button onClick={save} disabled={!url||busy}>{busy?'Saving…':'Save URL'}</button></div>;}

function VideoModal({title,url,onClose}:{title:string;url:string;onClose:()=>void}){ useDialog(true,'.videoModal',onClose); return <div className="modalBackdrop" onClick={onClose} role="presentation"><div className="videoModal" role="dialog" aria-modal="true" aria-label={`${title} demonstration`} onClick={e=>e.stopPropagation()}><div className="row between videoModalHeader"><h3>{title}</h3><button className="iconButton" aria-label="Close demo" onClick={onClose}><X size={20}/></button></div>{url ? <video src={url} controls autoPlay playsInline/> : <p>No video URL available.</p>}</div></div> }

createRoot(document.getElementById('root')!).render(<AppBoundary><App/></AppBoundary>);
