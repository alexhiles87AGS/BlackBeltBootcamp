import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock,
  Database, Dumbbell, Home, Import, Library, LogOut, Medal, Menu, PlayCircle, Plus,
  Save, Search, Shield, Target, Trophy, User, Users, Video, X, ClipboardList,
  ArrowLeft, ArrowRight, Edit3, Trash2, RefreshCw, KeyRound
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase, buildVideoUrl } from './supabaseClient';
import catalogue from './data/exercise_catalogue.json';
import summary from './data/video_sort_summary.json';
import type { AppUser, AthleteProfile, AthleteMetric, Badge, BadgeDefinition, AchievementType, CalendarEvent, Exercise, ExerciseLogSet, ProgrammeExercise, SessionType, WorkoutLog, WorkoutPlan } from './types';
import './styles.css';

const localCatalogue = catalogue as Exercise[];

type Page = 'dashboard' | 'calendar' | 'today' | 'library' | 'builder' | 'fma' | 'stats' | 'badges' | 'profile' | 'admin' | 'import' | 'session';

const NAV: { page: Page; label: string; icon: React.ReactNode; roles?: string[] }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <Home size={18}/> },
  { page: 'calendar', label: 'Training Calendar', icon: <CalendarDays size={18}/> },
  { page: 'today', label: "Today's Training", icon: <Activity size={18}/> },
  { page: 'library', label: 'Exercise Library', icon: <Library size={18}/> },
  { page: 'builder', label: 'Workout Builder', icon: <Plus size={18}/> },
  { page: 'fma', label: 'FMA Classes', icon: <Shield size={18}/> },
  { page: 'stats', label: 'Progress Stats', icon: <BarChart3 size={18}/> },
  { page: 'badges', label: 'Badges', icon: <Medal size={18}/> },
  { page: 'admin', label: 'Admin Console', icon: <Users size={18}/>, roles: ['admin','coach'] },
  { page: 'import', label: 'Exercise Import', icon: <Database size={18}/>, roles: ['admin','coach'] },
];

const APP_VERSION = '3.0.0-cloud-sync-auth';

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
  { id: 'admin-alex', email: 'alex.hiles.ags@gmail.com', password: 'BlackBeltAdmin!2026', name: 'Alex Hiles', role: 'admin', athlete_id: 'alex-admin' },
  { id: 'athlete-james', email: 'james.hiles@blackbeltbootcamp.app', password: 'JamesTraining!2026', name: 'James Hiles', role: 'athlete', athlete_id: 'james-athlete' },
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

const fmaClasses = [
  { name:'Advanced MMA', type:'MMA' as SessionType, focus:'High-level MMA skill development and live rounds.' },
  { name:'Masters MMA', type:'MMA' as SessionType, focus:'Technical MMA class with controlled sparring and drilling.' },
  { name:'Adult MMA', type:'MMA' as SessionType, focus:'Mixed martial arts class for adults.' },
  { name:'BJJ / Grappling', type:'BJJ' as SessionType, focus:'Ground fighting, submissions and positional control.' },
  { name:'Kickboxing', type:'Kickboxing' as SessionType, focus:'Striking mechanics, defence, combinations and footwork.' },
];

function storage<T>(key:string, fallback:T):T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function setStorage<T>(key:string, value:T){ localStorage.setItem(key, JSON.stringify(value)); }
const APP_TIME_ZONE = 'GMT';
const CLEAN_START_CUTOFF_UTC = '2026-06-21T07:33:32Z';
function pad2(value: number){ return String(value).padStart(2, '0'); }
function dateOnly(value?: string | Date | null){
  if (!value) return dateOnly(new Date());
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (!Number.isNaN(d.getTime())) return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
  return String(value).slice(0,10);
}
function normaliseTime(value?: string | null){
  const text = String(value || '').trim();
  const match = text.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '';
}
function toGmtSessionDate(value?: string | Date | null){ return `${dateOnly(value)}T12:00:00+00:00`; }
function isAfterCleanStart(row: any){ return !row?.created_at || new Date(row.created_at).getTime() >= new Date(CLEAN_START_CUTOFF_UTC).getTime(); }
function localDateString(date: Date){ return dateOnly(date); }
function todayISO(){ return dateOnly(new Date()); }
function dateFromIso(value: string | Date){ const [y,m,d] = dateOnly(value).split('-').map(Number); return new Date(Date.UTC(y, m-1, d, 12, 0, 0)); }
function addDays(date: Date | string, days: number){ const d = dateFromIso(date); d.setUTCDate(d.getUTCDate()+days); return d; }
function startOfWeek(date: Date | string = new Date()){ const d = dateFromIso(date); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - day + 1); return d; }
function weekDates(){ const start = startOfWeek(); return Array.from({length:7}, (_,i)=>addDays(start,i)); }
function iso(date: Date | string){ return dateOnly(date); }
function dayLabel(date: Date | string){ return dateFromIso(date).toLocaleDateString('en-GB', { timeZone: APP_TIME_ZONE, weekday:'short', day:'numeric', month:'short' }); }
function titleCase(v?: string | null){ return (v || '').split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
function sentence(v?: string | null){ const s = (v || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function bodyOf(e: Exercise){ return e.body_part || e.body_parts || 'general'; }
function safeVideo(e: Exercise){ return e.video_url || buildVideoUrl(e.video_path); }
function bmi(profile: AthleteProfile){ if(!profile.height_cm || !profile.weight_kg) return ''; const m = profile.height_cm/100; return (profile.weight_kg/(m*m)).toFixed(1); }
type WeightUnit = 'kg' | 'st';
const POUNDS_PER_KG = 2.2046226218;
function getWeightUnit(profile?: AthleteProfile | null): WeightUnit { return (profile?.weight_unit === 'st' || storage<WeightUnit>('bbb_weight_unit', 'kg') === 'st') ? 'st' : 'kg'; }
function kgToStLb(kg?: number | null) { const totalLb = Math.max(0, Number(kg || 0) * POUNDS_PER_KG); const st = Math.floor(totalLb / 14); const lb = Math.round((totalLb - st * 14) * 10) / 10; return { st, lb }; }
function stLbToKg(st?: number | string, lb?: number | string) { const stones = Number(st || 0); const pounds = Number(lb || 0); return Math.round(((stones * 14) + pounds) / POUNDS_PER_KG * 10) / 10; }
function kgToStoneDecimal(kg?: number | null) { return Math.round((Number(kg || 0) * POUNDS_PER_KG / 14) * 100) / 100; }
function formatWeight(kg?: number | null, unit: WeightUnit = 'kg') { if (!kg) return '—'; if (unit === 'st') { const { st, lb } = kgToStLb(kg); return `${st}st ${lb}lb`; } return `${Number(kg).toFixed(1).replace(/\.0$/, '')}kg`; }
function classNameForType(type?: string){ return `typeBadge type-${(type||'general').toLowerCase().replace(/\s+/g,'-')}`; }
function normalise(v?: string | null){ return (v || '').trim().toLowerCase(); }
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
  if (!event.athlete_id && !eventEmail) return true;
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
function percent(count:number, target:number){ return Math.max(0, Math.min(100, Math.round((count/Math.max(1,target))*100))); }
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
  return nId === 'james-athlete' || nEmail === 'james.hiles@blackbeltbootcamp.app' || nEmail === 'james@blackbeltbootcamp.app' || nName === 'james hiles';
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
  return [cleanProfiles[0], cleanProfiles[1], ...extras];
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
  const byName = athletes.find(a=>normalise(a.name)===normalise(user.name));
  if (byId || byEmail || byName) return byId || byEmail || byName!;
  if (normalise(user.email)==='alex.hiles.ags@gmail.com') return cleanProfiles[0];
  if (isCanonicalJamesIdentity(user.athlete_id, user.email, user.name)) return cleanProfiles[1];
  return { id: user.athlete_id || user.id, name: user.name, email: user.email, role: user.role, gym: 'BlackBeltBootcamp', goal: 'Personal training profile.' } as AthleteProfile;
}


function mergeUniqueById<T extends {id:string}>(local:T[], remote:T[]){
  const map = new Map<string,T>();
  [...remote, ...local].forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

function remoteAthleteDisplayName(a: any){ return a?.name || a?.full_name || a?.fullName || ''; }
function remoteAthleteIsActive(a: any){ return a?.is_active === undefined || a?.is_active === null || a?.is_active === true; }
function mapRemoteAthleteToLocal(a: any): AthleteProfile {
  const remoteName = remoteAthleteDisplayName(a);
  if (isCanonicalJamesIdentity(a?.id, a?.email, remoteName)) return { ...cleanProfiles[1], remote_id: a?.id };
  if (normalise(a?.email) === 'alex.hiles.ags@gmail.com' || normalise(remoteName) === 'alex hiles') return { ...cleanProfiles[0], remote_id: a?.id };
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
  if (!supabase) return normalised;
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
    return saved;
  } catch (err) {
    console.warn('Supabase badge save skipped:', err);
    return normalised;
  }
}
async function deleteRemoteBadgeDefinition(def: BadgeDefinition): Promise<boolean> {
  addBadgeTombstone(def);
  if (!supabase) return true;
  const remoteId = def.remote_id || def.id;
  if (!isUuid(remoteId)) return true;
  try {
    const { error } = await supabase.from('badges').delete().eq('id', remoteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Supabase badge hard delete skipped, attempting soft deactivate:', err);
    try {
      await supabase.from('badges').update({ is_active:false, updated_at:new Date().toISOString() }).eq('id', remoteId);
      return true;
    } catch (softErr) {
      console.warn('Supabase badge soft delete skipped:', softErr);
      return true;
    }
  }
}

async function ensureRemoteAthlete(profile: AthleteProfile): Promise<string | null> {
  if (!supabase) return null;
  try {
    const email = profile.email || '';
    if (email) {
      const { data, error } = await supabase.from('athlete_profiles').select('*').eq('email', email).limit(1);
      if (!error && data && data[0]?.id) return data[0].id;
    }

    const baseRow = {
      email: profile.email || null,
      role: profile.role || 'athlete',
      age: profile.age || null,
      height_cm: profile.height_cm || null,
      weight_kg: profile.weight_kg || null,
      competition_weight_kg: profile.competition_weight_kg || null,
      belt_rank: profile.belt_rank || null,
      gym: profile.gym || null,
      goal: profile.goal || null,
    };

    // Support both schema variants used during the project: name and full_name.
    let insertedId: string | null = null;
    const nameInsert = await supabase
      .from('athlete_profiles')
      .insert({ ...baseRow, name: profile.name })
      .select('*')
      .single();

    if (!nameInsert.error) insertedId = nameInsert.data?.id || null;
    else {
      const fullNameInsert = await supabase
        .from('athlete_profiles')
        .insert({ ...baseRow, full_name: profile.name, is_active: true, profile_photo_url: profile.profile_photo_url || null })
        .select('*')
        .single();
      if (!fullNameInsert.error) insertedId = fullNameInsert.data?.id || null;
      else {
        console.warn('Supabase athlete insert skipped:', nameInsert.error, fullNameInsert.error);
      }
    }

    if (insertedId) return insertedId;
    if (email) {
      const { data } = await supabase.from('athlete_profiles').select('*').eq('email', email).limit(1);
      return data?.[0]?.id || null;
    }
    return null;
  } catch (err) {
    console.warn('Supabase athlete sync skipped:', err);
    return null;
  }
}

async function saveRemoteProgramme(plan: WorkoutPlan): Promise<string | null> {
  if (!supabase) return null;
  try {
    const remoteId = (plan as any).remote_id;
    let programmeId = remoteId || null;
    if (programmeId) {
      await supabase.from('workout_programmes').update({
        name: plan.name,
        focus: plan.focus,
        session_type: plan.session_type || 'Gym',
        owner_athlete_id: plan.owner_athlete_id && isUuid(plan.owner_athlete_id) ? plan.owner_athlete_id : null,
        is_template: plan.is_template !== false,
        updated_at: new Date().toISOString(),
      }).eq('id', programmeId);
      await supabase.from('workout_programme_exercises').delete().eq('programme_id', programmeId);
    } else {
      const { data, error } = await supabase.from('workout_programmes').insert({
        name: plan.name,
        focus: plan.focus,
        session_type: plan.session_type || 'Gym',
        owner_athlete_id: plan.owner_athlete_id && isUuid(plan.owner_athlete_id) ? plan.owner_athlete_id : null,
        is_template: plan.is_template !== false,
      }).select('*').single();
      if (error) throw error;
      programmeId = data?.id || null;
    }
    if (!programmeId) return null;
    const rows = (plan.exercises || []).map((ex, index) => ({
      programme_id: programmeId,
      exercise_id: ex.exercise_id,
      exercise_name: ex.name,
      planned_sets: ex.planned_sets || 3,
      planned_reps: ex.planned_reps || '8-12',
      planned_weight: ex.planned_weight || null,
      sort_order: index + 1,
      notes: ex.notes || null,
    }));
    if (rows.length) await supabase.from('workout_programme_exercises').insert(rows);
    return programmeId;
  } catch (err) {
    console.warn('Supabase programme sync skipped:', err);
    return null;
  }
}

async function saveRemoteSession(event: CalendarEvent, plan: WorkoutPlan | undefined, profile: AthleteProfile): Promise<CalendarEvent> {
  if (!supabase) return event;
  try {
    const remoteAthleteId = await ensureRemoteAthlete(profile);
    const remoteProgrammeId = plan ? await saveRemoteProgramme(plan) : null;
    if (!remoteAthleteId) return event;
    const { data, error } = await supabase.from('training_sessions').insert({
      athlete_id: remoteAthleteId,
      programme_id: remoteProgrammeId,
      session_date: toGmtSessionDate(event.date),
      start_time: normaliseTime(event.time) || null,
      title: event.title,
      session_type: event.type,
      status: event.status || 'planned',
      class_name: event.class_name || null,
      notes: event.athlete_email ? `Assigned to ${event.athlete_name || profile.name} (${event.athlete_email})` : null,
    }).select('*').single();
    if (error) throw error;
    return { ...event, date: dateOnly(event.date), time: normaliseTime(event.time), remote_id: data?.id || event.remote_id, remote_plan_id: remoteProgrammeId || undefined };
  } catch (err) {
    console.warn('Supabase session sync skipped:', err);
    return event;
  }
}


async function updateRemoteSessionStatus(event: CalendarEvent, status: CalendarEvent['status'], date?: string, time?: string) {
  if (!supabase || !event.remote_id) return;
  try {
    const { error } = await supabase
      .from('training_sessions')
      .update({
        status,
        session_date: toGmtSessionDate(date || event.date),
        start_time: normaliseTime(time || event.time) || null,
      })
      .eq('id', event.remote_id);
    if (error) console.warn('Supabase session status update skipped:', error);
  } catch (err) {
    console.warn('Supabase session status update skipped:', err);
  }
}


async function deleteRemoteSession(event: CalendarEvent): Promise<boolean> {
  if (!supabase) return true;
  const remoteId = event.remote_id || event.id;
  if (!remoteId) return true;
  try {
    const { error } = await supabase.from('training_sessions').delete().eq('id', remoteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Supabase session delete skipped:', err);
    return false;
  }
}

async function deleteRemoteProgramme(plan: WorkoutPlan): Promise<boolean> {
  if (!supabase) return true;
  const remoteId = (plan as any).remote_id || plan.id;
  if (!remoteId) return true;
  try {
    await supabase.from('workout_programme_exercises').delete().eq('programme_id', remoteId);
    const { error } = await supabase.from('workout_programmes').delete().eq('id', remoteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Supabase programme delete skipped:', err);
    return false;
  }
}

async function clearRemoteDiaryAndWorkouts(): Promise<boolean> {
  if (!supabase) return true;
  let ok = true;
  const clear = async (table: string) => {
    try {
      const { error } = await supabase.from(table).delete().not('id','is',null);
      if (error) { console.warn(`Supabase ${table} clear skipped:`, error); ok = false; }
    } catch (err) { console.warn(`Supabase ${table} clear skipped:`, err); ok = false; }
  };
  await clear('workout_logs');
  await clear('training_sessions');
  await clear('workout_programme_exercises');
  await clear('workout_programmes');
  return ok;
}


async function saveRemoteSetting(key: string, value: string) {
  if (!supabase) return;
  try {
    await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (err) { console.warn('Supabase setting save skipped:', err); }
}

async function saveRemoteProfile(profile: AthleteProfile) {
  if (!supabase) return profile;
  try {
    const remoteId = profile.remote_id || (isUuid(profile.id) ? profile.id : await ensureRemoteAthlete(profile));
    if (!remoteId) return profile;
    const row = {
      name: profile.name,
      email: profile.email || null,
      role: profile.role || 'athlete',
      age: profile.age || null,
      height_cm: profile.height_cm || null,
      weight_kg: profile.weight_kg || null,
      competition_weight_kg: profile.competition_weight_kg || null,
      belt_rank: profile.belt_rank || null,
      gym: profile.gym || null,
      goal: profile.goal || null,
      profile_photo_url: profile.profile_photo_url || null,
      weight_unit: getWeightUnit(profile),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('athlete_profiles').update(row).eq('id', remoteId);
    if (error && /weight_unit/i.test(error.message || '')) {
      const { weight_unit, ...fallbackRow } = row;
      await supabase.from('athlete_profiles').update(fallbackRow).eq('id', remoteId);
    } else if (error) {
      throw error;
    }
    return { ...profile, remote_id: remoteId };
  } catch (err) { console.warn('Supabase profile save skipped:', err); return profile; }
}

async function saveRemoteMetric(metric: AthleteMetric) {
  if (!supabase) return metric;
  try {
    const remoteId = metric.remote_id || (isUuid(metric.id) ? metric.id : undefined);
    const row = {
      id: remoteId || undefined,
      athlete_id: isUuid(metric.athlete_id) ? metric.athlete_id : null,
      metric_date: dateOnly(metric.metric_date),
      weight_kg: metric.weight_kg || null,
      height_cm: metric.height_cm || null,
      body_fat_percent: metric.body_fat_percent || null,
      notes: metric.notes || null,
    };
    const { data, error } = await supabase.from('athlete_metrics').upsert(row).select('*').single();
    if (error) throw error;
    return { ...metric, remote_id: data?.id || metric.remote_id, id: data?.id || metric.id };
  } catch (err) { console.warn('Supabase metric save skipped:', err); return metric; }
}

async function saveRemoteWorkoutLog(log: WorkoutLog, athlete: AthleteProfile | undefined, event?: CalendarEvent) {
  if (!supabase) return log;
  try {
    const athleteId = athlete ? await ensureRemoteAthlete(athlete) : null;
    const sessionId = event?.remote_id && isUuid(event.remote_id) ? event.remote_id : null;
    const row = {
      athlete_id: athleteId,
      session_id: sessionId,
      log_date: dateOnly(log.date),
      session_type: log.session_type || event?.type || null,
      exercise_id: log.exercise_id,
      exercise_name: log.exercise_name,
      sets: log.sets || [],
      reps: log.reps || null,
      weight: log.weight || null,
      rpe: log.rpe || null,
      notes: log.notes || null,
      completed: !!log.completed,
    };
    const { data, error } = await supabase.from('workout_logs').insert(row).select('*').single();
    if (error) throw error;
    return { ...log, id: data?.id || log.id };
  } catch (err) { console.warn('Supabase workout log save skipped:', err); return log; }
}

async function createRemoteAthleteProfile(profile: AthleteProfile) {
  if (!supabase) return profile;
  try {
    const row = {
      name: profile.name,
      email: profile.email || null,
      role: profile.role || 'athlete',
      age: profile.age || null,
      height_cm: profile.height_cm || null,
      weight_kg: profile.weight_kg || null,
      competition_weight_kg: profile.competition_weight_kg || null,
      belt_rank: profile.belt_rank || null,
      gym: profile.gym || null,
      goal: profile.goal || null,
      weight_unit: getWeightUnit(profile),
      is_active: true,
    };
    let result = await supabase.from('athlete_profiles').insert(row).select('*').single();
    if (result.error && /weight_unit/i.test(result.error.message || '')) {
      const { weight_unit, ...fallbackRow } = row;
      result = await supabase.from('athlete_profiles').insert(fallbackRow).select('*').single();
    }
    if (result.error) throw result.error;
    return mapRemoteAthleteToLocal(result.data);
  } catch (err) { console.warn('Supabase athlete create skipped:', err); return profile; }
}

async function buildAppUserFromAuthUser(authUser: any): Promise<AppUser> {
  const email = authUser?.email || '';
  let role: AppUser['role'] = 'athlete';
  let name = authUser?.user_metadata?.name || email;
  let athleteId = authUser?.user_metadata?.athlete_id || undefined;
  if (supabase && email) {
    try {
      const { data: profileRows } = await supabase.from('user_profiles').select('*').or(`auth_user_id.eq.${authUser.id},email.eq.${email}`).limit(1);
      const userProfile = profileRows?.[0];
      if (userProfile) {
        role = userProfile.role || role;
        name = userProfile.full_name || userProfile.name || name;
        athleteId = userProfile.athlete_id || athleteId;
      }
      if (!athleteId) {
        const { data: athleteRows } = await supabase.from('athlete_profiles').select('*').eq('email', email).limit(1);
        const athleteProfile = athleteRows?.[0];
        if (athleteProfile) {
          const mapped = mapRemoteAthleteToLocal(athleteProfile);
          athleteId = mapped.id;
          name = mapped.name || name;
          role = mapped.role || role;
        }
      }
    } catch (err) { console.warn('Supabase auth profile lookup skipped:', err); }
  }
  if (normalise(email) === 'alex.hiles.ags@gmail.com') { role = 'admin'; name = 'Alex Hiles'; athleteId = 'alex-admin'; }
  if (normalise(email) === 'james.hiles@blackbeltbootcamp.app') { role = 'athlete'; name = 'James Hiles'; athleteId = 'james-athlete'; }
  return { id: authUser.id, email, name, role, athlete_id: athleteId };
}

function migrateFinalState(){
  try {
    // Seed only if the local store is empty, then normalise the two built-in profiles.
    if (!localStorage.getItem('bbb_users')) localStorage.setItem('bbb_users', JSON.stringify(cleanUsers));
    if (!localStorage.getItem('bbb_athletes')) localStorage.setItem('bbb_athletes', JSON.stringify(cleanProfiles));
    if (!localStorage.getItem('bbb_profile')) localStorage.setItem('bbb_profile', JSON.stringify(defaultProfile));
    if (!localStorage.getItem('bbb_events')) localStorage.setItem('bbb_events', JSON.stringify([]));
    if (!localStorage.getItem('bbb_plans')) localStorage.setItem('bbb_plans', JSON.stringify([]));
    if (!localStorage.getItem('bbb_logs')) localStorage.setItem('bbb_logs', JSON.stringify([]));
    if (!localStorage.getItem('bbb_badges')) localStorage.setItem('bbb_badges', JSON.stringify(initialBadges));

    const users = canonicaliseUsers(JSON.parse(localStorage.getItem('bbb_users') || '[]'));
    const athletes = canonicaliseAthletes(JSON.parse(localStorage.getItem('bbb_athletes') || '[]'));
    const events = canonicaliseEvents(JSON.parse(localStorage.getItem('bbb_events') || '[]'));
    const currentUser = canonicaliseCurrentUser(JSON.parse(localStorage.getItem('bbb_current_user') || 'null'));
    const currentProfile = JSON.parse(localStorage.getItem('bbb_profile') || 'null') as AthleteProfile | null;
    const profile = currentProfile && isCanonicalJamesIdentity(currentProfile.id, currentProfile.email, currentProfile.name)
      ? cleanProfiles[1]
      : currentProfile && (normalise(currentProfile.email) === 'alex.hiles.ags@gmail.com' || normalise(currentProfile.name) === 'alex hiles')
        ? cleanProfiles[0]
        : currentProfile || defaultProfile;

    const cleanStartKey = 'bbb_v2213_fresh_start_done';
    const freshStartAlreadyRun = localStorage.getItem(cleanStartKey);
    localStorage.setItem('bbb_users', JSON.stringify(users));
    localStorage.setItem('bbb_athletes', JSON.stringify(athletes));
    localStorage.setItem('bbb_events', JSON.stringify(freshStartAlreadyRun ? events.map(e=>({...e,date:dateOnly(e.date),time:normaliseTime(e.time)})) : []));
    localStorage.setItem('bbb_plans', JSON.stringify(freshStartAlreadyRun ? JSON.parse(localStorage.getItem('bbb_plans') || '[]') : []));
    localStorage.setItem('bbb_logs', JSON.stringify(freshStartAlreadyRun ? JSON.parse(localStorage.getItem('bbb_logs') || '[]') : []));
    if (!freshStartAlreadyRun) localStorage.setItem(cleanStartKey, 'pending-remote');
    localStorage.setItem('bbb_profile', JSON.stringify(profile));
    if (currentUser) localStorage.setItem('bbb_current_user', JSON.stringify(currentUser));
    localStorage.setItem('bbb_removed_old_james_profile_v228', 'done');
    localStorage.setItem('bbb_app_version', APP_VERSION);
  } catch { /* local storage unavailable */ }
}

migrateFinalState();

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => storage('bbb_current_user', null));
  const [page, setPage] = useState<Page>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [dashboardFocusText, setDashboardFocusText] = useState(() => storage('bbb_dashboard_focus', 'Keep stacking the small wins.'));

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (mounted && data.session?.user) setCurrentUser(await buildAppUserFromAuthUser(data.session.user));
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) setCurrentUser(await buildAppUserFromAuthUser(session.user));
      else setCurrentUser(null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setStorage('bbb_current_user', currentUser); }, [currentUser]);
  useEffect(() => { setStorage('bbb_profile', profile); }, [profile]);
  useEffect(() => { setStorage('bbb_athletes', athletes); }, [athletes]);
  useEffect(() => { setStorage('bbb_users', users); }, [users]);
  useEffect(() => { setStorage('bbb_exercises', exercises); }, [exercises]);
  useEffect(() => { setStorage('bbb_events', events); }, [events]);
  useEffect(() => { setStorage('bbb_logs', logs); }, [logs]);
  useEffect(() => { setStorage('bbb_plans', plans); }, [plans]);
  useEffect(() => { setStorage('bbb_badges', badgeDefinitions); }, [badgeDefinitions]);
  useEffect(() => { setStorage('bbb_metrics', metrics); }, [metrics]);
  useEffect(() => { setStorage('bbb_dashboard_focus', dashboardFocusText); }, [dashboardFocusText]);

  useEffect(() => {
    if (currentUser && currentUser.athlete_id) {
      const athlete = athletes.find(a => a.id === currentUser.athlete_id);
      if (athlete) setProfile(athlete);
    }
  }, [currentUser?.id, currentUser?.athlete_id, athletes.length]);


  useEffect(() => {
    const repaired = repairAssignedEvents(events, athletes, users);
    if (repaired !== events) setEvents(repaired);
  }, [athletes.length, users.length]);

  useEffect(() => { if (currentUser) loadFromSupabase(); }, [currentUser?.id]);

  async function loadFromSupabase() {
    if (!supabase) return;
    const { data } = await supabase.from('exercises').select('*').eq('is_archived', false).order('name');
    if (data?.length) setExercises(data as Exercise[]);

    try {
      const { data: remoteBadges, error: remoteBadgeError } = await supabase.from('badges').select('*').order('created_at', { ascending:true });
      if (!remoteBadgeError) {
        const mappedBadges = (remoteBadges || []).map(mapRemoteBadgeToLocal).filter(b => !isBadgeTombstoned(b));
        // Supabase is the source of truth for achievements once V3 is enabled.
        // This prevents deleted or deactivated achievements from reappearing from local seed data.
        setBadgeDefinitions(mergeBadgeDefinitions([], mappedBadges));
      } else {
        console.warn('Supabase badge load skipped:', remoteBadgeError);
      }
    } catch (err) {
      console.warn('Supabase badge load skipped:', err);
    }

    try {
      // Ensure the two core profiles exist remotely. This makes trainer-to-athlete assignment reliable across logins/devices.
      await ensureRemoteAthlete(cleanProfiles[0]);
      await ensureRemoteAthlete(cleanProfiles[1]);

      const { data: remoteAthletes, error: athleteLoadError } = await supabase.from('athlete_profiles').select('*');
      if (athleteLoadError) console.warn('Supabase athlete load skipped:', athleteLoadError);
      const activeRemoteAthletes = (remoteAthletes || []).filter(remoteAthleteIsActive);
      const remoteAthleteMap = new Map<string, any>();
      activeRemoteAthletes.forEach((a:any)=>remoteAthleteMap.set(a.id, a));
      const mappedAthletes: AthleteProfile[] = activeRemoteAthletes.map(mapRemoteAthleteToLocal);
      if (mappedAthletes.length) setAthletes(prev => canonicaliseAthletes(mergeUniqueById(prev, mappedAthletes)));

      const cleanStartKey = 'bbb_v2213_fresh_start_done';
      const cleanStartPending = localStorage.getItem(cleanStartKey) === 'pending-remote';
      if (cleanStartPending) {
        const remoteCleared = await clearRemoteDiaryAndWorkouts();
        setEvents([]); setPlans([]); setLogs([]);
        setStorage('bbb_events', []); setStorage('bbb_plans', []); setStorage('bbb_logs', []);
        localStorage.setItem(cleanStartKey, 'done');
        if (!remoteCleared) console.warn('Remote clean start did not fully delete old rows. Old rows will be ignored by the clean-start cutoff, but add the V2.2.13 delete policies in Supabase to enable admin deletion.');
      }

      const { data: remotePlans } = cleanStartPending ? { data: [] as any[] } : await supabase.from('workout_programmes').select('*').order('created_at', { ascending:false });
      const { data: remotePlanExercises } = await supabase.from('workout_programme_exercises').select('*').order('sort_order', { ascending:true });
      const remotePlansRaw = (remotePlans || []).filter(isAfterCleanStart);
      const mappedPlans: WorkoutPlan[] = remotePlansRaw.map((p:any)=>({
        id:p.id,
        remote_id:p.id,
        name:p.name,
        focus:p.focus || '',
        session_type:(p.session_type || 'Gym') as SessionType,
        owner_athlete_id:p.owner_athlete_id || undefined,
        created_by_user_id:p.created_by || undefined,
        is_template:p.is_template !== false,
        exercises:(remotePlanExercises || []).filter((e:any)=>e.programme_id===p.id).map((e:any)=>({
          exercise_id:e.exercise_id,
          name:e.exercise_name || e.exercise_id,
          planned_sets:e.planned_sets || 3,
          planned_reps:e.planned_reps || '8-12',
          planned_weight:e.planned_weight || '',
          notes:e.notes || '',
        }))
      }));
      if (mappedPlans.length) setPlans(prev => mergeUniqueById(prev, mappedPlans));

      const { data: remoteSessions } = cleanStartPending ? { data: [] as any[] } : await supabase.from('training_sessions').select('*').order('session_date', { ascending:true });
      const remoteSessionsRaw = (remoteSessions || []).filter(isAfterCleanStart);
      const mappedEvents: CalendarEvent[] = remoteSessionsRaw.map((e:any)=>{
        const remoteAthlete = remoteAthleteMap.get(e.athlete_id);
        const athleteProfile = remoteAthlete ? mapRemoteAthleteToLocal(remoteAthlete) : undefined;
        return {
          id:e.id,
          remote_id:e.id,
          athlete_id:athleteProfile?.id || e.athlete_id,
          athlete_email:athleteProfile?.email || remoteAthlete?.email || undefined,
          athlete_name:athleteProfile?.name || remoteAthleteDisplayName(remoteAthlete) || undefined,
          workout_plan_id:e.programme_id || undefined,
          remote_plan_id:e.programme_id || undefined,
          date:dateOnly(e.session_date),
          time:normaliseTime(e.start_time),
          title:e.title,
          type:(e.session_type || 'Gym') as SessionType,
          status:(e.status || 'planned') as CalendarEvent['status'],
          class_name:e.class_name || undefined,
        };
      });
      if (mappedEvents.length) setEvents(prev => mergeUniqueById(prev, mappedEvents));

      const { data: remoteLogs } = cleanStartPending ? { data: [] as any[] } : await supabase.from('workout_logs').select('*').order('created_at', { ascending:false });
      const mappedLogs: WorkoutLog[] = (remoteLogs || []).map((l:any)=>({
        id:l.id,
        session_id:l.session_id || undefined,
        date:dateOnly(l.log_date || l.created_at),
        session_type:(l.session_type || 'Gym') as SessionType,
        exercise_id:l.exercise_id || '',
        exercise_name:l.exercise_name || 'Exercise',
        sets:Array.isArray(l.sets) ? l.sets : [],
        reps:l.reps || undefined,
        weight:l.weight || undefined,
        rpe:l.rpe || undefined,
        notes:l.notes || undefined,
        completed:l.completed !== false,
      }));
      if (mappedLogs.length) setLogs(prev => mergeUniqueById(prev, mappedLogs));

      const { data: remoteMetrics } = await supabase.from('athlete_metrics').select('*').order('metric_date', { ascending:true });
      const mappedMetrics: AthleteMetric[] = (remoteMetrics || []).map((m:any)=>({
        id:m.id,
        remote_id:m.id,
        athlete_id:m.athlete_id,
        metric_date:dateOnly(m.metric_date),
        weight_kg:m.weight_kg ? Number(m.weight_kg) : undefined,
        height_cm:m.height_cm ? Number(m.height_cm) : undefined,
        body_fat_percent:m.body_fat_percent ? Number(m.body_fat_percent) : undefined,
        notes:m.notes || undefined,
      }));
      if (mappedMetrics.length) setMetrics(prev => mergeUniqueById(prev, mappedMetrics));

      const { data: settings } = await supabase.from('app_settings').select('*').in('key', ['dashboard_focus_text']);
      const focus = (settings || []).find((r:any)=>r.key==='dashboard_focus_text')?.value;
      if (focus) setDashboardFocusText(focus);
    } catch (err) {
      console.warn('Supabase training sync skipped:', err);
    }
  }

  const visibleEvents = useMemo(() => {
    if (!currentUser) return [];
    return events.filter(e => isEventVisibleForUser(e, currentUser));
  }, [events, currentUser?.id, currentUser?.athlete_id, currentUser?.email]);
  const liveBadges = useMemo(() => buildBadges(logs, visibleEvents, badgeDefinitions), [logs, visibleEvents, badgeDefinitions]);

  async function handleLogout(){ if (supabase) await supabase.auth.signOut(); setCurrentUser(null); localStorage.removeItem('bbb_current_user'); setDrawerOpen(false); }
  function go(p: Page){ setPage(p); setDrawerOpen(false); window.scrollTo({top:0, behavior:'smooth'}); }
  function openSession(event: CalendarEvent){ setActiveSession(event); setPage('session'); setDrawerOpen(false); }

  if (!currentUser) return <LoginScreen users={users} setCurrentUser={setCurrentUser} />;

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(currentUser.role));
  const activeTitle = page === 'session' ? (activeSession?.class_name || activeSession?.type === 'FMA' ? 'Class Session' : 'Complete Workout') : visibleNav.find(n=>n.page===page)?.label || 'Dashboard';

  return <div className="appShell">
    <header className="topbar">
      <button className="iconButton" onClick={()=>setDrawerOpen(true)} aria-label="Open menu"><Menu size={24}/></button>
      <div className="topBrand"><Shield size={22}/><div><b>BlackBeltBootcamp</b><span>Training OS V3.0</span></div></div>
      <div className="topContext"><span>{currentUser.name}</span><em>{titleCase(currentUser.role)}</em></div>
    </header>

    {drawerOpen && <div className="drawerBackdrop" onClick={()=>setDrawerOpen(false)} />}
    <aside className={`drawer ${drawerOpen ? 'open' : ''}`}>
      <div className="drawerHead"><div className="brand"><Shield className="brandIcon"/><div><h1>BlackBeltBootcamp</h1><span>Training OS V3.0</span></div></div><button className="iconButton" onClick={()=>setDrawerOpen(false)}><X size={20}/></button></div>
      <button className="drawerUser drawerUserButton" onClick={()=>go('profile')}><b>{currentUser.name}</b><span>{currentUser.email}</span><em>{titleCase(currentUser.role)} profile · open profile</em></button>
      <nav>{visibleNav.map(n => <button key={n.page} onClick={() => go(n.page)} className={page===n.page?'active':''}>{n.icon}<span>{n.label}</span></button>)}</nav>
      <button className="logoutButton" onClick={handleLogout}><LogOut size={18}/> Sign out</button>
    </aside>

    <main className="pageFrame">
      <section className="pageHeader"><span className="muted">{profile.name} · {profile.gym}</span><h2>{activeTitle}</h2></section>
      {page==='dashboard' && <Dashboard logs={logs} events={visibleEvents} badges={liveBadges} profile={profile} focusText={dashboardFocusText} setPage={go} openSession={openSession}/>} 
      {page==='library' && <ExerciseLibrary exercises={exercises} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} />}
      {page==='import' && <Importer setExercises={setExercises} reloadSupabase={loadFromSupabase} exercises={exercises} />}
      {page==='builder' && <WorkoutBuilder exercises={exercises} plans={plans} setPlans={setPlans} currentUser={currentUser} athletes={athletes} users={users} events={events} setEvents={setEvents} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} />}
      {page==='today' && <Today events={visibleEvents} exercises={exercises} logs={logs} setLogs={setLogs} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} openSession={openSession}/>} 
      {page==='calendar' && <TrainingCalendar events={visibleEvents} allEvents={events} setEvents={setEvents} openSession={openSession} currentUser={currentUser} profile={profile} plans={plans}/>} 
      {page==='session' && <SessionWorkout session={activeSession} setSession={setActiveSession} exercises={exercises} plans={plans} logs={logs} setLogs={setLogs} events={events} setEvents={setEvents} profile={profile} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} onSessionFinished={()=>{ setActiveSession(null); go('dashboard'); }}/>} 
      {page==='fma' && <FmaClasses events={events} setEvents={setEvents} openSession={openSession} profile={profile}/>} 
      {page==='stats' && <Stats logs={logs} events={visibleEvents} profile={profile} metrics={metrics}/>} 
      {page==='badges' && <Badges badges={liveBadges}/>} 
      {page==='profile' && <Profile profile={profile} metrics={metrics} setMetrics={setMetrics} setProfile={async (p)=>{const saved=await saveRemoteProfile(p); setProfile(saved); setAthletes(athletes.map(a=>a.id===p.id? saved : a));}}/>} 
      {page==='admin' && <Admin profile={profile} events={events} setEvents={setEvents} plans={plans} setPlans={setPlans} logs={logs} setLogs={setLogs} exercises={exercises} setExercises={setExercises} users={users} setUsers={setUsers} athletes={athletes} setAthletes={setAthletes} metrics={metrics} setMetrics={setMetrics} dashboardFocusText={dashboardFocusText} setDashboardFocusText={setDashboardFocusText} badgeDefinitions={badgeDefinitions} setBadgeDefinitions={setBadgeDefinitions}/>} 
    </main>
    {video && <VideoModal title={video.title} url={video.url} onClose={()=>setVideo(null)} />}
  </div>;
}

function LoginScreen({setCurrentUser}:{users:AppUser[]; setCurrentUser:(u:AppUser)=>void}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [resetEmail,setResetEmail]=useState('');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  async function login(e: React.FormEvent){
    e.preventDefault(); setStatus(''); setBusy(true);
    try {
      if (!supabase) { setStatus('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify.'); return; }
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) { setStatus(error?.message || 'Unable to sign in.'); return; }
      setCurrentUser(await buildAppUserFromAuthUser(data.user));
    } finally { setBusy(false); }
  }
  async function resetPassword(){
    setStatus('');
    if(!supabase){ setStatus('Supabase is not configured.'); return; }
    const target = (resetEmail || email).trim();
    if(!target){ setStatus('Enter your email first, then press password reset.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: window.location.origin });
    setStatus(error ? error.message : `Password reset email sent to ${target}.`);
  }
  return <main className="loginPage">
    <section className="loginCard">
      <div className="loginBrand"><Shield size={42}/><div><h1>BlackBeltBootcamp</h1><p>Secure cloud training hub for Alex and James Hiles</p></div></div>
      <form onSubmit={login} className="loginForm">
        <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="Enter your Supabase Auth email"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/></label>
        {status && <div className={`status ${status.toLowerCase().includes('unable') || status.toLowerCase().includes('error') ? 'error' : ''}`}>{status}</div>}
        <button className="primary big" type="submit" disabled={!email || !password || busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <div className="passwordResetBox"><label>Password reset email<input value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="Use login email if blank"/></label><button onClick={resetPassword}><KeyRound size={16}/>Send password reset</button></div>
      <p className="muted smallText">V3 uses Supabase Auth. The old local/fallback login system has been removed so the same data follows Alex and James across devices.</p>
    </section>
  </main>
}

function Dashboard({logs,events,badges,profile,focusText,setPage,openSession}:{logs:WorkoutLog[];events:CalendarEvent[];badges:Badge[];profile:AthleteProfile;focusText:string;setPage:(p:Page)=>void;openSession:(e:CalendarEvent)=>void}) {
  const today = todayISO();
  const todaySessions = events.filter(e=>e.date===today).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const next = todaySessions.find(e=>e.status==='planned') || events.find(e=>e.status==='planned');
  const sessionsDone = events.filter(e=>e.status==='completed').length;
  const exercisesDone = logs.filter(l=>l.completed).length;
  const streak = calcStreak(logs, events);
  const weekComplete = Math.round((events.filter(e=>e.status==='completed').length / Math.max(events.length,1))*100);
  const nextBadges = badges.filter(b=>!b.unlocked).sort((a,b)=>(b.progress-a.progress) || ((a.target_value-a.current_count)-(b.target_value-b.current_count))).slice(0,3);
  return <div className="dashboardGrid">
    <section className="heroPanel athleteHero">
      <div>
        <span className="eyebrow">Today's focus</span>
        <h1>{profile.name.split(' ')[0]}, {focusText || 'keep stacking the small wins.'}</h1>
        <p>{profile.goal}</p>
        <div className="heroActions"><button className="primary" onClick={()=> next ? openSession(next) : setPage('today')}><PlayCircle size={18}/>Start next session</button><button onClick={()=>setPage('calendar')}><CalendarDays size={18}/>View week</button></div>
      </div>
      <div className="readinessRing"><b>{weekComplete}%</b><span>Weekly completion</span></div>
    </section>
    <div className="kpiRow dashboardKpis"><Kpi label="Sessions Completed" value={sessionsDone}/><Kpi label="Exercises Completed" value={exercisesDone}/><Kpi label="Training Streak" value={`${streak} days`}/><Kpi label="Today’s Sessions" value={todaySessions.length}/></div>
    <section className="panel"><div className="row between"><h3>Today’s Schedule</h3><button className="miniBtn" onClick={()=>setPage('calendar')}>Open calendar</button></div>{todaySessions.length===0 && <p className="muted">No sessions planned today. Add one from the calendar or FMA classes page.</p>}{todaySessions.map(s=><SessionRow key={s.id} event={s} onClick={()=>openSession(s)}/>)}</section>
    <section className="panel"><h3>Next Achievement</h3>{nextBadges.map(b=><div className="badgeProgress" key={b.id}><span>{b.icon}</span><div><b>{b.name}</b><p>{b.description}</p><div className="progress"><i style={{width:`${b.progress}%`}}/></div></div></div>)}</section>
  </div>
}
function Kpi({label,value}:{label:string;value:string|number}){ return <div className="kpi"><span>{label}</span><b>{value}</b></div> }
function SessionRow({event,onClick}:{event:CalendarEvent; onClick:()=>void}){ return <button className="sessionRow" onClick={onClick}><span className={classNameForType(event.type)}>{event.type}</span><div><b>{event.time || 'Time TBC'} · {event.title}</b><em>{dateOnly(event.date)}</em></div><ChevronRight size={18}/></button> }

function ExerciseLibrary({exercises,onPlay}:{exercises:Exercise[];onPlay:(e:Exercise)=>void}){
  const [q,setQ]=useState(''); const [category,setCategory]=useState('all'); const [body,setBody]=useState('all'); const [muscle,setMuscle]=useState('all');
  const cats=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>e.category).filter(Boolean))).sort()], [exercises]);
  const bodies=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>bodyOf(e)).filter(Boolean))).sort()], [exercises]);
  const muscleOptions=useMemo(()=>['all',...Array.from(new Set(exercises.filter(e=>body==='all'||bodyOf(e)===body).flatMap(e=>[e.target,...(e.secondary_muscles||[])]).filter(Boolean))).sort()], [exercises, body]);
  useEffect(()=>{ if(!muscleOptions.includes(muscle)) setMuscle('all'); }, [body, muscleOptions.join('|')]);
  const filtered=exercises.filter(e=>
    (category==='all'||e.category===category) &&
    (body==='all'||bodyOf(e)===body) &&
    (muscle==='all'||e.target===muscle||(e.secondary_muscles||[]).includes(muscle)) &&
    `${e.name} ${e.exercise_id} ${e.target} ${(e.secondary_muscles||[]).join(' ')} ${bodyOf(e)} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0,150);
  return <section className="panel"><div className="toolbar libraryToolbar"><div className="searchBox"><Search size={18}/><input placeholder="Search exercise, muscle or equipment" value={q} onChange={e=>setQ(e.target.value)}/></div><select value={body} onChange={e=>setBody(e.target.value)}>{bodies.map(c=><option key={c} value={c}>{c==='all'?'All Body Parts':titleCase(c)}</option>)}</select><select value={muscle} onChange={e=>setMuscle(e.target.value)}>{muscleOptions.map(c=><option key={c} value={c}>{c==='all'?'All Muscles / Targets':titleCase(c)}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c} value={c}>{c==='all'?'All Types':titleCase(c)}</option>)}</select></div><div className="exerciseGrid">{filtered.map(e=><ExerciseCard key={e.exercise_id} e={e} onPlay={onPlay}/>)}</div></section>
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

function TrainingCalendar({events,allEvents,setEvents,openSession,currentUser,profile,plans}:{events:CalendarEvent[];allEvents:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;openSession:(e:CalendarEvent)=>void;currentUser:AppUser;profile:AthleteProfile;plans:WorkoutPlan[]}){
  const [weekOffset,setWeekOffset]=useState(0);
  const baseStart = addDays(startOfWeek(), weekOffset*7);
  const visibleWeek = Array.from({length:7}, (_,i)=>addDays(baseStart, i));
  const [newDate,setNewDate]=useState(todayISO()); const [newTime,setNewTime]=useState('18:00'); const [newTitle,setNewTitle]=useState('Training Session'); const [newType,setNewType]=useState<SessionType>('Gym'); const [newPlanId,setNewPlanId]=useState('none');
  async function add(){
    const plan = plans.find(p=>p.id===newPlanId);
    const event: CalendarEvent = {id:crypto.randomUUID(), date:dateOnly(newDate), time:normaliseTime(newTime), title: plan?.name || newTitle, type: plan?.session_type || newType, status:'planned', workout_plan_id: plan?.id, athlete_id: currentUser.athlete_id || profile.id, athlete_email: currentUser.email, athlete_name: currentUser.name};
    const synced = await saveRemoteSession(event, plan, profile);
    setEvents([synced, ...allEvents.filter(e=>e.id!==synced.id && e.remote_id!==synced.remote_id)]);
  }
  function renderWeek(days: Date[], title: string){
    return <div className="weekBlock"><h4>{title}</h4><div className="weekGrid">{days.map(d=>{ const dayEvents=events.filter(e=>dateOnly(e.date)===iso(d)).sort((a,b)=>(normaliseTime(a.time)||'').localeCompare(normaliseTime(b.time)||'')); return <div className="dayColumn" key={iso(d)}><h4>{dayLabel(d)}</h4>{dayEvents.length===0 && <span className="emptyDay">No session</span>}{dayEvents.map(e=><button key={e.id} className={`calendarSession ${e.status}`} onClick={()=>openSession(e)}><span>{e.time}</span><b>{e.title}</b><em>{e.type}</em></button>)}</div>})}</div></div>
  }
  return <div className="calendarPage">
    <section className="panel"><div className="row between calendarControls"><div><h3>Training Calendar</h3><p className="muted">Use the controls to move through past and future weeks. Click any session to open the completion page.</p></div><div className="weekNav"><button onClick={()=>setWeekOffset(weekOffset-1)}><ArrowLeft size={16}/>Previous</button><button onClick={()=>setWeekOffset(0)}><RefreshCw size={16}/>Current</button><button onClick={()=>setWeekOffset(weekOffset+1)}>Next<ArrowRight size={16}/></button></div></div><div className="calendarWeeks">{renderWeek(visibleWeek, weekOffset===0 ? 'Current Week' : `Week ${weekOffset>0?'+':''}${weekOffset}`)}</div></section>
    <section className="panel compact addSessionPanel"><h3>Add Session</h3><p className="muted">Create a diary item for the signed-in profile. Attach a saved workout if you want the session to include editable exercises.</p><div className="formGrid calendarForm"><label>Date<input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}/></label><label>Time<input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><label>Type<select value={newType} onChange={e=>setNewType(e.target.value as SessionType)}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label><label>Saved Workout<select value={newPlanId} onChange={e=>setNewPlanId(e.target.value)}><option value="none">No saved workout</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="fullSpan">Title<input value={newTitle} onChange={e=>setNewTitle(e.target.value)}/></label></div><div className="formActions"><button className="primary" onClick={add}><Plus size={16}/>Add to calendar</button></div></section>
  </div>
}
const sessionTypes: SessionType[] = ['Home','Gym','FMA','MMA','BJJ','Boxing','Kickboxing','Cardio','Mobility','Physio','Recovery','Strength'];

function Today({events,exercises,logs,setLogs,onPlay,openSession}:{events:CalendarEvent[];exercises:Exercise[];logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void;onPlay:(e:Exercise)=>void;openSession:(e:CalendarEvent)=>void}){
  const [date,setDate]=useState(todayISO());
  const sessions=events.filter(e=>dateOnly(e.date)===dateOnly(date)).sort((a,b)=>(normaliseTime(a.time)||'').localeCompare(normaliseTime(b.time)||''));
  return <section className="panel"><div className="row between"><div><h3>Today's Training</h3><p className="muted">Choose a date, open a session, follow the exercises and log completion.</p></div><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>{sessions.length===0 && <p className="muted">No sessions planned for this date.</p>}{sessions.map(e=><SessionRow key={e.id} event={e} onClick={()=>openSession(e)}/>)}</section>
}

function SessionWorkout({session,setSession,exercises,plans,logs,setLogs,events,setEvents,profile,onPlay,onSessionFinished}:{session:CalendarEvent|null; setSession:(s:CalendarEvent|null)=>void; exercises:Exercise[]; plans:WorkoutPlan[]; logs:WorkoutLog[]; setLogs:(l:WorkoutLog[])=>void; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void; profile:AthleteProfile; onPlay:(e:Exercise)=>void; onSessionFinished:()=>void}){
  const fallback: CalendarEvent = session || { id:'adhoc', date:todayISO(), time:'', title:'Ad hoc Workout', type:'Gym', status:'planned' };
  const isClassSession = !!fallback.class_name || fallback.type === 'FMA';
  if (isClassSession) return <ClassSessionCompletion session={fallback} setSession={setSession} events={events} setEvents={setEvents}/>;
  return <ExerciseSessionCompletion session={fallback} setSession={setSession} exercises={exercises} plans={plans} logs={logs} setLogs={setLogs} events={events} setEvents={setEvents} profile={profile} onPlay={onPlay} onSessionFinished={onSessionFinished}/>;
}

function ExerciseSessionCompletion({session,setSession,exercises,plans,logs,setLogs,events,setEvents,profile,onPlay,onSessionFinished}:{session:CalendarEvent; setSession:(s:CalendarEvent|null)=>void; exercises:Exercise[]; plans:WorkoutPlan[]; logs:WorkoutLog[]; setLogs:(l:WorkoutLog[])=>void; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void; profile:AthleteProfile; onPlay:(e:Exercise)=>void; onSessionFinished:()=>void}){
  const plan = plans.find(p=>p.id===session.workout_plan_id);
  const picks = useMemo(()=>getSessionExercises(session, exercises, plans), [session.id, session.workout_plan_id, exercises.length, plans.length]);
  const [date,setDate]=useState(session.date || todayISO());
  const [savedExercises,setSavedExercises]=useState<Set<string>>(new Set());
  function plannedRows(exerciseId:string){
    const planned = plan?.exercises.find(e=>e.exercise_id===exerciseId);
    const count = Math.max(1, Number(planned?.planned_sets || 3));
    return Array.from({length: count}, (_,i)=>({set_number:i+1,reps: planned?.planned_reps || '',weight: planned?.planned_weight || '',completed:false}));
  }
  const [setRows,setSetRows]=useState<Record<string,ExerciseLogSet[]>>(()=>Object.fromEntries(picks.map(e=>[e.exercise_id,plannedRows(e.exercise_id)])));
  useEffect(()=>{ setSetRows(Object.fromEntries(picks.map(e=>[e.exercise_id,plannedRows(e.exercise_id)]))); setSavedExercises(new Set()); }, [picks.map(p=>p.exercise_id).join('|'), plan?.id]);
  function updateSet(exId:string, idx:number, field:keyof ExerciseLogSet, value:any){ setSetRows(prev=>({...prev,[exId]:(prev[exId]||[]).map((s,i)=>i===idx?{...s,[field]:value}:s)})); }
  async function completeExercise(e:Exercise, quick=false){
    const sets = quick ? [] : (setRows[e.exercise_id] || []);
    const entry: WorkoutLog = { id:crypto.randomUUID(), session_id:session.id, date, session_type:session.type, exercise_id:e.exercise_id, exercise_name:titleCase(e.name), sets, completed:true, reps: sets.map(s=>s.reps).filter(Boolean).join(', '), weight: sets.map(s=>s.weight).filter(Boolean).join(', ') };
    const saved = await saveRemoteWorkoutLog(entry, profile, session);
    setLogs([saved,...logs]);
    setSavedExercises(prev => new Set([...Array.from(prev), e.exercise_id]));
  }
  async function completeSession(){
    const updatedEvents = events.map(e=>e.id===session.id?{...e,date,status:'completed' as const}:e);
    setEvents(updatedEvents);
    await updateRemoteSessionStatus(session, 'completed', date, session.time);
    setSession(null);
    onSessionFinished();
  }
  return <section className="panel workoutCompletionPanel"><div className="sessionHeader"><div><span className={classNameForType(session.type)}>{session.type}</span><h3>{session.time ? `${session.time} · ` : ''}{session.title}</h3><p className="muted">{plan ? `Assigned programme: ${plan.name}. ` : ''}Follow the programme for the selected date. Record sets, reps and weight where useful, or mark each exercise complete without logging numbers.</p></div><label>Session Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="workoutList">{picks.map(e=>{
    const saved = savedExercises.has(e.exercise_id);
    return <div className={`workoutExercise ${saved ? 'exerciseCollapsed' : ''}`} key={e.exercise_id}>{saved ? <div className="row between savedExerciseSummary"><div><h3>{titleCase(e.name)}</h3><p><CheckCircle2 size={16}/>Exercise log saved</p></div><button onClick={()=>setSavedExercises(prev=>{ const next=new Set(prev); next.delete(e.exercise_id); return next; })}>Reopen</button></div> : <><div className="row between"><div><h3>{titleCase(e.name)}</h3><p>{titleCase(bodyOf(e))} · {titleCase(e.target)} · {titleCase(e.equipment)}</p></div><button onClick={()=>onPlay(e)} disabled={!safeVideo(e)}><Video size={16}/>Watch Demo</button></div><InstructionsBlock exercise={e}/><div className="setTable"><div className="setHead"><span>Set</span><span>Reps</span><span>Weight</span><span>Done</span></div>{(setRows[e.exercise_id] || []).map((s,idx)=><div className="setRow" key={s.set_number}><span>{s.set_number}</span><input value={s.reps||''} onChange={ev=>updateSet(e.exercise_id,idx,'reps',ev.target.value)} placeholder="8-12"/><input value={s.weight||''} onChange={ev=>updateSet(e.exercise_id,idx,'weight',ev.target.value)} placeholder="kg"/><input type="checkbox" checked={!!s.completed} onChange={ev=>updateSet(e.exercise_id,idx,'completed',ev.target.checked)}/></div>)}</div><div className="row actions"><button className="primary" onClick={()=>completeExercise(e)}><CheckCircle2 size={16}/>Save exercise log</button><button onClick={()=>completeExercise(e,true)}>Mark complete only</button></div></> }</div>
  })}</div><button className="primary big" onClick={completeSession}><Trophy size={18}/>Mark session completed</button></section>
}

function ClassSessionCompletion({session,setSession,events,setEvents}:{session:CalendarEvent; setSession:(s:CalendarEvent|null)=>void; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void}){
  const [date,setDate]=useState(session.date || todayISO());
  const [time,setTime]=useState(session.time || '19:00');
  async function updateStatus(status:'completed'|'missed'){
    const updated = events.map(e=>e.id===session.id?{...e,date:dateOnly(date),time:normaliseTime(time),status}:e);
    setEvents(updated);
    await updateRemoteSessionStatus(session, status, date, time);
    setSession({...session,date:dateOnly(date),time:normaliseTime(time),status});
  }
  return <section className="panel classCompletionPanel"><div className="classHero"><div><span className={classNameForType(session.type)}>{session.class_name ? 'FMA Class' : session.type}</span><h3>{session.class_name || session.title}</h3><p className="muted">This is a class session. It tracks attendance and calendar completion only. There are no individual exercise logs, sets, reps or weight entries for FMA classes.</p></div><div className={`classStatus ${session.status}`}><b>{titleCase(session.status)}</b><span>Attendance status</span></div></div><div className="grid two"><label>Class Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Class Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="classActions"><button className="primary big" onClick={()=>updateStatus('completed')}><CheckCircle2 size={18}/>Mark Class Attended</button><button className="big" onClick={()=>updateStatus('missed')}><X size={18}/>Mark Class Missed</button></div><div className="classNote"><b>Class focus</b><p>{fmaClasses.find(c=>c.name===session.class_name)?.focus || 'FMA academy session added to the training calendar.'}</p></div></section>
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

function QuickCompletion({exercises,logs,setLogs,onPlay}:{exercises:Exercise[];logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void;onPlay:(e:Exercise)=>void}){ const picks=exercises.slice(0,3); return <div className="quickBox"><h3>Quick Exercise Completion</h3><p className="muted">Use this when James completes a standalone drill outside a planned session.</p><div className="grid three">{picks.map(e=><div className="miniExercise" key={e.exercise_id}><b>{titleCase(e.name)}</b><span>{titleCase(bodyOf(e))}</span><div className="row actions"><button onClick={()=>onPlay(e)}>Demo</button><button className="primary" onClick={()=>setLogs([{id:crypto.randomUUID(),date:todayISO(),session_type:'Home',exercise_id:e.exercise_id,exercise_name:titleCase(e.name),sets:[],completed:true},...logs])}>Complete</button></div></div>)}</div></div> }

function WorkoutBuilder({exercises,plans,setPlans,currentUser,athletes,users,events,setEvents,onPlay}:{exercises:Exercise[];plans:WorkoutPlan[];setPlans:(p:WorkoutPlan[])=>void;currentUser:AppUser;athletes:AthleteProfile[];users:AppUser[];events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;onPlay:(e:Exercise)=>void}){
  const bodies=useMemo(()=>Array.from(new Set(exercises.map(e=>bodyOf(e)).filter(Boolean))).sort(),[exercises]);
  const [body,setBody]=useState(bodies[0] || 'waist');
  const [q,setQ]=useState('');
  const [name,setName]=useState('James Strength Session');
  const [focus,setFocus]=useState('MMA strength and athletic development');
  const [sessionType,setSessionType]=useState<SessionType>('Gym');
  const [selected,setSelected]=useState<ProgrammeExercise[]>([]);
  const [editingPlanId,setEditingPlanId]=useState('');
  const [scheduleDate,setScheduleDate]=useState(todayISO());
  const [scheduleTime,setScheduleTime]=useState('18:00');
  const [builderStatus,setBuilderStatus]=useState('');
  const selfProfile = profileForUser(currentUser, athletes);
  const list=exercises.filter(e=>bodyOf(e)===body && `${e.name} ${e.target} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())).slice(0,80);
  function addExercise(e: Exercise){
    setSelected([...selected,{exercise_id:e.exercise_id,name:titleCase(e.name),planned_sets:3,planned_reps:'8-12',planned_weight:''}]);
  }
  function updateSelected(index:number, field:keyof ProgrammeExercise, value:any){
    setSelected(selected.map((item,i)=>i===index?{...item,[field]: field==='planned_sets' ? Number(value) : value}:item));
  }
  function moveExercise(index:number, direction:-1|1){
    const next=[...selected]; const target=index+direction;
    if(target<0 || target>=next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
  }
  function previewExercise(ex: ProgrammeExercise){
    const detailed = exercises.find(e=>e.exercise_id===ex.exercise_id);
    if (detailed) onPlay(detailed);
  }
  function resetDraft(){ setEditingPlanId(''); setName('James Strength Session'); setFocus('MMA strength and athletic development'); setSessionType('Gym'); setSelected([]); }
  async function savePlan(){
    if(!selected.length){ setBuilderStatus('Select at least one exercise before saving.'); return null; }
    const plan: WorkoutPlan={id:editingPlanId || crypto.randomUUID(),name,focus,session_type:sessionType,exercises:selected,created_by_user_id:currentUser.id,owner_athlete_id: currentUser.role==='athlete' ? (currentUser.athlete_id || selfProfile.id) : undefined,is_template: currentUser.role!=='athlete'};
    const nextPlans = editingPlanId ? plans.map(p=>p.id===editingPlanId?{...p,...plan, remote_id:(p as any).remote_id}:p) : [plan,...plans];
    setPlans(nextPlans);
    setStorage('bbb_plans', nextPlans);
    const remoteId = await saveRemoteProgramme(plan);
    const syncedPlan = remoteId ? {...plan, remote_id: remoteId} : plan;
    const syncedNext = editingPlanId ? nextPlans.map(p=>p.id===plan.id?{...p,...syncedPlan}:p) : nextPlans.map(p=>p.id===plan.id?syncedPlan:p);
    setPlans(syncedNext); setStorage('bbb_plans', syncedNext);
    setBuilderStatus(editingPlanId ? `${name} has been updated.` : `${name} has been saved.`);
    if(!editingPlanId) setEditingPlanId(plan.id);
    return syncedPlan;
  }
  function editPlan(plan: WorkoutPlan){ setEditingPlanId(plan.id); setName(plan.name); setFocus(plan.focus || ''); setSessionType(plan.session_type || 'Gym'); setSelected(plan.exercises || []); setBuilderStatus(`Editing ${plan.name}.`); window.scrollTo({top:0, behavior:'smooth'}); }
  function deletePlan(planId:string){ const next=plans.filter(p=>p.id!==planId); setPlans(next); setStorage('bbb_plans', next); if(editingPlanId===planId) resetDraft(); }
  const assignedPlanIds = new Set(events.filter(e=>isEventVisibleForUser(e, currentUser)).flatMap(e=>[e.workout_plan_id, e.remote_plan_id]).filter(Boolean) as string[]);
  const visibleSavedPlans = currentUser.role==='athlete' ? plans.filter(p=>p.owner_athlete_id===currentUser.athlete_id || assignedPlanIds.has(p.id) || (!!p.remote_id && assignedPlanIds.has(p.remote_id))) : plans;
  function createProfileCopy(plan: WorkoutPlan){
    const copy: WorkoutPlan = { ...plan, id:crypto.randomUUID(), remote_id:undefined, name:`${plan.name} - ${currentUser.name} copy`, owner_athlete_id: currentUser.athlete_id || selfProfile.id, created_by_user_id: currentUser.id, is_template:false, exercises:[...(plan.exercises||[])] };
    setPlans([copy, ...plans]); setStorage('bbb_plans', [copy, ...plans]); editPlan(copy);
  }
  async function addToMyCalendar(plan: WorkoutPlan){
    const assigned = resolveAssignmentProfile(selfProfile, users, athletes);
    const event: CalendarEvent = { id:crypto.randomUUID(), athlete_id:assigned.id, athlete_email:assigned.email || currentUser.email, athlete_name:assigned.name || currentUser.name, assigned_by_user_id:currentUser.id, workout_plan_id:plan.id, date:dateOnly(scheduleDate), time:normaliseTime(scheduleTime), title:plan.name, type:plan.session_type || 'Gym', status:'planned' };
    const remoteSynced = await saveRemoteSession(event, plan, selfProfile);
    const next=[remoteSynced, ...events.filter(e=>e.id!==remoteSynced.id)];
    setEvents(next);
    setStorage('bbb_events', next);
    setBuilderStatus(`${plan.name} has been added to ${assigned.name}'s calendar on ${dateOnly(scheduleDate)} at ${normaliseTime(scheduleTime)}.`);
  }
  return <section className="panel builderPage"><div><h3>Workout Builder</h3><p className="muted">Select a body part first, build a focused session, then save it. You can edit saved workouts or add them directly to your own calendar.</p></div><div className="grid three"><label>Workout Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Training Focus<input value={focus} onChange={e=>setFocus(e.target.value)}/></label><label>Session Type<select value={sessionType} onChange={e=>setSessionType(e.target.value as SessionType)}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label></div><div className="builderLayout"><div><h4>1. Body Part</h4><div className="bodyList">{bodies.map(b=><button className={`listBtn ${b===body?'activeBody':''}`} onClick={()=>setBody(b)} key={b}><span>{titleCase(b)}</span><span>{exercises.filter(e=>bodyOf(e)===b).length}</span></button>)}</div></div><div><h4>2. Choose Exercises For {titleCase(body)}</h4><div className="searchBox"><Search size={16}/><input placeholder={`Search ${titleCase(body)} exercises`} value={q} onChange={e=>setQ(e.target.value)}/></div><div className="selectList">{list.map(e=><button className="listBtn" key={e.exercise_id} onClick={()=>addExercise(e)}><span>+ {titleCase(e.name)}</span><small>{titleCase(e.target)}</small></button>)}</div></div><div className="builderPlan"><div className="row between"><h4>{editingPlanId ? 'Editing Workout' : 'Draft Workout'}</h4><button className="miniBtn" onClick={savePlan} disabled={!selected.length}><Save size={16}/>{editingPlanId ? 'Update' : 'Save'}</button></div>{selected.length===0 && <p className="muted">Select exercises from the list.</p>}{selected.map((e,i)=><div className="preview editableExercise" key={`${e.exercise_id}-${i}`}><b>{i+1}. {e.name}</b><div className="miniGrid"><label>Sets<input type="number" value={e.planned_sets || 3} onChange={ev=>updateSelected(i,'planned_sets',ev.target.value)}/></label><label>Reps<input value={e.planned_reps || ''} onChange={ev=>updateSelected(i,'planned_reps',ev.target.value)}/></label><label>Weight<input value={e.planned_weight || ''} onChange={ev=>updateSelected(i,'planned_weight',ev.target.value)}/></label></div><div className="row actions"><button className="miniBtn" onClick={()=>previewExercise(e)}><Video size={14}/>Demo</button><button className="miniBtn" onClick={()=>moveExercise(i,-1)} disabled={i===0}>Up</button><button className="miniBtn" onClick={()=>moveExercise(i,1)} disabled={i===selected.length-1}>Down</button><button className="miniBtn dangerBtn" onClick={()=>setSelected(selected.filter((_,idx)=>idx!==i))}>Remove</button></div></div>)}{editingPlanId && <button onClick={resetDraft}>Start New Workout</button>}</div></div>{builderStatus && <div className="status">{builderStatus}</div>}<section className="panel inner"><h3>Saved Workouts</h3><p className="muted">Open any saved workout to view, edit, or add it to your own calendar.</p><div className="grid two scheduleSelf"><label>Session Date<input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)}/></label><label>Session Time<input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}/></label></div>{visibleSavedPlans.length===0 ? <p className="muted">No saved programmes available for this profile yet.</p> : visibleSavedPlans.map(p=><div className="preview savedWorkout" key={p.id}><b>{p.name}</b><span>{p.focus}</span><em>{p.exercises.length} exercises · {p.session_type || 'Gym'}</em><div className="row actions"><button onClick={()=>editPlan(p)}>View / Edit</button>{currentUser.role==='athlete' && <button onClick={()=>createProfileCopy(p)}>Make My Copy</button>}<button className="primary" onClick={()=>addToMyCalendar(p)}><CalendarDays size={16}/>Add to My Calendar</button><button onClick={()=>deletePlan(p.id)}>Delete</button></div></div>)}</section></section>
}

function FmaClasses({events,setEvents,openSession,profile}:{events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;openSession:(e:CalendarEvent)=>void;profile:AthleteProfile}){
  const [classOptions,setClassOptions]=useState(() => storage('bbb_fma_classes', fmaClasses));
  const [selectedName,setSelectedName]=useState(classOptions[0]?.name || 'Advanced MMA');
  const selected = classOptions.find(c=>c.name===selectedName) || classOptions[0] || fmaClasses[0];
  const [date,setDate]=useState(todayISO()); const [time,setTime]=useState('19:00');
  const [newClassName,setNewClassName]=useState(''); const [newClassFocus,setNewClassFocus]=useState('');
  useEffect(()=>{ setStorage('bbb_fma_classes', classOptions); }, [classOptions]);
  useEffect(()=>{ if(!supabase) return; supabase.from('fma_classes').select('*').eq('is_active', true).then(({data})=>{ if(data?.length){ const remote=data.map((c:any)=>({name:c.class_name, type:(c.class_type||'FMA') as SessionType, focus:c.focus||'Class session.'})); setClassOptions(remote); } }); }, []);
  async function add(){ const event={id:crypto.randomUUID(),date:dateOnly(date),time:normaliseTime(time),title:`FMA ${selected.name}`,type:'FMA' as SessionType,status:'planned' as const,class_name:selected.name}; const synced = await saveRemoteSession(event, undefined, profile); setEvents([synced,...events]); }
  async function addClassType(){
    const name = newClassName.trim();
    const focus = newClassFocus.trim() || 'Class session.';
    if(!name) return;
    const newClass = { name, type:'FMA' as SessionType, focus };
    const updated = [...classOptions.filter(c=>c.name.toLowerCase()!==name.toLowerCase()), newClass];
    setClassOptions(updated); if(supabase) await supabase.from('fma_classes').insert({class_name:name,class_type:'FMA',focus}); setSelectedName(name); setNewClassName(''); setNewClassFocus('');
  }
  return <div className="fmaLayout"><section className="panel"><h3>FMA Chester Classes</h3><p className="muted">Select a class, choose a date and time, then add it to James’s calendar as a class session. Class sessions track attendance only — no sets, reps or exercise log required.</p><div className="classList">{classOptions.map(c=><button className={selected?.name===c.name?'selected':''} onClick={()=>setSelectedName(c.name)} key={c.name}><b>{c.name}</b><span>{c.focus}</span></button>)}</div><div className="panel inner newClassPanel"><h3>Add New Class Type</h3><p className="muted">Create additional class types for the FMA list. These are still class sessions and do not require sets, reps or exercise logs.</p><div className="formGrid two"><label>Class Name<input value={newClassName} onChange={e=>setNewClassName(e.target.value)} placeholder="e.g. Wrestling"/></label><label>Class Description<input value={newClassFocus} onChange={e=>setNewClassFocus(e.target.value)} placeholder="Short class focus"/></label></div><div className="formActions"><button onClick={addClassType} disabled={!newClassName.trim()}><Plus size={16}/>Add class type</button></div></div></section><section className="panel fmaSchedulePanel"><h3>Add {selected.name}</h3><p>{selected.focus}</p><div className="formGrid two"><label>Class Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Class Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="formActions"><button className="primary big" onClick={add}><CalendarDays size={18}/>Add class to calendar</button></div><h3>Upcoming FMA Sessions</h3>{events.filter(e=>e.type==='FMA').map(e=><SessionRow key={e.id} event={e} onClick={()=>openSession(e)}/>)}</section></div>
}

function Stats({logs,events,profile,metrics}:{logs:WorkoutLog[];events:CalendarEvent[];profile:AthleteProfile;metrics:AthleteMetric[]}){
  const weightUnit = getWeightUnit(profile);
  const completedSessions=events.filter(e=>e.status==='completed').length; const completedExercises=logs.filter(l=>l.completed).length; const streak=calcStreak(logs,events);
  const byType=sessionTypes.map(t=>({type:t,count:events.filter(e=>e.status==='completed'&&e.type===t).length})).filter(x=>x.count>0);
  const weekly=last14Days().map(d=>({date:d.slice(5),sessions:events.filter(e=>e.status==='completed'&&dateOnly(e.date)===d).length,exercises:logs.filter(l=>dateOnly(l.date)===d).length}));
  const athleteMetrics = metrics.filter(m=>m.athlete_id===profile.remote_id || m.athlete_id===profile.id).sort((a,b)=>dateOnly(a.metric_date).localeCompare(dateOnly(b.metric_date)));
  const weightTrend = athleteMetrics.map(m=>({date:dateOnly(m.metric_date).slice(5),weight: weightUnit === 'st' ? kgToStoneDecimal(m.weight_kg) : Number(m.weight_kg || 0)})).filter(m=>m.weight>0);
  const missed=events.filter(e=>e.status==='missed').length;
  const skippedSets=logs.flatMap(l=>l.sets||[]).filter(s=>s.completed===false).length;
  return <div><div className="kpiRow statsKpis"><Kpi label="Sessions Completed" value={completedSessions}/><Kpi label="Exercises Completed" value={completedExercises}/><Kpi label="Workout Streak" value={`${streak} days`}/><Kpi label="Missed Sessions" value={missed}/><Kpi label="Skipped Sets" value={skippedSets}/><Kpi label="Current Weight" value={formatWeight(profile.weight_kg, weightUnit)}/></div><section className="panel"><h3>Training Volume</h3><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Bar dataKey="sessions"/><Bar dataKey="exercises"/></BarChart></ResponsiveContainer></div></section>{weightTrend.length>0 && <section className="panel"><h3>Weight Trend ({weightUnit === 'st' ? 'stone' : 'kg'})</h3><p className="muted">Tracks logged body weight changes over time using your profile preference.</p><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={weightTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="weight"/></LineChart></ResponsiveContainer></div></section>}<section className="panel"><h3>This Week By Session Type</h3><div className="typeCountGrid">{byType.length===0?<p className="muted">No completed sessions yet.</p>:byType.map(t=><div className="typeCount" key={t.type}><span>{t.type}</span><b>{t.count}</b></div>)}</div></section></div>
}
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
function Profile({profile,metrics,setMetrics,setProfile}:{profile:AthleteProfile;metrics:AthleteMetric[];setMetrics:(m:AthleteMetric[])=>void;setProfile:(p:AthleteProfile)=>void}){
  const [weightUnit,setWeightUnit]=useState<WeightUnit>(getWeightUnit(profile));
  const initialParts = kgToStLb(profile.weight_kg);
  const [weight,setWeight]=useState(String(profile.weight_kg || ''));
  const [weightSt,setWeightSt]=useState(String(initialParts.st || ''));
  const [weightLb,setWeightLb]=useState(String(initialParts.lb || ''));
  const [weightNotes,setWeightNotes]=useState('');
  function upd(k:keyof AthleteProfile,v:any){ setProfile({...profile,[k]:v}); }
  function setPreferredUnit(unit: WeightUnit){ setWeightUnit(unit); setStorage('bbb_weight_unit', unit); setProfile({...profile, weight_unit:unit}); }
  function updateKgWeight(v:string){ setWeight(v); upd('weight_kg', Number(v)); }
  function updateStoneWeight(nextSt=weightSt,nextLb=weightLb){ setWeightSt(nextSt); setWeightLb(nextLb); const kg = stLbToKg(nextSt, nextLb); upd('weight_kg', kg); setWeight(String(kg)); }
  const athleteMetrics = metrics.filter(m=>m.athlete_id===profile.remote_id || m.athlete_id===profile.id).sort((a,b)=>dateOnly(a.metric_date).localeCompare(dateOnly(b.metric_date)));
  async function logWeight(){
    const weightKg = weightUnit === 'st' ? stLbToKg(weightSt, weightLb) : Number(weight);
    const metric: AthleteMetric = { id:crypto.randomUUID(), athlete_id: profile.remote_id || profile.id, metric_date: todayISO(), weight_kg: weightKg, height_cm: profile.height_cm, notes: weightNotes };
    const saved = await saveRemoteMetric(metric);
    setMetrics([...metrics, saved]);
    setProfile({...profile, weight_kg: weightKg, weight_unit: weightUnit});
    setWeight(String(weightKg));
    setWeightNotes('');
  }
  return <section className="panel profilePage"><h3>Athlete Profile</h3><p className="muted">These details personalise targets, competition planning and progress tracking.</p><div className="grid three"><Field label="Athlete Name" help="Shown throughout the app." value={profile.name} onChange={v=>upd('name',v)}/><Field label="Age" help="Current age in years." value={profile.age||''} type="number" onChange={v=>upd('age',Number(v))}/><Field label="Gym / Academy" help="Primary training location." value={profile.gym||''} onChange={v=>upd('gym',v)}/><Field label="Height (cm)" help="Used for weight trend context." value={profile.height_cm||''} type="number" onChange={v=>upd('height_cm',Number(v))}/><label className="fieldLabel">Weight Preference<span>Choose how body weight is entered and displayed.</span><select value={weightUnit} onChange={e=>setPreferredUnit(e.target.value as WeightUnit)}><option value="kg">Kilograms (kg)</option><option value="st">Stone / pounds (st, lb)</option></select></label>{weightUnit==='kg' ? <Field label="Current Weight (kg)" help="Snapshot weight. Use the log section below to track changes over time." value={profile.weight_kg||''} type="number" onChange={updateKgWeight}/> : <label className="fieldLabel">Current Weight (st/lb)<span>Enter stones and pounds. The app stores the converted kg value for syncing.</span><div className="miniGrid"><input type="number" value={weightSt} onChange={e=>updateStoneWeight(e.target.value, weightLb)} placeholder="st"/><input type="number" value={weightLb} onChange={e=>updateStoneWeight(weightSt, e.target.value)} placeholder="lb"/></div></label>}<Field label="Competition Weight (kg)" help="Target fight or competition weight." value={profile.competition_weight_kg||''} type="number" onChange={v=>upd('competition_weight_kg',Number(v))}/><Field label="Belt Rank" help="Current martial arts rank." value={profile.belt_rank||''} onChange={v=>upd('belt_rank',v)}/><Field label="Profile Photo URL" help="Optional image link for later use." value={profile.profile_photo_url||''} onChange={v=>upd('profile_photo_url',v)}/></div><label className="fullLabel">Athlete Goal<span>Main training objective.</span><textarea value={profile.goal||''} onChange={e=>upd('goal',e.target.value)}/></label><section className="panel inner weightLogger"><h3>Weight Tracker</h3><p className="muted">Log changes in body weight so progress stats show trends rather than only snapshots.</p><div className="grid three">{weightUnit==='kg' ? <label>Weight today (kg)<input type="number" value={weight} onChange={e=>setWeight(e.target.value)}/></label> : <><label>Weight today (st)<input type="number" value={weightSt} onChange={e=>setWeightSt(e.target.value)}/></label><label>Weight today (lb)<input type="number" value={weightLb} onChange={e=>setWeightLb(e.target.value)}/></label></>}<label className="fullSpan">Notes<input value={weightNotes} onChange={e=>setWeightNotes(e.target.value)} placeholder="Optional note"/></label></div><div className="formActions"><button className="primary" onClick={logWeight} disabled={weightUnit==='kg' ? !weight : (!weightSt && !weightLb)}><Save size={16}/>Log weight</button></div>{athleteMetrics.length>0 && <div className="miniHistory">{athleteMetrics.slice(-6).reverse().map(m=><div className="preview" key={m.id}><b>{dateOnly(m.metric_date)} · {formatWeight(m.weight_kg, weightUnit)}</b><span>{m.notes || 'Weight logged'}</span></div>)}</div>}</section></section>
}
function Field({label,help,value,onChange,type='text'}:{label:string;help:string;value:any;type?:string;onChange:(v:string)=>void}){ return <label className="fieldLabel">{label}<span>{help}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label> }

function Admin({profile,events,setEvents,plans,setPlans,logs,setLogs,exercises,setExercises,users,setUsers,athletes,setAthletes,metrics,setMetrics,dashboardFocusText,setDashboardFocusText,badgeDefinitions,setBadgeDefinitions}:{profile:AthleteProfile;events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;plans:WorkoutPlan[];setPlans:(p:WorkoutPlan[])=>void;logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void;exercises:Exercise[];setExercises:(e:Exercise[])=>void;users:AppUser[];setUsers:(u:AppUser[])=>void;athletes:AthleteProfile[];setAthletes:(a:AthleteProfile[])=>void;metrics:AthleteMetric[];setMetrics:(m:AthleteMetric[])=>void;dashboardFocusText:string;setDashboardFocusText:(v:string)=>void;badgeDefinitions:BadgeDefinition[];setBadgeDefinitions:(b:BadgeDefinition[])=>void}){
  const tabs = [
    ['overview','Overview'],['assignment','Assign Workouts'],['athlete','Athlete Review'],['workouts','Saved Workouts'],['achievements','Achievements'],['content','Content'],['maintenance','Maintenance']
  ] as const;
  const [tab,setTab]=useState<typeof tabs[number][0]>('overview');
  return <div className="adminConsole"><section className="panel"><h3>Admin Console</h3><p className="muted">Cloud-synced admin tools. Use the menu below to keep each admin area clean and manageable.</p><div className="adminTabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div><div className="grid three"><Kpi label="Athletes" value={athletes.length}/><Kpi label="Diary Items" value={events.length}/><Kpi label="Saved Workouts" value={plans.length}/></div></section>{tab==='overview' && <AdminFocusManager value={dashboardFocusText} setValue={setDashboardFocusText}/>} {tab==='assignment' && <WorkoutAssignment plans={plans} athletes={athletes} users={users} events={events} setEvents={setEvents}/>} {tab==='athlete' && <><AdminAthleteProfile events={events} logs={logs} metrics={metrics} athletes={athletes} users={users}/><AdminTrainingDiary events={events} setEvents={setEvents} athletes={athletes} users={users}/><AdminWorkoutReview events={events} logs={logs} athletes={athletes} users={users}/></>} {tab==='workouts' && <AdminWorkoutManager plans={plans} setPlans={setPlans}/>} {tab==='achievements' && <AchievementManager badges={badgeDefinitions} setBadges={setBadgeDefinitions}/>} {tab==='content' && <><AthleteCreator users={users} setUsers={setUsers} athletes={athletes} setAthletes={setAthletes}/><ManualExercise setExercises={setExercises} exercises={exercises}/></>} {tab==='maintenance' && <AdminResetControls events={events} setEvents={setEvents} plans={plans} setPlans={setPlans} logs={logs} setLogs={setLogs}/>}</div>
}

function AdminFocusManager({value,setValue}:{value:string;setValue:(v:string)=>void}){
  const [draft,setDraft]=useState(value); const [status,setStatus]=useState('');
  async function save(){ setValue(draft); setStorage('bbb_dashboard_focus', draft); await saveRemoteSetting('dashboard_focus_text', draft); setStatus('Dashboard focus text saved. It will sync to other devices.'); }
  return <section className="panel"><h3>Dashboard Focus Text</h3><p className="muted">Change the text in the Today’s Focus box on the athlete dashboard without redeploying.</p><label>Focus Message<textarea value={draft} onChange={e=>setDraft(e.target.value)}/></label><div className="formActions"><button className="primary" onClick={save}><Save size={16}/>Save focus text</button></div>{status && <div className="status">{status}</div>}</section>
}

function AdminAthleteProfile({events,logs,metrics,athletes,users}:{events:CalendarEvent[];logs:WorkoutLog[];metrics:AthleteMetric[];athletes:AthleteProfile[];users:AppUser[]}){
  const opts=getAthleteOptions(athletes); const [athleteId,setAthleteId]=useState((opts.find(a=>normalise(a.name)==='james hiles')||opts[0])?.id||'');
  const athlete=opts.find(a=>a.id===athleteId)||opts[0];
  const diary=athlete?events.filter(e=>eventMatchesAthlete(e,athlete,users)):[]; const completed=diary.filter(e=>e.status==='completed'); const missed=diary.filter(e=>e.status==='missed');
  const linkedUser=athlete?findLinkedAthleteUser(athlete,users):undefined; const athleteLogs=logs.filter(l=>!l.session_id || diary.some(e=>e.id===l.session_id || e.remote_id===l.session_id));
  const athleteMetrics=athlete?metrics.filter(m=>m.athlete_id===athlete.id || m.athlete_id===athlete.remote_id):[];
  return <section className="panel"><div className="row between"><div><h3>Athlete Profile Review</h3><p className="muted">Consolidated athlete view so admin can review one athlete without mixing in other users.</p></div><label>View Athlete<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{opts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>{athlete && <><div className="grid three"><Kpi label="Profile" value={athlete.name}/><Kpi label="Completed" value={completed.length}/><Kpi label="Missed" value={missed.length}/><Kpi label="Exercises Logged" value={athleteLogs.length}/><Kpi label="Current Weight" value={formatWeight(athlete.weight_kg, getWeightUnit(athlete))}/><Kpi label="Login Email" value={linkedUser?.email||athlete.email||'—'}/></div><div className="preview"><b>{athlete.gym || 'No gym set'}</b><span>{athlete.goal || 'No goal set'}</span><em>{athlete.belt_rank || 'No rank set'} · Target {athlete.competition_weight_kg || '—'}kg</em></div>{athleteMetrics.length>0 && <div className="preview"><b>Weight History</b><span>{athleteMetrics.slice(-5).map(m=>`${dateOnly(m.metric_date)}: ${formatWeight(m.weight_kg, getWeightUnit(athlete))}`).join(' · ')}</span></div>}</>}</section>
}

function AdminWorkoutReview({events,logs,athletes,users}:{events:CalendarEvent[];logs:WorkoutLog[];athletes:AthleteProfile[];users:AppUser[]}){
  const opts=getAthleteOptions(athletes); const [athleteId,setAthleteId]=useState((opts.find(a=>normalise(a.name)==='james hiles')||opts[0])?.id||''); const athlete=opts.find(a=>a.id===athleteId)||opts[0];
  const diary=athlete?events.filter(e=>eventMatchesAthlete(e,athlete,users)).sort((a,b)=>`${b.date} ${b.time||''}`.localeCompare(`${a.date} ${a.time||''}`)):[];
  return <section className="panel"><div className="row between"><div><h3>Workout Results Review</h3><p className="muted">Review completed exercises, reps, weights, skipped sets and missed sessions.</p></div><label>Athlete<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{opts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>{diary.length===0?<p className="status">No diary items for this athlete.</p>:diary.slice(0,20).map(e=>{ const sessionLogs=logs.filter(l=>l.session_id===e.id || l.session_id===e.remote_id); const skipped=sessionLogs.flatMap(l=>l.sets||[]).filter(s=>s.completed===false).length; return <div className="preview reviewCard" key={e.id}><b>{dateOnly(e.date)} · {e.title}</b><span>{e.type} · {titleCase(e.status)} · {normaliseTime(e.time)||'Time TBC'}</span><em>{sessionLogs.length} exercises logged · {skipped} skipped sets</em>{sessionLogs.map(l=><div className="setReview" key={l.id}><strong>{l.exercise_name}</strong><span>{(l.sets||[]).length ? (l.sets||[]).map(s=>`Set ${s.set_number}: ${s.reps||'—'} reps @ ${s.weight||'—'} ${s.completed===false?'(skipped)':''}`).join(' | ') : 'Marked complete only'}</span></div>)}</div>})}</section>
}

function AdminResetControls({events,setEvents,plans,setPlans,logs,setLogs}:{events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;plans:WorkoutPlan[];setPlans:(p:WorkoutPlan[])=>void;logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void}){
  const [status,setStatus]=useState('');
  async function clearDiary(){ setStatus('Deleting all diary events and class sessions...'); await clearRemoteDiaryAndWorkouts(); setEvents([]); setPlans([]); setLogs([]); setStorage('bbb_events', []); setStorage('bbb_plans', []); setStorage('bbb_logs', []); localStorage.setItem('bbb_v2213_fresh_start_done','done'); setStatus('Diary events, class sessions and saved workouts have been cleared.'); }
  return <section className="panel adminMaintenance"><h3>Admin Maintenance</h3><p className="muted">Use this to keep the live app tidy. This clears diary events, class sessions, saved workouts and exercise logs so the real programme can be rebuilt from scratch.</p><button className="dangerBtn" onClick={clearDiary}>Delete all sessions and saved workouts</button>{status && <div className="status">{status}</div>}</section>
}

function AdminTrainingDiary({events,setEvents,athletes,users}:{events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void; athletes:AthleteProfile[]; users:AppUser[]}){
  const athleteOptions = getAthleteOptions(athletes);
  const defaultAthlete = athleteOptions.find(a=>normalise(a.name)==='james hiles') || athleteOptions[0];
  const [athleteId,setAthleteId] = useState(defaultAthlete?.id || '');
  useEffect(()=>{ if(!athleteId && defaultAthlete) setAthleteId(defaultAthlete.id); }, [athleteOptions.length]);
  const athlete = athleteOptions.find(a=>a.id===athleteId) || defaultAthlete;
  const diary = athlete ? events.filter(e=>eventMatchesAthlete(e, athlete, users)).sort((a,b)=>`${a.date} ${a.time||''}`.localeCompare(`${b.date} ${b.time||''}`)) : [];
  const completed = diary.filter(e=>e.status==='completed').length;
  const planned = diary.filter(e=>e.status==='planned').length;
  const classSessions = diary.filter(e=>e.type==='FMA' || !!e.class_name).length;
  async function removeDiaryEvent(event: CalendarEvent){ await deleteRemoteSession(event); const next=events.filter(e=>e.id!==event.id && e.remote_id!==event.remote_id); setEvents(next); setStorage('bbb_events', next); }
  return <section className="panel adminDiaryPanel"><div className="row between diaryHeader"><div><h3>Athlete Training Diary</h3><p className="muted">View and delete the selected athlete's calendar items, assigned workouts and class sessions from the admin profile.</p></div><label>View Athlete<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{athleteOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div><div className="kpiRow diaryKpis"><Kpi label="Planned" value={planned}/><Kpi label="Completed" value={completed}/><Kpi label="Class Sessions" value={classSessions}/><Kpi label="Total Diary Items" value={diary.length}/></div>{diary.length===0 ? <p className="status">No sessions are currently assigned to {athlete?.name || 'this athlete'}. Their diary is clean and ready for new programmes.</p> : <div className="diaryList">{diary.map(e=><div className="preview diaryItem" key={e.id}><b>{e.title}</b><span>{dateOnly(e.date)} · {normaliseTime(e.time) || 'Time TBC'} · {e.type}</span><em>{titleCase(e.status)}{e.workout_plan_id ? ' · Assigned workout' : e.class_name ? ` · ${e.class_name}` : ''}</em><button className="miniBtn dangerBtn" onClick={()=>removeDiaryEvent(e)}>Delete diary item</button></div>)}</div>}</section>
}

function AdminWorkoutManager({plans,setPlans}:{plans:WorkoutPlan[];setPlans:(p:WorkoutPlan[])=>void}){
  async function removePlan(plan: WorkoutPlan){ await deleteRemoteProgramme(plan); const next=plans.filter(p=>p.id!==plan.id && (p as any).remote_id!==(plan as any).remote_id); setPlans(next); setStorage('bbb_plans', next); }
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
    const saved = await saveRemoteBadgeDefinition(candidate);
    const next = [saved, ...badges.filter(b => b.id !== form.id && b.remote_id !== form.remote_id && normalise(b.name) !== normalise(saved.name))];
    setBadges(next);
    setStorage('bbb_badges', next);
    setStatus(`${saved.name} has been saved. It will update automatically from the selected counter.`);
    resetForm();
  }
  async function toggleBadge(b: BadgeDefinition){
    const updated = { ...b, is_active: b.is_active === false };
    const saved = await saveRemoteBadgeDefinition(updated);
    const next = badges.map(x => x.id===b.id || x.remote_id===b.remote_id ? saved : x);
    setBadges(next); setStorage('bbb_badges', next);
    setStatus(`${saved.name} is now ${saved.is_active === false ? 'inactive' : 'active'}.`);
  }
  async function deleteBadge(b: BadgeDefinition){
    addBadgeTombstone(b);
    const ok = await deleteRemoteBadgeDefinition(b);
    const next = badges.filter(x => x.id!==b.id && x.remote_id!==b.remote_id && badgeStableKey(x)!==badgeStableKey(b));
    setBadges(next); setStorage('bbb_badges', next);
    setStatus(ok ? `${b.name} has been deleted.` : `${b.name} was removed locally. If it reappears, run the badge delete policy SQL in Supabase.`);
    if(form.id===b.id) resetForm();
  }
  return <section className="panel achievementManager"><h3>Achievement Manager</h3><p className="muted">Create and update badges without redeploying the app. Use the fixed achievement types below so the counters can update automatically from training data.</p><div className="achievementEditor"><div className="grid three"><label>Badge Name<input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. 10 FMA Classes"/></label><label>Icon<input value={form.icon} onChange={e=>update('icon',e.target.value)} placeholder="🏆"/></label><label>Achievement Type<select value={form.badge_type} onChange={e=>update('badge_type',e.target.value as AchievementType)}>{ACHIEVEMENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label>Target Number<input type="number" min="1" value={form.target_value} onChange={e=>update('target_value',Number(e.target.value))}/></label><label>XP Value<input type="number" min="0" value={form.xp_value || 0} onChange={e=>update('xp_value',Number(e.target.value))}/></label><label>Status<select value={form.is_active === false ? 'inactive' : 'active'} onChange={e=>update('is_active', e.target.value==='active')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><label className="fullLabel">Description<span>Shown on the athlete badges page.</span><textarea value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Describe what the athlete needs to do."/></label><div className="typeHelp"><b>{ACHIEVEMENT_TYPES.find(t=>t.value===form.badge_type)?.label}</b><span>{ACHIEVEMENT_TYPES.find(t=>t.value===form.badge_type)?.help}</span></div><div className="formActions"><button className="primary" onClick={saveBadge}><Save size={16}/>{editing?'Update achievement':'Create achievement'}</button>{editing && <button onClick={resetForm}>Cancel edit</button>}</div>{status && <div className="status">{status}</div>}</div><h4>Active Achievements</h4>{activeBadges.length===0 ? <p className="status">No active achievements yet.</p> : <div className="achievementList">{activeBadges.map(b=><AchievementAdminCard key={b.id} badge={b} onEdit={()=>editBadge(b)} onToggle={()=>toggleBadge(b)} onDelete={()=>deleteBadge(b)}/>)}</div>}{inactiveBadges.length>0 && <><h4>Inactive Achievements</h4><div className="achievementList inactive">{inactiveBadges.map(b=><AchievementAdminCard key={b.id} badge={b} onEdit={()=>editBadge(b)} onToggle={()=>toggleBadge(b)} onDelete={()=>deleteBadge(b)}/>)}</div></>}</section>
}
function AchievementAdminCard({badge,onEdit,onToggle,onDelete}:{badge:BadgeDefinition;onEdit:()=>void;onToggle:()=>void;onDelete:()=>void}){
  const type = ACHIEVEMENT_TYPES.find(t=>t.value===badge.badge_type);
  return <div className="preview achievementAdminCard"><div><b><span className="badgeIconSmall">{badge.icon}</span>{badge.name}</b><span>{badge.description}</span><em>{type?.label || badge.badge_type} · Target {badge.target_value} · {badge.xp_value || 0} XP · {badge.is_active === false ? 'Inactive' : 'Active'}</em></div><div className="actions"><button className="miniBtn" onClick={onEdit}>Edit</button><button className="miniBtn" onClick={onToggle}>{badge.is_active === false ? 'Activate' : 'Deactivate'}</button><button className="miniBtn dangerBtn" onClick={onDelete}>Delete</button></div></div>
}

function WorkoutAssignment({plans,athletes,users,events,setEvents}:{plans:WorkoutPlan[]; athletes:AthleteProfile[]; users:AppUser[]; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void}){
  const athleteOptions = getAthleteOptions(athletes);
  const [planId,setPlanId]=useState(plans[0]?.id || '');
  const [athleteId,setAthleteId]=useState((athleteOptions.find(a=>normalise(a.name)==='james hiles') || athleteOptions[0])?.id || '');
  const [date,setDate]=useState(todayISO());
  const [time,setTime]=useState('18:00');
  const [status,setStatus]=useState('');
  useEffect(()=>{ if(!planId && plans[0]) setPlanId(plans[0].id); }, [plans.length]);
  useEffect(()=>{ if(!athleteId && athleteOptions[0]) setAthleteId((athleteOptions.find(a=>normalise(a.name)==='james hiles') || athleteOptions[0]).id); }, [athleteOptions.length]);
  async function assign(){
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
    setStatus('Pushing workout to selected profile...');
    const remoteSynced = await saveRemoteSession(event, plan, assignedProfile);
    const nextEvents = [remoteSynced, ...events.filter(e => e.id !== remoteSynced.id && e.remote_id !== remoteSynced.remote_id)];
    setEvents(nextEvents);
    setStorage('bbb_events', nextEvents);
    setStatus(`${plan.name} has been pushed to ${assigned.name}. It will appear in ${assigned.name}'s Training Calendar on ${dateOnly(date)} at ${normaliseTime(time)}.`);
  }
  return <section className="panel"><h3>Assign Workout To Athlete</h3><p className="muted">Create workouts in the Workout Builder, then push the saved workout to a selected athlete. The session is attached to the athlete profile selected below, not automatically to the trainer profile.</p>{plans.length===0 ? <p className="status">No saved workouts yet. Create and save a workout in the Workout Builder first.</p> : <><div className="grid two"><label>Saved Workout<select value={planId} onChange={e=>setPlanId(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.exercises.length} exercises</option>)}</select></label><label>Assign To Profile<select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>{athleteOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Session Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Session Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="formActions"><button className="primary" onClick={assign}><CalendarDays size={16}/>Push workout to profile</button></div></>}{status && <div className="status">{status}</div>}<div className="assignmentList"><h4>Recently Assigned To Profiles</h4>{events.filter(e=>e.workout_plan_id && e.athlete_id).slice(0,5).map(e=><div className="preview" key={e.id}><b>{e.title}</b><span>{dateOnly(e.date)} · {normaliseTime(e.time) || 'Time TBC'}</span><em>{e.athlete_name || athletes.find(a=>a.id===e.athlete_id)?.name || 'Athlete not assigned'}</em></div>)}</div></section>
}

function AthleteCreator({users,setUsers,athletes,setAthletes}:{users:AppUser[];setUsers:(u:AppUser[])=>void;athletes:AthleteProfile[];setAthletes:(a:AthleteProfile[])=>void}){
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [role,setRole]=useState<AppUser['role']>('athlete'); const [status,setStatus]=useState('');
  async function create(){
    const draft={id:crypto.randomUUID(),name,email,role,gym:'FMA Chester',goal:'Build consistent training habits.'} as AthleteProfile;
    setStatus('Creating athlete profile in Supabase...');
    const created = await createRemoteAthleteProfile(draft);
    const nextAthletes=canonicaliseAthletes([...athletes, created]); setAthletes(nextAthletes); setStorage('bbb_athletes', nextAthletes);
    setUsers(canonicaliseUsers([...users,{id:`profile-${created.id}`,email,name,role,athlete_id:created.id}]));
    setStatus(`Created ${name}. Now create their Supabase Auth user in Supabase > Authentication > Add user using the same email, then set their password or send a reset email.`);
    setName(''); setEmail('');
  }
  return <section className="panel"><h3>Create Athlete</h3><p className="muted">Creates the cloud athlete profile for testing. For secure login, create the matching Supabase Auth user with the same email in Supabase Authentication.</p><div className="grid three"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Athlete name"/></label><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="athlete@email.com"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value as AppUser['role'])}><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="admin">Admin</option></select></label></div><button className="primary" onClick={create} disabled={!name||!email}><Users size={16}/>Create cloud profile</button>{status && <div className="status">{status}</div>}{canonicaliseAthletes(athletes).map(a=><div className="preview" key={a.id}><b>{a.name}</b><span>{a.email}</span><em>{a.gym}</em></div>)}</section>
}
function ManualExercise({exercises,setExercises}:{exercises:Exercise[];setExercises:(e:Exercise[])=>void}){
  const [name,setName]=useState(''); const [description,setDescription]=useState(''); const [body,setBody]=useState('waist'); const [target,setTarget]=useState('abs'); const [category,setCategory]=useState('strength'); const [equipment,setEquipment]=useState('body weight'); const [location,setLocation]=useState('Home'); const [videoUrl,setVideoUrl]=useState('');
  const bodyOptions=Array.from(new Set(['full body', ...exercises.map(e=>bodyOf(e)).filter(Boolean)])).sort(); const targetOptions=Array.from(new Set(['full body', ...exercises.map(e=>e.target).filter(Boolean)])).sort(); const categoryOptions=Array.from(new Set(exercises.map(e=>e.category).filter(Boolean))).sort();
  async function save(){ const exercise:Exercise={exercise_id:`manual-${Date.now()}`,name,description,body_part:body,target,category,equipment,location,video_url:videoUrl,has_video:!!videoUrl,instructions:[]}; setExercises([exercise,...exercises]); if(supabase){ await supabase.from('exercises').upsert({...exercise, exercise_type:category, archived:false, is_archived:false},{onConflict:'exercise_id'}); } setName(''); setDescription(''); setVideoUrl(''); }
  return <section className="panel"><h3>Manually Add Exercise</h3><p className="muted">Add custom MMA, boxing, BJJ, physio or flexibility drills and link any open video URL.</p><div className="grid three"><label>Exercise Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Slip rope footwork"/></label><label>Body Part<select value={body} onChange={e=>setBody(e.target.value)}>{bodyOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Target Muscle / Focus<select value={target} onChange={e=>setTarget(e.target.value)}>{targetOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Type<select value={category} onChange={e=>setCategory(e.target.value)}>{categoryOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Equipment<input value={equipment} onChange={e=>setEquipment(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label></div><label className="fullLabel">Short Description<span>Keep this short. Full written instructions can be added later.</span><textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Demo Video URL<input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://..."/></label><button className="primary" onClick={save} disabled={!name}><Plus size={16}/>Add exercise</button></section>
}

function Importer({setExercises,reloadSupabase,exercises}:{setExercises:(e:Exercise[])=>void; reloadSupabase:()=>void; exercises:Exercise[]}) {
  const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState('Ready to load the bundled V2.2.9 catalogue.'); const [busy,setBusy]=useState(false); const [missingOpen,setMissingOpen]=useState(false);
  const missing = localCatalogue.filter(e=>!e.video_path && !e.video_url).slice(0,50);
  const prepared = useMemo(()=>localCatalogue.map(e=>({...e, video_url: e.video_url || buildVideoUrl(e.video_path), has_video: !!(e.video_url || e.video_path)})),[]);
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
function MissingVideoRow({exercise,exercises,setExercises}:{exercise:Exercise; exercises:Exercise[]; setExercises:(e:Exercise[])=>void}){ const [url,setUrl]=useState(''); async function save(){ const updated={...exercise,video_url:url,has_video:!!url}; setExercises(exercises.map(e=>e.exercise_id===exercise.exercise_id?updated:e)); if(supabase) await supabase.from('exercises').upsert({...updated, exercise_type:updated.category||'general', archived:false, is_archived:false},{onConflict:'exercise_id'}); } return <div className="missingRow"><b>{titleCase(exercise.name)}</b><span>{titleCase(bodyOf(exercise))} · {titleCase(exercise.target)}</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste replacement video URL"/><button onClick={save} disabled={!url}>Save URL</button></div> }

function VideoModal({title,url,onClose}:{title:string;url:string;onClose:()=>void}){ return <div className="modalBackdrop" onClick={onClose}><div className="videoModal" onClick={e=>e.stopPropagation()}><div className="row between"><h3>{title}</h3><button className="iconButton" onClick={onClose}><X size={20}/></button></div>{url ? <video src={url} controls autoPlay playsInline/> : <p>No video URL available.</p>}</div></div> }

createRoot(document.getElementById('root')!).render(<App />);
