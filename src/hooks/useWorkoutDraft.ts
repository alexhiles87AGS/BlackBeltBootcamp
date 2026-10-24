import {useEffect,useState} from 'react';
import {storage,setStorage,getCacheOwner} from '../services/cache';
import type {ExerciseLogSet} from '../types';
export type WorkoutDraft={rows:Record<string,ExerciseLogSet[]>;index:number;startedAt:number;restEnd:number|null;pausedRest:number;restDuration:number;notes:string;effort:string};
export function useWorkoutDraft(sessionId:string,initial:()=>WorkoutDraft){const owner=getCacheOwner();const key=`bbb_workout_draft:${sessionId}`;const [draft,setDraft]=useState<WorkoutDraft>(()=>storage(key,initial()));useEffect(()=>{if(getCacheOwner()===owner)setStorage(key,draft)},[owner,key,draft]);return [draft,setDraft] as const;}
export function remainingSeconds(end:number|null,now=Date.now()){return end?Math.max(0,Math.ceil((end-now)/1000)):0;}
