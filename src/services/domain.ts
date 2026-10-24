import type {AthleteProfile,Exercise,NutritionEntry} from '../types';
import {storage} from './cache';
export type WeightUnit='kg'|'st';
const APP_TIME_ZONE='GMT';
const POUNDS_PER_KG=2.2046226218;
export function pad2(value: number){ return String(value).padStart(2, '0'); }
export function dateOnly(value?: string | Date | null){
  if (!value) return dateOnly(new Date());
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (!Number.isNaN(d.getTime())) return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
  return String(value).slice(0,10);
}
export function normaliseTime(value?: string | null){
  const text = String(value || '').trim();
  const match = text.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '';
}
export function toGmtSessionDate(value?: string | Date | null){ return `${dateOnly(value)}T12:00:00+00:00`; }
export function localDateString(date: Date){ return dateOnly(date); }
export function todayISO(){ return dateOnly(new Date()); }
export function dateFromIso(value: string | Date){ const [y,m,d] = dateOnly(value).split('-').map(Number); return new Date(Date.UTC(y, m-1, d, 12, 0, 0)); }
export function addDays(date: Date | string, days: number){ const d = dateFromIso(date); d.setUTCDate(d.getUTCDate()+days); return d; }
export function startOfWeek(date: Date | string = new Date()){ const d = dateFromIso(date); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - day + 1); return d; }
export function weekDates(){ const start = startOfWeek(); return Array.from({length:7}, (_,i)=>addDays(start,i)); }
export function iso(date: Date | string){ return dateOnly(date); }
export function dayLabel(date: Date | string){ return dateFromIso(date).toLocaleDateString('en-GB', { timeZone: APP_TIME_ZONE, weekday:'short', day:'numeric', month:'short' }); }
export function titleCase(v?: string | null){ return (v || '').split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
export function sentence(v?: string | null){ const s = (v || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
export function bodyOf(e: Exercise){ return e.body_part || e.body_parts || 'general'; }
export function bmi(profile: AthleteProfile){ if(!profile.height_cm || !profile.weight_kg) return ''; const m = profile.height_cm/100; return (profile.weight_kg/(m*m)).toFixed(1); }
export function getWeightUnit(profile?: AthleteProfile | null): WeightUnit { return (profile?.weight_unit === 'st' || storage<WeightUnit>('bbb_weight_unit', 'kg') === 'st') ? 'st' : 'kg'; }
export function kgToStLb(kg?: number | null) { const totalLb = Math.max(0, Number(kg || 0) * POUNDS_PER_KG); const st = Math.floor(totalLb / 14); const lb = Math.round((totalLb - st * 14) * 10) / 10; return { st, lb }; }
export function stLbToKg(st?: number | string, lb?: number | string) { const stones = Number(st || 0); const pounds = Number(lb || 0); return Math.round(((stones * 14) + pounds) / POUNDS_PER_KG * 10) / 10; }
export function kgToStoneDecimal(kg?: number | null) { return Math.round((Number(kg || 0) * POUNDS_PER_KG / 14) * 100) / 100; }
export function formatWeight(kg?: number | null, unit: WeightUnit = 'kg') { if (!kg) return '—'; if (unit === 'st') { const { st, lb } = kgToStLb(kg); return `${st}st ${lb}lb`; } return `${Number(kg).toFixed(1).replace(/\.0$/, '')}kg`; }
export function classNameForType(type?: string){ return `typeBadge type-${(type||'general').toLowerCase().replace(/\s+/g,'-')}`; }
export function normalise(v?: string | null){ return (v || '').trim().toLowerCase(); }
export function percent(count:number, target:number){ return Math.max(0, Math.min(100, Math.round((count/Math.max(1,target))*100))); }
export function parseNumeric(value?: string | number | null){
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
export function estimateOneRepMax(weight: number, reps: number){
  if (!weight || !reps) return 0;
  if (reps <= 1) return weight;
  return Math.round((weight * (1 + reps / 30)) * 10) / 10;
}
export function nutritionTotals(entries: NutritionEntry[]){
  return entries.reduce((acc, entry)=>({
    calories: acc.calories + Number(entry.calories || 0),
    protein_g: acc.protein_g + Number(entry.protein_g || 0),
    carbs_g: acc.carbs_g + Number(entry.carbs_g || 0),
    fats_g: acc.fats_g + Number(entry.fats_g || 0),
    water_ml: acc.water_ml + Number(entry.water_ml || 0),
  }), { calories:0, protein_g:0, carbs_g:0, fats_g:0, water_ml:0 });
}
export function clampPercent(value:number, target:number){ return Math.max(0, Math.min(100, Math.round((value / Math.max(1,target))*100))); }
export function displaySyncTime(value?: Date | null){
  if (!value) return 'Not synced yet';
  const diff = Date.now() - value.getTime();
  if (diff < 60000) return 'Synced just now';
  if (diff < 3600000) return `Synced ${Math.max(1,Math.round(diff/60000))}m ago`;
  return `Synced ${value.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
}
export function getInitials(name?: string){ return (name || 'Athlete').split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toUpperCase()).join(''); }
