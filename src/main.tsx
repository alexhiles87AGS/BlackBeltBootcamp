import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Database, Dumbbell, Home, Import, Library, Medal, PlayCircle, Plus, Shield, User, Users, X, ClipboardList, Clock, Target, Trophy, Save, Search, Dumbbell as DumbbellIcon } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase, buildVideoUrl } from './supabaseClient';
import catalogue from './data/exercise_catalogue.json';
import summary from './data/video_sort_summary.json';
import type { AthleteProfile, Badge, CalendarEvent, Exercise, ProgrammeExercise, WorkoutLog, WorkoutPlan, UserRole } from './types';
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

const defaultProfile: AthleteProfile = {
  id: 'james-demo',
  name: 'James Hiles',
  email: 'james@example.com',
  role: 'athlete',
  age: 14,
  height_cm: 170,
  weight_kg: 65,
  belt_rank: 'Black Belt',
  gym: 'FMA Chester',
  goal: 'Build complete MMA athleticism and long-term professional fighter habits.',
  competition_weight_kg: 66,
};

const starter: Exercise[] = [
  { exercise_id: 'starter-1', name: 'Bench Press', description: 'Feet planted, shoulder blades squeezed, lower the bar with control and press smoothly.', equipment:'barbell, bench', category:'strength', difficulty:'intermediate', body_part:'chest', target:'pectorals', location:'Gym', secondary_muscles:['anterior delts','triceps'], instructions:['Set your eyes under the bar and plant your feet.','Squeeze shoulder blades together and brace.','Lower with control and press smoothly.'] },
  { exercise_id: 'starter-2', name: 'Plank', description: 'Straight line from head to heels. Squeeze glutes and breathe slowly.', equipment:'body weight', category:'strength', difficulty:'beginner', body_part:'waist', target:'abs', location:'Home', secondary_muscles:['glutes'], instructions:['Place forearms under shoulders.','Brace abs and glutes.','Hold a straight line while breathing.'] },
];

const initialEvents: CalendarEvent[] = [
  { id:'e1', date:'Mon', time:'06:30', title:'15-Minute Footwork Routine', type:'mma', status:'planned' },
  { id:'e2', date:'Mon', time:'18:00', title:'Lower Body Strength', type:'strength', status:'planned' },
  { id:'e3', date:'Tue', time:'19:00', title:'FMA Adult MMA', type:'fma', status:'planned' },
  { id:'e4', date:'Wed', time:'06:30', title:'Mobility + Physio', type:'mobility', status:'completed' },
  { id:'e5', date:'Thu', time:'19:00', title:'BJJ / Grappling', type:'bjj', status:'planned' },
  { id:'e6', date:'Fri', time:'18:00', title:'Upper Body Strength', type:'strength', status:'planned' },
  { id:'e7', date:'Sat', time:'10:00', title:'Sparring / Class', type:'mma', status:'planned' },
];

const initialBadges: Badge[] = [
  { id:'b1', name:'First Workout', icon:'🏁', description:'Complete the first logged workout.', unlocked:true, progress:100 },
  { id:'b2', name:'7 Day Streak', icon:'🔥', description:'Train seven days in a row.', unlocked:false, progress:57 },
  { id:'b3', name:'Footwork Focus', icon:'⚡', description:'Complete 30 footwork sessions.', unlocked:false, progress:36 },
  { id:'b4', name:'FMA Regular', icon:'🥋', description:'Attend 25 FMA classes.', unlocked:false, progress:44 },
  { id:'b5', name:'Strength Builder', icon:'💪', description:'Log 50 strength exercises.', unlocked:false, progress:62 },
  { id:'b6', name:'Fight Camp Ready', icon:'🏆', description:'Complete a full programme block.', unlocked:false, progress:18 },
];

function getTodayISO(){ return new Date().toISOString().slice(0,10); }
function safeVideo(e: Exercise){ return e.video_url || buildVideoUrl(e.video_path); }
function bmi(profile: AthleteProfile){ if(!profile.height_cm || !profile.weight_kg) return ''; const m = profile.height_cm/100; return (profile.weight_kg/(m*m)).toFixed(1); }
function storage<T>(key:string, fallback:T):T { try { return JSON.parse(localStorage.getItem(key)||'null') || fallback; } catch { return fallback; } }

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [role, setRole] = useState<UserRole>(() => storage('bbb_role','admin' as UserRole));
  const [profile, setProfile] = useState<AthleteProfile>(() => storage('bbb_profile', defaultProfile));
  const [exercises, setExercises] = useState<Exercise[]>(() => storage('bbb_exercises', starter));
  const [events, setEvents] = useState<CalendarEvent[]>(() => storage('bbb_events', initialEvents));
  const [logs, setLogs] = useState<WorkoutLog[]>(() => storage('bbb_logs', []));
  const [plans, setPlans] = useState<WorkoutPlan[]>(() => storage('bbb_plans', []));
  const [video, setVideo] = useState<{url: string; title: string} | null>(null);

  useEffect(() => { localStorage.setItem('bbb_exercises', JSON.stringify(exercises)); }, [exercises]);
  useEffect(() => { localStorage.setItem('bbb_events', JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem('bbb_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('bbb_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem('bbb_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('bbb_role', JSON.stringify(role)); }, [role]);

  async function loadFromSupabase() {
    if (!supabase) return;
    const { data } = await supabase.from('exercises').select('*').eq('is_archived', false).order('name');
    if (data?.length) setExercises(data as Exercise[]);
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><Shield className="brandIcon"/><div><h1>BlackBeltBootcamp</h1><span>Training OS V2.1</span></div></div>
      <nav>{NAV.map(n => <button key={n.page} onClick={() => setPage(n.page)} className={page===n.page?'active':''}>{n.icon}<span>{n.label}</span></button>)}</nav>
      <div className="athlete"><b>{profile.name}</b><br/><span className="muted">{profile.role.toUpperCase()} · {profile.gym}</span></div>
    </aside>
    <main className="main">
      <header><div><span className="muted">Logged in as {role === 'admin' ? 'Admin / Coach Mode' : 'Athlete Mode'}</span><h2>{NAV.find(n=>n.page===page)?.label}</h2></div><RoleSwitcher role={role} setRole={setRole}/></header>
      {page==='dashboard' && <Dashboard exercises={exercises} logs={logs} events={events} badges={initialBadges} profile={profile} setPage={setPage}/>} 
      {page==='library' && <ExerciseLibrary exercises={exercises} onPlay={(e)=>setVideo({url: safeVideo(e), title: e.name})} />}
      {page==='import' && <Importer setExercises={setExercises} reloadSupabase={loadFromSupabase} />}
      {page==='builder' && <WorkoutBuilder exercises={exercises} plans={plans} setPlans={setPlans} />}
      {page==='today' && <Today exercises={exercises} logs={logs} setLogs={setLogs} onPlay={(e)=>setVideo({url: safeVideo(e), title: e.name})}/>} 
      {page==='calendar' && <TrainingCalendar events={events} setEvents={setEvents}/>} 
      {page==='fma' && <FmaClasses events={events} setEvents={setEvents}/>} 
      {page==='stats' && <Stats logs={logs} profile={profile}/>} 
      {page==='badges' && <Badges badges={initialBadges}/>} 
      {page==='profile' && <Profile profile={profile} setProfile={setProfile}/>} 
      {page==='admin' && <Admin profile={profile} events={events} plans={plans} exercises={exercises}/>} 
    </main>
    {video && <VideoModal title={video.title} url={video.url} onClose={()=>setVideo(null)} />}
  </div>;
}

function RoleSwitcher({role,setRole}:{role:UserRole;setRole:(r:UserRole)=>void}){
  return <div className="row"><span className="pill"><Shield size={16}/>James Hiles</span><select value={role} onChange={e=>setRole(e.target.value as UserRole)}><option value="admin">Admin</option><option value="coach">Coach</option><option value="athlete">Athlete</option></select></div>
}

function Dashboard({exercises,logs,events,badges,profile,setPage}:{exercises:Exercise[];logs:WorkoutLog[];events:CalendarEvent[];badges:Badge[];profile:AthleteProfile;setPage:(p:Page)=>void}) {
  const completed = logs.filter(l=>l.completed).length;
  const completedEvents = events.filter(e=>e.status==='completed').length;
  const weekComplete = Math.round((completedEvents / Math.max(events.length,1))*100);
  const plannedToday = events.filter(e=>e.status!=='completed').slice(0,4);
  const nextSession = plannedToday[0];
  const unlockedBadges = badges.filter(b=>b.unlocked).length;
  const athleteBmi = bmi(profile);
  const readiness = Math.min(100, Math.max(18, weekComplete + unlockedBadges * 5 + Math.min(completed, 10) * 2));
  return <>
    <section className="heroPanel athleteHero">
      <div>
        <span className="eyebrow">Athlete command centre</span>
        <h2>Keep James moving towards fight-ready habits.</h2>
        <p>{profile.goal}</p>
        <div className="row actions">
          <button className="primary" onClick={()=>setPage('today')}><Activity size={16}/>Start today&apos;s training</button>
          <button onClick={()=>setPage('calendar')}><CalendarDays size={16}/>View week</button>
          <button onClick={()=>setPage('builder')}><Plus size={16}/>Build workout</button>
        </div>
      </div>
      <div className="readinessCard">
        <span className="muted">Readiness score</span>
        <strong>{readiness}%</strong>
        <div className="progress"><div className="bar" style={{width:`${readiness}%`}}/></div>
        <p className="muted">Based on weekly completion, logged work and achievements.</p>
      </div>
    </section>

    <div className="grid dash athleteStats">
      <Card title="Today&apos;s next session" value={nextSession ? nextSession.time || 'Planned' : 'Clear'} note={nextSession ? nextSession.title : 'No remaining sessions today'} />
      <Card title="Weekly completion" value={`${weekComplete}%`} note={`${completedEvents}/${events.length} planned sessions completed`} />
      <Card title="Training logged" value={completed.toString()} note="Completed exercise entries" />
      <Card title="Current profile" value={athleteBmi ? `BMI ${athleteBmi}` : 'Set metrics'} note={`${profile.belt_rank || 'Belt rank'} · ${profile.gym || 'Training base'}`} />
    </div>

    <div className="grid two">
      <section className="panel">
        <div className="row between"><div><h3>Today&apos;s plan</h3><p className="muted">What James needs to focus on next.</p></div><button className="miniBtn" onClick={()=>setPage('today')}>Open logger</button></div>
        {plannedToday.length ? plannedToday.map(e=><EventTile key={e.id} e={e}/>) : <p className="muted">Nothing left on the plan. Add training in the calendar or FMA planner.</p>}
      </section>
      <section className="panel">
        <div className="row between"><div><h3>Progress pulse</h3><p className="muted">Motivation, streaks and next achievements.</p></div><span className="tag">{unlockedBadges}/{badges.length} badges</span></div>
        {badges.slice(0,4).map(b=><div className="badgeRow" key={b.id}><span>{b.icon}</span><div><b>{b.name}</b><div className="progress"><div className="bar" style={{width:`${b.progress}%`}}/></div></div><em>{b.unlocked?'Unlocked':`${b.progress}%`}</em></div>)}
        <button className="miniBtn" onClick={()=>setPage('badges')}><Trophy size={16}/>Open achievements</button>
      </section>
    </div>

    <section className="panel">
      <div className="row between"><div><h3>Coach actions</h3><p className="muted">Fast routes for planning James&apos;s next block.</p></div><span className="tag">{exercises.length} exercises available</span></div>
      <div className="grid three">
        <QuickAction icon={<Target/>} title="Create next session" text="Use the body-part-first builder." onClick={()=>setPage('builder')}/>
        <QuickAction icon={<Shield/>} title="Add FMA class" text="Add the class James is attending." onClick={()=>setPage('fma')}/>
        <QuickAction icon={<BarChart3/>} title="Review progress" text="Completion, class mix and body metrics." onClick={()=>setPage('stats')}/>
      </div>
    </section>
  </>;
}
function QuickAction({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick:()=>void}){return <button className="sessionCard" onClick={onClick}><div className="row"><span className="tag">{icon}</span><div><h4>{title}</h4><p className="muted">{text}</p></div></div></button>}
function Card({title,value,note}:{title:string;value:string;note:string}){return <section className="card"><span className="muted">{title}</span><strong>{value}</strong><p>{note}</p></section>}

function ExerciseLibrary({exercises,onPlay}:{exercises:Exercise[];onPlay:(e:Exercise)=>void}) {
  const [q,setQ]=useState(''); const [category,setCategory]=useState('all'); const [body,setBody]=useState('all');
  const cats=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>e.category).filter(Boolean)))], [exercises]);
  const bodies=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>e.body_part || e.body_parts).filter(Boolean)))], [exercises]);
  const filtered=exercises.filter(e=>
    (category==='all'||e.category===category) &&
    (body==='all'||e.body_part===body||e.body_parts===body) &&
    `${e.name} ${e.exercise_id} ${e.target} ${e.body_part} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0,150);
  return <section className="panel"><div className="toolbar"><input placeholder="Search exercise, muscle, equipment or ID" value={q} onChange={e=>setQ(e.target.value)}/><select value={body} onChange={e=>setBody(e.target.value)}>{bodies.map(c=><option key={c}>{c}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></div><div className="exerciseGrid">{filtered.map(e=><ExerciseCard key={e.exercise_id} e={e} onPlay={onPlay}/>)}</div></section>
}
function ExerciseCard({e,onPlay}:{e:Exercise;onPlay:(e:Exercise)=>void}) {
  const [open,setOpen]=useState(false); const hasVideo=!!(e.video_url||e.video_path);
  return <article className="exercise noInstructionLeak">
    <div className="row between"><h3>{e.name}</h3><span className="tag">{e.category||'exercise'}</span></div>
    <div className="meta">#{e.exercise_id} · {e.equipment||'equipment'} · {e.location||'Home/Gym'} · {e.difficulty||'level'}</div>
    <div className="chips">{[e.body_part||e.body_parts,e.target,...(e.secondary_muscles||[]).slice(0,3)].filter(Boolean).map(m=><span key={m}>{m}</span>)}</div>
    <div className="row actions"><button disabled={!hasVideo} onClick={()=>onPlay(e)}><PlayCircle size={16}/>{hasVideo?'Watch demo':'No demo yet'}</button><button onClick={()=>setOpen(!open)}>{open?<ChevronDown size={16}/>:<ChevronRight size={16}/>}Instructions</button></div>
    {open && <div className="instructionsPanel" style={{display:'block'}}>
      {e.description && <p className="instructionDescription">{e.description}</p>}
      <ol className="instructions" style={{display:'block'}}>{(e.instructions||[]).length ? (e.instructions||[]).map((s,i)=><li key={i}>{s}</li>) : <li>No written instructions stored yet.</li>}</ol>
    </div>}
  </article>
}
function Importer({setExercises,reloadSupabase}:{setExercises:(e:Exercise[])=>void; reloadSupabase:()=>void}) {
  const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState('Ready to load the bundled V2.1 catalogue.'); const [busy,setBusy]=useState(false);
  const preview = loaded ? localCatalogue.slice(0,75) : [];
  const prepared = useMemo(()=>localCatalogue.map(e=>({...e, video_url: e.video_url || buildVideoUrl(e.video_path), has_video: !!(e.video_url || e.video_path)})),[]);
  async function importLocal(){ setExercises(prepared); setStatus(`Loaded ${prepared.length} exercises into app demo data.`); }
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
  return <div><section className="panel"><h3>Exercise Video Importer V2.1</h3><p className="muted">Supabase-first import using the corrected bucket path. The importer strips the local “Structured Workouts/” parent folder, stores playable URLs and keeps written instructions in the instructions table.</p><div className="row actions"><button className="primary" onClick={()=>{setLoaded(true);setStatus(`Catalogue loaded: ${localCatalogue.length} unique exercises.`)}}>Load catalogue</button><button disabled={!loaded} onClick={importLocal}>Import to app demo data</button><button disabled={!loaded||busy} onClick={importSupabase}><Import size={16}/>Import catalogue to Supabase</button></div><div className="status">{status}</div></section><div className="grid dash"><Card title="Records" value={(summary as any).records?.toString()||'1659'} note="Source records"/><Card title="Unique IDs" value={localCatalogue.length.toString()} note="Deduplicated exercises"/><Card title="Videos mapped" value={localCatalogue.filter(e=>e.video_path).length.toString()} note="Playable storage paths"/><Card title="Missing videos" value={(summary as any).missing_records?.toString()||'6'} note="Can be added later"/></div><section className="panel"><h3>Import preview</h3><p className="muted">Showing first {preview.length} records.</p>{preview.map(e=><div className="preview" key={e.exercise_id}><b>{e.exercise_id} · {e.name}</b><span>{e.source_file} · {e.body_part} · {e.target} · {e.category}</span><em>{e.video_path?'video mapped':'missing video'}</em></div>)}</section></div>
}

function WorkoutBuilder({exercises,plans,setPlans}:{exercises:Exercise[];plans:WorkoutPlan[];setPlans:(p:WorkoutPlan[])=>void}){
  const bodies=useMemo(()=>Array.from(new Set(exercises.map(e=>e.body_part||e.body_parts).filter(Boolean))).sort(),[exercises]);
  const [body,setBody]=useState(bodies[0] || 'waist'); const [q,setQ]=useState(''); const [name,setName]=useState('James Strength Session'); const [focus,setFocus]=useState('MMA strength and athletic development');
  const [selected,setSelected]=useState<ProgrammeExercise[]>([]);
  const list=exercises.filter(e=>(e.body_part===body||e.body_parts===body) && `${e.name} ${e.target} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())).slice(0,60);
  function savePlan(){ const plan={id:crypto.randomUUID(),name,focus,exercises:selected}; setPlans([plan,...plans]); }
  return <section className="panel"><h3>Clean Workout Builder</h3><p className="muted">Select a body part first, then build from a focused list of exercises for that body part. This avoids scrolling through the full library.</p><div className="grid two"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Workout name"/><input value={focus} onChange={e=>setFocus(e.target.value)} placeholder="Training focus"/></div><div className="split"><div><h4>1. Select body part</h4><div className="bodyList">{bodies.map(b=><button className={`listBtn ${b===body?'activeBody':''}`} onClick={()=>setBody(b)} key={b}><span>{b}</span><span>{exercises.filter(e=>e.body_part===b||e.body_parts===b).length}</span></button>)}</div></div><div><h4>2. Choose exercises for {body}</h4><input placeholder={`Search ${body} exercises`} value={q} onChange={e=>setQ(e.target.value)}/><div className="grid two" style={{marginTop:16}}><div>{list.map(e=><button className="listBtn" key={e.exercise_id} onClick={()=>setSelected([...selected,{exercise_id:e.exercise_id,name:e.name,planned_sets:3,planned_reps:'8-12'}])}><span>+ {e.name}</span><small>{e.target}</small></button>)}</div><div className="builderPlan"><div className="row between"><h4>Draft Workout</h4><button className="miniBtn" onClick={savePlan} disabled={!selected.length}><Save size={16}/>Save</button></div>{selected.length===0 && <p className="muted">Select exercises from the list.</p>}{selected.map((e,i)=><div className="preview" key={i}><b>{i+1}. {e.name}</b><span>{e.planned_sets} sets · {e.planned_reps} reps</span><button className="miniBtn" onClick={()=>setSelected(selected.filter((_,idx)=>idx!==i))}>Remove</button></div>)}</div></div></div></div><section className="panel"><h3>Saved programmes</h3>{plans.length===0 ? <p className="muted">No saved programmes yet.</p> : plans.map(p=><div className="preview" key={p.id}><b>{p.name}</b><span>{p.focus}</span><em>{p.exercises.length} exercises</em></div>)}</section></section>
}

function Today({exercises,logs,setLogs,onPlay}:{exercises:Exercise[];logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void;onPlay:(e:Exercise)=>void}){
  const seeds=['back squat','barbell romanian deadlift','push-ups','plank','dead bug','shadow boxing'];
  const picks=seeds.map(s=>exercises.find(e=>e.name.toLowerCase().includes(s))).filter(Boolean).slice(0,5) as Exercise[];
  function logExercise(e:Exercise){ const entry:WorkoutLog={id:crypto.randomUUID(),date:getTodayISO(),exercise_id:e.exercise_id,exercise_name:e.name,sets:3,reps:'8-12',weight:'',rpe:7,completed:true}; setLogs([entry,...logs]); }
  return <section className="panel"><h3>Today’s Training</h3><p className="muted">Start the planned session, watch demos inside the app, expand instructions only when needed, and log completion.</p><div className="exerciseGrid">{picks.map(e=><article className="exercise" key={e.exercise_id}><ExerciseCard e={e} onPlay={onPlay}/><div className="row actions"><button className="primary" onClick={()=>logExercise(e)}><CheckCircle2 size={16}/>Mark completed</button></div></article>)}</div><h3>Logged today</h3>{logs.filter(l=>l.date===getTodayISO()).map(l=><div className="preview" key={l.id}><b>{l.exercise_name}</b><span>{l.sets} sets · {l.reps} reps · RPE {l.rpe}</span><em>complete</em></div>)}</section>
}

function TrainingCalendar({events,setEvents}:{events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void}){
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  function toggle(id:string){ setEvents(events.map(e=>e.id===id?{...e,status:e.status==='completed'?'planned':'completed'}:e)); }
  return <section className="panel"><h3>Training Calendar</h3><p className="muted">Plan gym, MMA, boxing, kickboxing, BJJ, cardio, physio and flexibility sessions.</p><div className="calendarGrid">{days.map(d=><div className="day" key={d}><h4>{d}</h4>{events.filter(e=>e.date===d).map(e=><button className="event" key={e.id} onClick={()=>toggle(e.id)}><b>{e.time}</b> {e.title}<br/><span>{e.type} · {e.status}</span></button>)}</div>)}</div></section>
}
function EventTile({e}:{e:CalendarEvent}){return <div className="day"><h4>{e.date}</h4><div className="event"><b>{e.time}</b> {e.title}<br/><span>{e.type} · {e.status}</span></div></div>}

function FmaClasses({events,setEvents}:{events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void}){
  const classes=['Advanced MMA','Masters MMA','Adult MMA','BJJ / Grappling','Kickboxing','Boxing Fundamentals'];
  function add(title:string){ setEvents([{id:crypto.randomUUID(),date:'Tue',time:'19:00',title:`FMA ${title}`,type:'fma',status:'planned'},...events]); }
  return <section className="panel"><h3>FMA Chester Classes</h3><p className="muted">James can add the classes he plans to attend to the diary. Attendance then feeds the stats and badge system.</p><div className="grid three">{classes.map(c=><button className="sessionCard" key={c} onClick={()=>add(c)}><Shield/><h4>{c}</h4><p className="muted">Add to diary</p></button>)}</div></section>
}

function Stats({logs,profile}:{logs:WorkoutLog[];profile:AthleteProfile}){
  const data=[{w:'W1',completion:60,weight:profile.weight_kg||65},{w:'W2',completion:68,weight:(profile.weight_kg||65)-.2},{w:'W3',completion:74,weight:(profile.weight_kg||65)-.1},{w:'W4',completion:81,weight:profile.weight_kg||65}];
  const byType=[{name:'Strength',value:logs.filter(l=>l.completed).length||12},{name:'FMA',value:8},{name:'Footwork',value:16},{name:'Mobility',value:6}];
  return <div className="grid two"><section className="panel"><h3>Training Completion</h3><ResponsiveContainer width="100%" height={260}><LineChart data={data}><Line type="monotone" dataKey="completion"/><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="w"/><YAxis/><Tooltip/></LineChart></ResponsiveContainer></section><section className="panel"><h3>Session Mix</h3><ResponsiveContainer width="100%" height={260}><BarChart data={byType}><Bar dataKey="value"/><XAxis dataKey="name"/><YAxis/><Tooltip/></BarChart></ResponsiveContainer></section></div>
}
function Badges({badges}:{badges:Badge[]}){return <section className="panel"><h3>Achievement System</h3><div className="grid three">{badges.map(b=><section className="card" key={b.id}><div className="row between"><strong>{b.icon}</strong><span className="statusPill">{b.unlocked?'Unlocked':'Locked'}</span></div><h4>{b.name}</h4><p>{b.description}</p><div className="progress"><div className="bar" style={{width:`${b.progress}%`}}/></div><p className="muted">{b.progress}% progress</p></section>)}</div></section>}
function Profile({profile,setProfile}:{profile:AthleteProfile;setProfile:(p:AthleteProfile)=>void}){return <section className="panel"><h3>Athlete Profile</h3><div className="grid two"><input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/><input value={profile.gym||''} onChange={e=>setProfile({...profile,gym:e.target.value})}/><input type="number" value={profile.height_cm||''} onChange={e=>setProfile({...profile,height_cm:Number(e.target.value)})} placeholder="Height cm"/><input type="number" value={profile.weight_kg||''} onChange={e=>setProfile({...profile,weight_kg:Number(e.target.value)})} placeholder="Weight kg"/><input value={profile.belt_rank||''} onChange={e=>setProfile({...profile,belt_rank:e.target.value})}/><input type="number" value={profile.competition_weight_kg||''} onChange={e=>setProfile({...profile,competition_weight_kg:Number(e.target.value)})}/></div><textarea value={profile.goal||''} onChange={e=>setProfile({...profile,goal:e.target.value})}/><div className="grid three"><Card title="BMI" value={bmi(profile)||'-'} note="Auto calculated"/><Card title="Belt Rank" value={profile.belt_rank||'-'} note="Martial arts profile"/><Card title="Target Weight" value={`${profile.competition_weight_kg||'-'} kg`} note="Competition planning"/></div></section>}
function Admin({profile,events,plans,exercises}:{profile:AthleteProfile;events:CalendarEvent[];plans:WorkoutPlan[];exercises:Exercise[]}){return <section className="panel"><h3>Admin Portal</h3><p className="muted">V2.1 control centre for profiles, exercises, programme creation, FMA attendance, calendar planning and badge tracking.</p><table className="table"><tbody><tr><th>Athlete</th><td>{profile.name}</td></tr><tr><th>Exercises</th><td>{exercises.length}</td></tr><tr><th>Calendar events</th><td>{events.length}</td></tr><tr><th>Saved programmes</th><td>{plans.length}</td></tr><tr><th>Next milestone</th><td>Replace demo role switcher with Supabase Auth user roles.</td></tr></tbody></table></section>}

function VideoModal({title,url,onClose}:{title:string;url:string;onClose:()=>void}){return <div className="modalBackdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><div className="row between"><h3>{title}</h3><button className="miniBtn" onClick={onClose}><X size={18}/></button></div><video controls autoPlay src={url}/><p className="muted small">{url}</p></div></div>}

createRoot(document.getElementById('root')!).render(<App />);
