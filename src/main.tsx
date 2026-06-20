import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Database, Dumbbell, Home, Import, Library, Medal, PlayCircle, Plus, Shield, User, Users, X } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase, buildVideoUrl } from './supabaseClient';
import catalogue from './data/exercise_catalogue.json';
import summary from './data/video_sort_summary.json';
import type { Exercise, ProgrammeExercise } from './types';
import './styles.css';

const localCatalogue = catalogue as Exercise[];

type Page = 'dashboard' | 'calendar' | 'today' | 'library' | 'builder' | 'fma' | 'stats' | 'badges' | 'profile' | 'admin' | 'import';

const NAV: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <Home size={18}/> },
  { page: 'calendar', label: 'Calendar', icon: <CalendarDays size={18}/> },
  { page: 'today', label: 'Today', icon: <Activity size={18}/> },
  { page: 'library', label: 'Exercise Library', icon: <Library size={18}/> },
  { page: 'builder', label: 'Workout Builder', icon: <Plus size={18}/> },
  { page: 'fma', label: 'FMA Classes', icon: <Shield size={18}/> },
  { page: 'stats', label: 'Stats', icon: <BarChart3 size={18}/> },
  { page: 'badges', label: 'Badges', icon: <Medal size={18}/> },
  { page: 'profile', label: 'Profile', icon: <User size={18}/> },
  { page: 'admin', label: 'Admin', icon: <Users size={18}/> },
  { page: 'import', label: 'Exercise Import', icon: <Database size={18}/> },
];

const starter: Exercise[] = [
  { exercise_id: 'starter-1', name: 'Bench Press', description: 'Feet planted, shoulder blades squeezed, lower the bar with control and press smoothly.', equipment:'barbell, bench', category:'strength', difficulty:'intermediate', body_part:'chest', target:'pectorals', location:'Gym', secondary_muscles:['anterior delts','triceps'], instructions:['Set your eyes under the bar and plant your feet.','Squeeze shoulder blades together and brace.','Lower with control and press smoothly.'] },
  { exercise_id: 'starter-2', name: 'Plank', description: 'Straight line from head to heels. Squeeze glutes and breathe slowly.', equipment:'body weight', category:'strength', difficulty:'beginner', body_part:'waist', target:'abs', location:'Home', secondary_muscles:['glutes'], instructions:['Place forearms under shoulders.','Brace abs and glutes.','Hold a straight line while breathing.'] },
];

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [exercises, setExercises] = useState<Exercise[]>(() => JSON.parse(localStorage.getItem('bbb_exercises') || 'null') || starter);
  const [video, setVideo] = useState<{url: string; title: string} | null>(null);

  useEffect(() => { localStorage.setItem('bbb_exercises', JSON.stringify(exercises)); }, [exercises]);

  async function loadFromSupabase() {
    if (!supabase) return;
    const { data } = await supabase.from('exercises').select('*').eq('is_archived', false).order('name');
    if (data?.length) setExercises(data as Exercise[]);
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><Shield className="brandIcon"/><div><h1>BlackBeltBootcamp</h1><span>Training OS V2</span></div></div>
      <nav>{NAV.map(n => <button key={n.page} onClick={() => setPage(n.page)} className={page===n.page?'active':''}>{n.icon}<span>{n.label}</span></button>)}</nav>
      <div className="athlete">James Hiles</div>
    </aside>
    <main className="main">
      <header><div><span className="muted">Logged in as Demo Mode</span><h2>{NAV.find(n=>n.page===page)?.label}</h2></div><button className="pill"><Shield size={16}/>James Hiles</button></header>
      {page==='dashboard' && <Dashboard exercises={exercises} />}
      {page==='library' && <ExerciseLibrary exercises={exercises} onPlay={(e)=>setVideo({url: e.video_url || buildVideoUrl(e.video_path), title: e.name})} />}
      {page==='import' && <Importer setExercises={setExercises} reloadSupabase={loadFromSupabase} />}
      {page==='builder' && <WorkoutBuilder exercises={exercises} />}
      {page==='today' && <Today exercises={exercises} onPlay={(e)=>setVideo({url: e.video_url || buildVideoUrl(e.video_path), title: e.name})}/>} 
      {page==='calendar' && <Placeholder title="Training Calendar" body="Plan gym, MMA, BJJ, footwork, cardio, physio and flexibility sessions. V2 schema is ready for assigned calendar events." />}
      {page==='fma' && <FmaClasses />}
      {page==='stats' && <Stats />}
      {page==='badges' && <Badges />}
      {page==='profile' && <Profile />}
      {page==='admin' && <Admin />}
    </main>
    {video && <VideoModal title={video.title} url={video.url} onClose={()=>setVideo(null)} />}
  </div>;
}

function Dashboard({exercises}:{exercises: Exercise[]}) {
  const withVideo = exercises.filter(e=>e.has_video || e.video_path || e.video_url).length;
  return <div className="grid dash">
    <Card title="Exercise Catalogue" value={exercises.length.toString()} note="Database-ready exercises" />
    <Card title="Video Demos" value={withVideo.toString()} note="Mapped to Supabase Storage" />
    <Card title="Today" value="Footwork + Strength" note="James's training queue" />
    <Card title="Architecture" value="V2" note="Supabase-first platform" />
  </div>;
}
function Card({title,value,note}:{title:string;value:string;note:string}){return <section className="card"><span className="muted">{title}</span><strong>{value}</strong><p>{note}</p></section>}

function ExerciseLibrary({exercises,onPlay}:{exercises:Exercise[];onPlay:(e:Exercise)=>void}) {
  const [q,setQ]=useState(''); const [filter,setFilter]=useState('all');
  const cats=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>e.category).filter(Boolean)))], [exercises]);
  const filtered=exercises.filter(e=> (filter==='all'||e.category===filter) && `${e.name} ${e.exercise_id} ${e.target} ${e.body_part}`.toLowerCase().includes(q.toLowerCase())).slice(0,150);
  return <section className="panel"><div className="toolbar"><input placeholder="Search exercise, muscle or ID" value={q} onChange={e=>setQ(e.target.value)}/><select value={filter} onChange={e=>setFilter(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></div><div className="exerciseGrid">{filtered.map(e=><ExerciseCard key={e.exercise_id} e={e} onPlay={onPlay}/>)}</div></section>
}
function ExerciseCard({e,onPlay}:{e:Exercise;onPlay:(e:Exercise)=>void}) {
  const [open,setOpen]=useState(false); const hasVideo=!!(e.video_url||e.video_path);
  return <article className="exercise"><div className="row between"><h3>{e.name}</h3><span className="tag">{e.category||'exercise'}</span></div><p>{e.description}</p><div className="meta">#{e.exercise_id} · {e.equipment||'equipment'} · {e.location||'location'} · {e.difficulty||'level'}</div><div className="chips">{[e.body_part,e.target,...(e.secondary_muscles||[]).slice(0,2)].filter(Boolean).map(m=><span key={m}>{m}</span>)}</div><div className="row actions"><button disabled={!hasVideo} onClick={()=>onPlay(e)}><PlayCircle size={16}/>{hasVideo?'Watch demo':'No demo yet'}</button><button onClick={()=>setOpen(!open)}>{open?<ChevronDown size={16}/>:<ChevronRight size={16}/>}Instructions</button></div>{open && <ol className="instructions">{(e.instructions||[]).map((s,i)=><li key={i}>{s}</li>)}</ol>}</article>
}

function Importer({setExercises,reloadSupabase}:{setExercises:(e:Exercise[])=>void; reloadSupabase:()=>void}) {
  const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState('Ready to load the bundled V2 catalogue.'); const [busy,setBusy]=useState(false);
  const preview = loaded ? localCatalogue.slice(0,75) : [];
  const prepared = useMemo(()=>localCatalogue.map(e=>({...e, video_url: e.video_url || buildVideoUrl(e.video_path)})),[]);
  async function importLocal(){ setExercises(prepared); setStatus(`Loaded ${prepared.length} exercises into app demo data.`); }
  async function importSupabase(){
    if (!supabase) { setStatus('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'); return; }
    setBusy(true); setStatus('Importing exercises to Supabase...');
    try {
      const rows = prepared.map(({instructions, ...e}) => ({...e, archived: !!e.is_archived}));
      for (let i=0;i<rows.length;i+=200) {
        const { error } = await supabase.from('exercises').upsert(rows.slice(i,i+200), { onConflict: 'exercise_id' });
        if (error) throw error;
      }
      const instructionRows = prepared.flatMap(e => (e.instructions||[]).map((instruction,idx)=>({exercise_id:e.exercise_id, step_number:idx+1, instruction})));
      for (let i=0;i<instructionRows.length;i+=500) {
        const { error } = await supabase.from('exercise_instructions').upsert(instructionRows.slice(i,i+500), { onConflict: 'exercise_id,step_number' });
        if (error) throw error;
      }
      setStatus(`Supabase import complete: ${rows.length} exercises and ${instructionRows.length} instruction steps.`); await reloadSupabase();
    } catch (err:any) { setStatus(`Supabase import failed: ${err.message || err}`); }
    finally { setBusy(false); }
  }
  return <div><section className="panel"><h3>Exercise Video Importer V2</h3><p className="muted">Supabase-first import using the corrected bucket path. The importer strips the local “Structured Workouts/” parent folder and stores playable public URLs from your <b>exercise-videos</b> bucket.</p><div className="row actions"><button onClick={()=>{setLoaded(true);setStatus(`Catalogue loaded: ${localCatalogue.length} unique exercises.`)}}>Load catalogue</button><button disabled={!loaded} onClick={importLocal}>Import to app demo data</button><button disabled={!loaded||busy} onClick={importSupabase}><Import size={16}/>Import catalogue to Supabase</button></div><div className="status">{status}</div></section><div className="grid dash"><Card title="Records" value={(summary as any).records?.toString()||'1659'} note="Source records"/><Card title="Unique IDs" value={localCatalogue.length.toString()} note="Deduplicated exercises"/><Card title="Videos mapped" value={localCatalogue.filter(e=>e.video_path).length.toString()} note="Playable storage paths"/><Card title="Missing videos" value={(summary as any).missing_records?.toString()||'6'} note="Can be added later"/></div><section className="panel"><h3>Import preview</h3><p className="muted">Showing first {preview.length} records.</p>{preview.map(e=><div className="preview" key={e.exercise_id}><b>{e.exercise_id} · {e.name}</b><span>{e.source_file} · {e.body_part} · {e.target} · {e.category}</span><em>{e.video_path?'video mapped':'missing video'}</em></div>)}</section></div>
}

function WorkoutBuilder({exercises}:{exercises:Exercise[]}){const [selected,setSelected]=useState<ProgrammeExercise[]>([]); const [q,setQ]=useState(''); const list=exercises.filter(e=>e.name.toLowerCase().includes(q.toLowerCase())).slice(0,30); return <section className="panel"><h3>Programme Builder</h3><p className="muted">Build reusable workouts from the database exercise catalogue.</p><input placeholder="Search to add exercise" value={q} onChange={e=>setQ(e.target.value)}/><div className="split"><div>{list.map(e=><button className="listBtn" key={e.exercise_id} onClick={()=>setSelected([...selected,{exercise_id:e.exercise_id,name:e.name,planned_sets:3,planned_reps:'8-12'}])}>+ {e.name}</button>)}</div><div className="builderPlan"><h4>Draft Workout</h4>{selected.map((e,i)=><div className="preview" key={i}><b>{i+1}. {e.name}</b><span>{e.planned_sets} sets · {e.planned_reps} reps</span></div>)}</div></div></section>}
function Today({exercises,onPlay}:{exercises:Exercise[];onPlay:(e:Exercise)=>void}){const picks=exercises.filter(e=>['back squat','barbell romanian deadlift','plank','push-ups'].includes(e.name.toLowerCase())).slice(0,4); return <section className="panel"><h3>Today’s Training</h3><p className="muted">Example daily session. V2 database tables support permanent workout logging.</p><div className="exerciseGrid">{picks.map(e=><ExerciseCard e={e} key={e.exercise_id} onPlay={onPlay}/>)}</div></section>}
function FmaClasses(){return <Placeholder title="FMA Chester Classes" body="Store advanced, masters and adult class options, then let James add chosen classes to his diary."/>}
function Stats(){const data=[{w:'W1',score:60},{w:'W2',score:68},{w:'W3',score:74},{w:'W4',score:81}];return <section className="panel"><h3>Progress Stats</h3><ResponsiveContainer width="100%" height={260}><LineChart data={data}><Line type="monotone" dataKey="score"/><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="w"/><YAxis/><Tooltip/></LineChart></ResponsiveContainer></section>}
function Badges(){return <section className="panel"><h3>Badges</h3><div className="grid dash"><Card title="7 Day Streak" value="🥋" note="Train seven days in a row"/><Card title="First Programme" value="🏁" note="Complete first assigned programme"/><Card title="Footwork Focus" value="⚡" note="Complete 30 footwork sessions"/></div></section>}
function Profile(){return <Placeholder title="James Hiles Profile" body="Record height, weight, BMI, goals, notes and progress metrics."/>}
function Admin(){return <Placeholder title="Admin Portal" body="Manage athletes, exercises, programmes, class schedules, badges and training calendars."/>}
function Placeholder({title,body}:{title:string;body:string}){return <section className="panel"><h3>{title}</h3><p className="muted">{body}</p></section>}
function VideoModal({title,url,onClose}:{title:string;url:string;onClose:()=>void}){return <div className="modalBackdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><div className="row between"><h3>{title}</h3><button onClick={onClose}><X size={18}/></button></div><video controls autoPlay src={url}/><p className="muted small">{url}</p></div></div>}

createRoot(document.getElementById('root')!).render(<App />);
