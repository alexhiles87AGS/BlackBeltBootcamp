import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Award, BarChart3, CalendarDays, Database, Dumbbell, Home, Library, LogOut, Menu, Plus, Shield, User, Users, Video, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { supabase, supabaseConfigured } from './supabaseClient';
import { AppData, id, loadData, resetData, saveData } from './store';
import { BodyMetric, Exercise, ExerciseType, SessionPlan, WorkoutLogSet } from './types';
import './styles.css';

type Page = 'dashboard'|'calendar'|'workout'|'library'|'builder'|'classes'|'stats'|'badges'|'profile'|'admin'|'import';
const pages: {id:Page; label:string; icon:any; admin?:boolean}[] = [
  {id:'dashboard', label:'Dashboard', icon:Home}, {id:'calendar', label:'Calendar', icon:CalendarDays}, {id:'workout', label:'Today', icon:Dumbbell}, {id:'library', label:'Exercise Library', icon:Library}, {id:'builder', label:'Workout Builder', icon:Plus}, {id:'classes', label:'FMA Classes', icon:Shield}, {id:'stats', label:'Stats', icon:BarChart3}, {id:'badges', label:'Badges', icon:Award}, {id:'profile', label:'Profile', icon:User}, {id:'admin', label:'Admin', icon:Users, admin:true}, {id:'import', label:'Exercise Import', icon:Database, admin:true}
];

function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const update = (patch: Partial<AppData>) => setData(prev => { const next = { ...prev, ...patch}; saveData(next); return next; });
  return [data, update] as const;
}

function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [demo, setDemo] = useState(localStorage.getItem('bbb.demo') === '1');
  const [page, setPage] = useState<Page>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, update] = useAppData();

  useEffect(() => { if (!supabase) return; supabase.auth.getSession().then(({data}) => setSessionEmail(data.session?.user.email ?? null)); const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSessionEmail(sess?.user.email ?? null)); return () => { sub.subscription.unsubscribe(); }; }, []);

  const authed = demo || sessionEmail;
  const profile = data.profiles.find(p => p.id === data.selectedProfileId) || data.profiles[0];

  if (!authed) return <Auth onDemo={() => { localStorage.setItem('bbb.demo','1'); setDemo(true); }} />;

  const logout = async () => { localStorage.removeItem('bbb.demo'); setDemo(false); if (supabase) await supabase.auth.signOut(); setSessionEmail(null); };

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?'open':''}`}>
      <div className="brand"><Shield size={28}/><div><strong>BlackBeltBootcamp</strong><span>Training OS</span></div><button className="icon-btn mobile-only" onClick={()=>setMenuOpen(false)}><X size={18}/></button></div>
      <nav>{pages.map(p => { const Icon=p.icon; return <button key={p.id} className={page===p.id?'active':''} onClick={()=>{setPage(p.id); setMenuOpen(false)}}><Icon size={18}/>{p.label}</button> })}</nav>
      <div className="sidebar-footer"><select value={data.selectedProfileId} onChange={e=>update({selectedProfileId:e.target.value})}>{data.profiles.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><button onClick={logout}><LogOut size={18}/>Sign out</button></div>
    </aside>
    <main className="content">
      <header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setMenuOpen(true)}><Menu/></button><div><p>Logged in as {demo?'Demo Mode':sessionEmail}</p><h1>{pages.find(p=>p.id===page)?.label}</h1></div><div className="pill"><Shield size={16}/>{profile.displayName}</div></header>
      {page==='dashboard' && <Dashboard data={data} profileId={profile.id} setPage={setPage}/>} 
      {page==='calendar' && <CalendarView data={data} update={update}/>} 
      {page==='workout' && <WorkoutScreen data={data} update={update}/>} 
      {page==='library' && <ExerciseLibrary data={data} update={update}/>} 
      {page==='builder' && <WorkoutBuilder data={data} update={update}/>} 
      {page==='classes' && <FmaClasses data={data} update={update}/>} 
      {page==='stats' && <Stats data={data}/>} 
      {page==='badges' && <Badges data={data}/>} 
      {page==='profile' && <ProfilePage data={data} update={update}/>} 
      {page==='admin' && <AdminPage data={data} update={update}/>} 
      {page==='import' && <ExerciseImportPage data={data} update={update}/>} 
    </main>
  </div>;
}

function Auth({onDemo}:{onDemo:()=>void}){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [msg,setMsg]=useState('');
  const signIn = async () => { if (!supabaseConfigured || !supabase) { setMsg('Supabase is not configured. Use demo mode or add Netlify environment variables.'); return; } const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) setMsg(error.message); };
  const signUp = async () => { if (!supabaseConfigured || !supabase) { setMsg('Supabase is not configured.'); return; } const {error}=await supabase.auth.signUp({email,password}); setMsg(error ? error.message : 'Account created. Check email confirmation settings in Supabase, then sign in.'); };
  return <div className="auth-page"><div className="auth-card"><div className="brand"><Shield size={36}/><div><strong>BlackBeltBootcamp</strong><span>Coach + athlete training platform</span></div></div><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><div className="row"><button className="primary" onClick={signIn}>Sign in</button><button onClick={signUp}>Create account</button><button onClick={onDemo}>Open demo mode</button></div><p className="muted">Create your first admin user in Supabase Authentication, or use demo mode while testing.</p>{msg&&<p className="notice">{msg}</p>}</div></div>
}

function Dashboard({data,profileId,setPage}:{data:AppData; profileId:string; setPage:(p:Page)=>void}){
  const today = new Date().toISOString().slice(0,10); const planned=data.sessions.filter(s=>s.athleteId===profileId); const completed=data.logs.length; const todaySessions=planned.filter(s=>s.date===today); const mins=data.logs.reduce((a,l)=>a+(data.sessions.find(s=>s.id===l.sessionId)?.estimatedMinutes||0),0);
  return <div className="grid"><section className="hero card span-2"><div><p className="eyebrow">Athlete command centre</p><h2>Train with structure. Track the work. Build the black belt standard.</h2><p>James’s 4-day gym manual, 15-minute footwork routine, FMA classes, badges, metrics and workout logs are all managed from here.</p><div className="row"><button className="primary" onClick={()=>setPage('workout')}>Start today</button><button onClick={()=>setPage('calendar')}>Open calendar</button></div></div><Activity size={110}/></section>
    <Metric title="Planned sessions" value={planned.length}/><Metric title="Completed logs" value={completed}/><Metric title="Training minutes" value={mins}/><Metric title="FMA classes" value={data.classes.length}/>
    <section className="card span-2"><h3>Today</h3>{todaySessions.length?todaySessions.map(s=><SessionCard key={s.id} s={s} data={data}/>):<p className="muted">No sessions planned today. Use the builder or calendar to add one.</p>}</section>
    <section className="card"><h3>Next sessions</h3>{planned.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(s=><div className="compact" key={s.id}><strong>{s.title}</strong><span>{s.date} · {s.location}</span></div>)}</section>
    <section className="card"><h3>Coach focus</h3><ul><li>Warm up properly.</li><li>Keep 1–3 reps in reserve.</li><li>Record weights and reps.</li><li>Stop sharp pain immediately.</li></ul></section>
  </div>
}
function Metric({title,value}:{title:string; value:any}){return <section className="metric card"><span>{title}</span><strong>{value}</strong></section>}
function SessionCard({s,data}:{s:SessionPlan;data:AppData}){return <div className="session-card"><div><strong>{s.title}</strong><p>{s.date} · {s.estimatedMinutes} mins · {s.location}</p></div><span className="tag">{s.type}</span></div>}

function CalendarView({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){
  const days=[...Array(21)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d.toISOString().slice(0,10)});
  const [date,setDate]=useState(days[0]);
  const sessions=data.sessions.filter(s=>s.date===date && s.athleteId===data.selectedProfileId);
  return <div className="grid"><section className="card span-3"><h3>Training Calendar</h3><div className="day-grid">{days.map(d=><button key={d} className={date===d?'active day':'day'} onClick={()=>setDate(d)}><span>{new Date(d).toLocaleDateString('en-GB',{weekday:'short'})}</span><strong>{new Date(d).getDate()}</strong></button>)}</div></section><section className="card span-2"><h3>{new Date(date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</h3>{sessions.length?sessions.map(s=><SessionCard key={s.id} s={s} data={data}/>):<p className="muted">No planned session.</p>}</section><QuickAddSession data={data} update={update} date={date}/></div>
}
function QuickAddSession({data,update,date}:{data:AppData; update:(p:Partial<AppData>)=>void; date:string}){
  const [title,setTitle]=useState('Custom Session'); const [type,setType]=useState<ExerciseType>('Strength');
  const add=()=>update({sessions:[...data.sessions,{id:id('session'),title,date,type,location:'Home',estimatedMinutes:30,athleteId:data.selectedProfileId,exercises:[],coachNotes:'Custom calendar item'}]});
  return <section className="card"><h3>Add to day</h3><input value={title} onChange={e=>setTitle(e.target.value)}/><select value={type} onChange={e=>setType(e.target.value as ExerciseType)}>{['Strength','Cardio','Mobility','Physio','Footwork','MMA','Boxing','Kickboxing','BJJ','Recovery'].map(t=><option key={t}>{t}</option>)}</select><button className="primary" onClick={add}>Add session</button></section>
}

function WorkoutScreen({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){
  const today=new Date().toISOString().slice(0,10); const [selected,setSelected]=useState(data.sessions.find(s=>s.date===today)?.id || data.sessions[0]?.id); const session=data.sessions.find(s=>s.id===selected); const [sets,setSets]=useState<Record<string,WorkoutLogSet[]>>({});
  if(!session) return <p>No session found.</p>;
  const save=()=>{const completion = Math.round((Object.values(sets).flat().filter(x=>x.complete).length || session.exercises.length)/(session.exercises.reduce((a,e)=>a+(e.sets||1),0))*100); update({logs:[...data.logs,{id:id('log'),sessionId:session.id,athleteId:session.athleteId,date:new Date().toISOString().slice(0,10),completion:Math.min(100,completion),sets}]}); alert('Workout logged.');};
  const markExercise=(exerciseId:string, n=1)=> setSets(prev=>({ ...prev, [exerciseId]: [...Array(n)].map((_,i)=>({setNumber:i+1, complete:true})) }));
  return <div className="grid"><section className="card span-3"><div className="row between"><h3>Workout Screen</h3><select value={selected} onChange={e=>setSelected(e.target.value)}>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.date} · {s.title}</option>)}</select></div><div className="workout-head"><h2>{session.title}</h2><p>{session.date} · {session.location} · {session.estimatedMinutes} mins</p><p>{session.coachNotes}</p></div>{session.exercises.map(item=>{const ex=data.exercises.find(e=>e.id===item.exerciseId); if(!ex) return null; const count=item.sets||1; return <div className="exercise-log" key={ex.id}><div><h3>{ex.name}</h3><p>{item.sets?`${item.sets} sets · ${item.reps} · rest ${item.restSec||60}s`:`${item.durationMin||ex.durationMin} minutes`}</p><p className="muted">{ex.instructions}</p><div className="tags">{ex.bodyParts.map(b=><span key={b}>{b}</span>)}</div>{ex.videoUrl?<a target="_blank" href={ex.videoUrl}>Watch demo video</a>:<span className="video-placeholder"><Video size={16}/>Demo link can be added in Admin</span>}</div><div className="set-grid">{[...Array(count)].map((_,i)=><div key={i} className="set-row"><strong>Set {i+1}</strong><input placeholder="kg" onChange={e=>setSets(prev=>({ ...prev, [ex.id]: Object.assign([...Array(count)].map((_,j)=>prev[ex.id]?.[j]||{setNumber:j+1}),{[i]:{...(prev[ex.id]?.[i]||{setNumber:i+1}), weight:e.target.value}}) }))}/><input placeholder="reps/time" onChange={e=>setSets(prev=>({ ...prev, [ex.id]: Object.assign([...Array(count)].map((_,j)=>prev[ex.id]?.[j]||{setNumber:j+1}),{[i]:{...(prev[ex.id]?.[i]||{setNumber:i+1}), reps:e.target.value}}) }))}/><label><input type="checkbox" onChange={e=>setSets(prev=>({ ...prev, [ex.id]: Object.assign([...Array(count)].map((_,j)=>prev[ex.id]?.[j]||{setNumber:j+1}),{[i]:{...(prev[ex.id]?.[i]||{setNumber:i+1}), complete:e.target.checked}}) }))}/> Done</label></div>)}</div><button onClick={()=>markExercise(ex.id,count)}>Mark exercise complete</button></div>})}<button className="primary wide" onClick={save}>Save workout log</button></section></div>
}

function ExerciseLibrary({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){
  const [q,setQ]=useState(''); const [body,setBody]=useState('All'); const bodies=['All',...Array.from(new Set(data.exercises.flatMap(e=>e.bodyParts)))]; const filtered=data.exercises.filter(e=>(body==='All'||e.bodyParts.includes(body)) && [e.name,e.type,e.equipment,e.instructions].join(' ').toLowerCase().includes(q.toLowerCase()));
  return <div className="grid"><section className="card span-3"><div className="row between"><h3>Exercise Directory</h3><div className="row"><input placeholder="Search exercise" value={q} onChange={e=>setQ(e.target.value)}/><select value={body} onChange={e=>setBody(e.target.value)}>{bodies.map(b=><option key={b}>{b}</option>)}</select></div></div><div className="exercise-grid">{filtered.map(ex=><ExerciseCard key={ex.id} ex={ex}/>)}</div></section><AddExercise data={data} update={update}/></div>
}
function ExerciseCard({ex}:{ex:Exercise}){return <div className="exercise-card"><div className="row between"><h3>{ex.name}</h3><span className="tag">{ex.type}</span></div><p>{ex.instructions}</p><p className="muted">{ex.equipment} · {ex.location} · {ex.difficulty}</p><div className="tags">{ex.muscles.map(m=><span key={m}>{m}</span>)}</div>{ex.videoUrl?<a href={ex.videoUrl} target="_blank">Demo video</a>:<span className="video-placeholder"><Video size={14}/>No demo yet</span>}</div>}
function AddExercise({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){const [name,setName]=useState(''); const [videoUrl,setVideo]=useState(''); const add=()=>{if(!name.trim())return; const ex:Exercise={id:id('ex'),name,type:'Strength',location:'Gym',equipment:'TBC',bodyParts:['Full Body'],muscles:['TBC'],difficulty:'Beginner',instructions:'Add coaching notes and standards.',videoUrl,source:'Admin'}; update({exercises:[...data.exercises,ex]}); setName(''); setVideo('');}; return <section className="card"><h3>Admin quick add</h3><input placeholder="Exercise name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Demo video URL" value={videoUrl} onChange={e=>setVideo(e.target.value)}/><button className="primary" onClick={add}>Add exercise</button></section>}

function WorkoutBuilder({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){const [title,setTitle]=useState('My Custom Workout'); const [selected,setSelected]=useState<string[]>([]); const add=()=>{if(!selected.length)return; const sess:SessionPlan={id:id('custom'),title,date:new Date().toISOString().slice(0,10),type:'Strength',location:'Gym',estimatedMinutes:45,athleteId:data.selectedProfileId,coachNotes:'Built from the exercise library.',exercises:selected.map(exerciseId=>({exerciseId,sets:3,reps:'10-12',restSec:75}))}; update({sessions:[...data.sessions,sess]}); alert('Workout added to today.');}; return <div className="grid"><section className="card span-2"><h3>Workout Builder</h3><input value={title} onChange={e=>setTitle(e.target.value)}/><div className="exercise-list">{data.exercises.map(e=><label key={e.id}><input type="checkbox" checked={selected.includes(e.id)} onChange={ev=>setSelected(prev=>ev.target.checked?[...prev,e.id]:prev.filter(x=>x!==e.id))}/>{e.name}<span>{e.type}</span></label>)}</div><button className="primary" onClick={add}>Save and schedule today</button></section><section className="card"><h3>Selected</h3>{selected.map(x=>data.exercises.find(e=>e.id===x)?.name).map(n=><p key={n}>{n}</p>)}</section></div>}

function FmaClasses({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){const addClass=(c:any)=>{const date=new Date(); const sess:SessionPlan={id:id('fma'),title:c.name,date:date.toISOString().slice(0,10),type:c.category,location:'FMA Chester',estimatedMinutes:c.durationMin,athleteId:data.selectedProfileId,coachNotes:`${c.day} ${c.time} · ${c.level}`,exercises:[]}; update({sessions:[...data.sessions,sess]});}; return <div className="grid"><section className="card span-3"><h3>FMA Chester Class Schedule</h3><p className="muted">Replace these placeholders with the exact FMA class times when you provide the final schedule. James can select the classes he is attending and add them to his diary.</p><div className="class-grid">{data.classes.map(c=><div className="class-card" key={c.id}><h3>{c.name}</h3><p>{c.day} · {c.time} · {c.durationMin} mins</p><p>{c.level} · {c.category}</p><button className="primary" onClick={()=>addClass(c)}>Add to diary</button></div>)}</div></section></div>}
function Stats({data}:{data:AppData}){const logs=data.logs; const chart=data.metrics.filter(m=>m.athleteId===data.selectedProfileId).map(m=>({date:m.date,weight:m.weightKg,energy:m.energy})); const byType=Object.entries(data.sessions.reduce((a:any,s)=>{a[s.type]=(a[s.type]||0)+1;return a;},{})).map(([name,value])=>({name,value})); return <div className="grid"><Metric title="Workout logs" value={logs.length}/><Metric title="Avg completion" value={logs.length?Math.round(logs.reduce((a,l)=>a+l.completion,0)/logs.length)+'%':'0%'}/><Metric title="Exercises" value={data.exercises.length}/><Metric title="Classes" value={data.classes.length}/><section className="card span-2"><h3>Weight Trend</h3><ResponsiveContainer width="100%" height={260}><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Area type="monotone" dataKey="weight" /></AreaChart></ResponsiveContainer></section><section className="card"><h3>Planned Session Mix</h3><ResponsiveContainer width="100%" height={260}><BarChart data={byType}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" /></BarChart></ResponsiveContainer></section></div>}
function Badges({data}:{data:AppData}){const count=data.logs.length; return <div className="grid">{data.badges.map(b=>{const earned=b.rule==='complete_1'?count>=1:b.rule==='complete_100'?count>=100:false; return <section key={b.id} className={`badge card ${earned?'earned':''}`}><strong>{b.icon}</strong><h3>{b.name}</h3><p>{b.description}</p><span>{earned?'Earned':'Locked'}</span></section>})}</div>}
function ProfilePage({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){const profile=data.profiles.find(p=>p.id===data.selectedProfileId)!; const latest=data.metrics.filter(m=>m.athleteId===profile.id).slice(-1)[0] || {}; const [metric,setMetric]=useState<BodyMetric>({id:id('metric'),athleteId:profile.id,date:new Date().toISOString().slice(0,10),weightKg:latest.weightKg,heightCm:latest.heightCm,energy:8,sleep:8}); const save=()=>update({metrics:[...data.metrics,metric]}); return <div className="grid"><section className="card span-2"><h3>{profile.displayName}</h3><p>{profile.primarySport}</p><p>{profile.goals}</p><div className="profile-metrics"><Metric title="Height" value={`${latest.heightCm||'-'} cm`}/><Metric title="Weight" value={`${latest.weightKg||'-'} kg`}/><Metric title="BMI" value={latest.heightCm&&latest.weightKg?(latest.weightKg/Math.pow(latest.heightCm/100,2)).toFixed(1):'-'}/></div></section><section className="card"><h3>Add body metric</h3><input type="number" placeholder="Weight kg" value={metric.weightKg||''} onChange={e=>setMetric({...metric,weightKg:Number(e.target.value)})}/><input type="number" placeholder="Height cm" value={metric.heightCm||''} onChange={e=>setMetric({...metric,heightCm:Number(e.target.value)})}/><input type="number" placeholder="Sleep hours" value={metric.sleep||''} onChange={e=>setMetric({...metric,sleep:Number(e.target.value)})}/><input placeholder="Notes" value={metric.notes||''} onChange={e=>setMetric({...metric,notes:e.target.value})}/><button className="primary" onClick={save}>Save metric</button></section></div>}
function AdminPage({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){const [email,setEmail]=useState('new@athlete.local'); const [name,setName]=useState('New Athlete'); const add=()=>update({profiles:[...data.profiles,{id:id('user'),email,displayName:name,role:'athlete',primarySport:'MMA'}]}); const clear=()=>{ if(confirm('Reset demo/local data?')){ resetData(); location.reload(); }}; return <div className="grid"><section className="card"><h3>Create athlete profile</h3><input value={name} onChange={e=>setName(e.target.value)}/><input value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary" onClick={add}>Add athlete</button></section><section className="card"><h3>Platform status</h3><p>Profiles: {data.profiles.length}</p><p>Exercises: {data.exercises.length}</p><p>Sessions: {data.sessions.length}</p><p>Logs: {data.logs.length}</p><button onClick={clear}>Reset local demo data</button></section><section className="card span-2"><h3>Implementation notes</h3><ul><li>ExerciseDB Pro import can map JSON into the exercises table.</li><li>Add open-source video URLs in Exercise Library or Admin quick add.</li><li>FMA timetable can be updated manually from the classes table.</li><li>Supabase schema is included under /supabase/schema.sql.</li></ul></section></div>}


type ImportExerciseRecord = {
  uid: string;
  sourceId: string;
  sourceFile: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  description: string;
  difficulty: string;
  category: string;
  videoPath?: string;
  hasVideo: boolean;
};

function ExerciseImportPage({data,update}:{data:AppData; update:(p:Partial<AppData>)=>void}){
  const [catalog,setCatalog]=useState<ImportExerciseRecord[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [status,setStatus]=useState('Ready to load the bundled 1,659 exercise catalogue.');
  const [filter,setFilter]=useState('all');
  const [busy,setBusy]=useState(false);

  const loadCatalog = async () => {
    setBusy(true);
    try {
      const res = await fetch('/import-data/exercise-catalog.json');
      if(!res.ok) throw new Error(`Could not load exercise-catalog.json (${res.status})`);
      const json = await res.json();
      setCatalog(json.exercises || []);
      setSummary(json.summary || null);
      setStatus(`Loaded ${(json.exercises||[]).length} exercise records. ${(json.exercises||[]).filter((x:ImportExerciseRecord)=>x.hasVideo).length} have mapped videos.`);
    } catch(e:any) { setStatus(e.message); }
    setBusy(false);
  };

  const toType = (category:string): ExerciseType => {
    const c=(category||'').toLowerCase();
    if(c.includes('cardio')) return 'Cardio';
    if(c.includes('stretch') || c.includes('yoga') || c.includes('pilate')) return 'Mobility';
    if(c.includes('mobility') || c.includes('balance')) return 'Mobility';
    if(c.includes('recovery')) return 'Recovery';
    return 'Strength';
  };
  const toDifficulty = (difficulty:string): Exercise['difficulty'] => {
    const d=(difficulty||'beginner').toLowerCase();
    if(d.includes('advanced')) return 'Advanced';
    if(d.includes('intermediate')) return 'Intermediate';
    return 'Beginner';
  };
  const videoUrlFor = (record: ImportExerciseRecord) => {
    if(!record.videoPath) return undefined;
    if(supabase) return supabase.storage.from('exercise-videos').getPublicUrl(record.videoPath).data.publicUrl;
    const base = import.meta.env.VITE_SUPABASE_URL;
    if(!base) return record.videoPath;
    return `${base}/storage/v1/object/public/exercise-videos/${record.videoPath.split('/').map(encodeURIComponent).join('/')}`;
  };

  const importLocal = () => {
    if(!catalog.length) return;
    const existing = new Set(data.exercises.map(e => e.importUid || e.id));
    const imported: Exercise[] = catalog.filter(r => !existing.has(r.uid)).map(r => ({
      id: r.uid,
      importUid: r.uid,
      sourceId: r.sourceId,
      sourceFile: r.sourceFile,
      name: r.name,
      type: toType(r.category),
      location: r.sourceFile.toLowerCase().includes('gym') ? 'Gym' : 'Home',
      equipment: r.equipment || 'body weight',
      bodyParts: [r.bodyPart].filter(Boolean),
      muscles: [r.target, ...(r.secondaryMuscles || [])].filter(Boolean),
      difficulty: toDifficulty(r.difficulty),
      instructions: (r.instructions || []).join('\n'),
      description: r.description,
      videoUrl: videoUrlFor(r),
      videoPath: r.videoPath,
      source: r.sourceFile
    }));
    update({exercises:[...data.exercises, ...imported]});
    setStatus(`Imported ${imported.length} new exercises into the local app library. Existing records were skipped.`);
  };

  const importSupabase = async () => {
    if(!supabaseConfigured || !supabase) { setStatus('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.'); return; }
    if(!catalog.length) return;
    setBusy(true);
    let inserted = 0;
    try {
      for(let i=0; i<catalog.length; i+=250){
        const batch = catalog.slice(i,i+250).map(r => ({
          import_uid: r.uid,
          source_id: r.sourceId,
          source_file: r.sourceFile,
          name: r.name,
          description: r.description,
          instructions: (r.instructions || []).join('\n'),
          exercise_type: toType(r.category),
          location: r.sourceFile.toLowerCase().includes('gym') ? 'Gym' : 'Home',
          equipment: r.equipment || 'body weight',
          difficulty: toDifficulty(r.difficulty),
          body_parts: [r.bodyPart].filter(Boolean),
          muscles: [r.target, ...(r.secondaryMuscles || [])].filter(Boolean),
          video_url: videoUrlFor(r),
          video_path: r.videoPath,
          source: r.sourceFile,
          archived: false
        }));
        const { error } = await supabase.from('exercises').upsert(batch, { onConflict: 'import_uid' });
        if(error) throw error;
        inserted += batch.length;
        setStatus(`Imported ${inserted}/${catalog.length} records into Supabase...`);
      }
      setStatus(`Supabase import complete: ${inserted} records upserted. You can now use the Exercise Library and Workout Builder with the full catalogue.`);
    } catch(e:any){ setStatus(`Supabase import failed: ${e.message}. Make sure you have run the latest supabase/schema.sql.`); }
    setBusy(false);
  };

  const visible = catalog.filter(r => filter==='all' ? true : filter==='missing' ? !r.hasVideo : r.sourceFile===filter).slice(0,75);
  const sourceFiles = Array.from(new Set(catalog.map(r=>r.sourceFile))).sort();

  return <div className="grid">
    <section className="card span-3">
      <h3>Exercise Video Importer</h3>
      <p className="muted">This importer uses the bundled JSON catalogue and your Supabase Storage bucket named <strong>exercise-videos</strong>. Videos are matched from the structured destination paths in the sort report, so subfolders are fully supported.</p>
      <div className="row"><button className="primary" onClick={loadCatalog} disabled={busy}>Load catalogue</button><button onClick={importLocal} disabled={!catalog.length || busy}>Import to app demo data</button><button onClick={importSupabase} disabled={!catalog.length || busy}>Import / upsert to Supabase</button></div>
      <p className="notice">{status}</p>
    </section>
    {summary && <><Metric title="Records" value={summary.records}/><Metric title="Unique IDs" value={summary.unique_record_ids}/><Metric title="Videos found" value={summary.videos_found}/><Metric title="Missing videos" value={summary.missing_records}/></>}
    <section className="card span-3"><h3>Import preview</h3><div className="row"><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All files</option><option value="missing">Missing videos only</option>{sourceFiles.map(f=><option key={f} value={f}>{f}</option>)}</select><span className="muted">Showing first {visible.length} records from current filter.</span></div><div className="import-table">{visible.map(r=><div className="import-row" key={r.uid}><div><strong>{r.sourceId} · {r.name}</strong><span>{r.sourceFile} · {r.bodyPart} · {r.target} · {r.category} · {r.difficulty}</span></div><span className={r.hasVideo?'tag ok':'tag danger'}>{r.hasVideo?'video mapped':'missing video'}</span></div>)}</div></section>
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>);
