import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock,
  Database, Dumbbell, Home, Import, Library, LogOut, Medal, Menu, PlayCircle, Plus,
  Save, Search, Shield, Target, Trophy, User, Users, Video, X, ClipboardList
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase, buildVideoUrl } from './supabaseClient';
import catalogue from './data/exercise_catalogue.json';
import summary from './data/video_sort_summary.json';
import type { AppUser, AthleteProfile, Badge, CalendarEvent, Exercise, ExerciseLogSet, ProgrammeExercise, SessionType, WorkoutLog, WorkoutPlan } from './types';
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
  { page: 'profile', label: 'Athlete Profile', icon: <User size={18}/> },
  { page: 'admin', label: 'Admin Console', icon: <Users size={18}/>, roles: ['admin','coach'] },
  { page: 'import', label: 'Exercise Import', icon: <Database size={18}/>, roles: ['admin','coach'] },
];

const demoUsers: AppUser[] = [
  { id: 'admin-alex', email: 'alex@blackbeltbootcamp.app', password: 'admin123', name: 'Alex Hiles', role: 'admin', athlete_id: 'james-demo' },
  { id: 'athlete-james', email: 'james@blackbeltbootcamp.app', password: 'james123', name: 'James Hiles', role: 'athlete', athlete_id: 'james-demo' },
];

const defaultProfile: AthleteProfile = {
  id: 'james-demo',
  name: 'James Hiles',
  email: 'james@blackbeltbootcamp.app',
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
  { exercise_id: 'starter-1', name: 'bench press', description: 'A compound upper body pressing exercise.', equipment:'barbell, bench', category:'strength', difficulty:'intermediate', body_part:'chest', target:'pectorals', location:'Gym', secondary_muscles:['anterior delts','triceps'], instructions:['Set your eyes under the bar and plant your feet.','Squeeze shoulder blades together and brace.','Lower the bar with control and press smoothly.'] },
  { exercise_id: 'starter-2', name: 'plank', description: 'A static core exercise to build bracing and trunk endurance.', equipment:'body weight', category:'strength', difficulty:'beginner', body_part:'waist', target:'abs', location:'Home', secondary_muscles:['glutes'], instructions:['Place forearms under shoulders.','Brace abs and glutes.','Hold a straight line while breathing.'] },
];

const initialBadges: Badge[] = [
  { id:'b1', name:'First Workout', icon:'🏁', description:'Complete the first logged workout.', unlocked:true, progress:100 },
  { id:'b2', name:'7 Day Streak', icon:'🔥', description:'Train seven days in a row.', unlocked:false, progress:57 },
  { id:'b3', name:'Footwork Focus', icon:'⚡', description:'Complete 30 footwork sessions.', unlocked:false, progress:36 },
  { id:'b4', name:'FMA Regular', icon:'🥋', description:'Attend 25 FMA classes.', unlocked:false, progress:44 },
  { id:'b5', name:'Strength Builder', icon:'💪', description:'Log 50 strength exercises.', unlocked:false, progress:62 },
  { id:'b6', name:'Fight Camp Ready', icon:'🏆', description:'Complete a full programme block.', unlocked:false, progress:18 },
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
function todayISO(){ return new Date().toISOString().slice(0,10); }
function addDays(date: Date, days: number){ const d = new Date(date); d.setDate(d.getDate()+days); return d; }
function startOfWeek(date = new Date()){ const d = new Date(date); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0,0,0,0); return d; }
function weekDates(){ const start = startOfWeek(); return Array.from({length:7}, (_,i)=>addDays(start,i)); }
function iso(date: Date){ return date.toISOString().slice(0,10); }
function dayLabel(date: Date){ return date.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }); }
function titleCase(v?: string | null){ return (v || '').split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
function sentence(v?: string | null){ const s = (v || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function bodyOf(e: Exercise){ return e.body_part || e.body_parts || 'general'; }
function safeVideo(e: Exercise){ return e.video_url || buildVideoUrl(e.video_path); }
function bmi(profile: AthleteProfile){ if(!profile.height_cm || !profile.weight_kg) return ''; const m = profile.height_cm/100; return (profile.weight_kg/(m*m)).toFixed(1); }
function classNameForType(type?: string){ return `typeBadge type-${(type||'general').toLowerCase().replace(/\s+/g,'-')}`; }
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

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => storage('bbb_current_user', null));
  const [page, setPage] = useState<Page>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<AthleteProfile>(() => storage('bbb_profile', defaultProfile));
  const [athletes, setAthletes] = useState<AthleteProfile[]>(() => storage('bbb_athletes', [defaultProfile]));
  const [users, setUsers] = useState<AppUser[]>(() => storage('bbb_users', demoUsers));
  const [exercises, setExercises] = useState<Exercise[]>(() => storage('bbb_exercises', starter));
  const [events, setEvents] = useState<CalendarEvent[]>(() => storage('bbb_events', getInitialEvents()));
  const [logs, setLogs] = useState<WorkoutLog[]>(() => storage('bbb_logs', []));
  const [plans, setPlans] = useState<WorkoutPlan[]>(() => storage('bbb_plans', []));
  const [video, setVideo] = useState<{url: string; title: string} | null>(null);
  const [activeSession, setActiveSession] = useState<CalendarEvent | null>(null);

  useEffect(() => { setStorage('bbb_current_user', currentUser); }, [currentUser]);
  useEffect(() => { setStorage('bbb_profile', profile); }, [profile]);
  useEffect(() => { setStorage('bbb_athletes', athletes); }, [athletes]);
  useEffect(() => { setStorage('bbb_users', users); }, [users]);
  useEffect(() => { setStorage('bbb_exercises', exercises); }, [exercises]);
  useEffect(() => { setStorage('bbb_events', events); }, [events]);
  useEffect(() => { setStorage('bbb_logs', logs); }, [logs]);
  useEffect(() => { setStorage('bbb_plans', plans); }, [plans]);

  useEffect(() => {
    if (currentUser && currentUser.athlete_id) {
      const athlete = athletes.find(a => a.id === currentUser.athlete_id);
      if (athlete) setProfile(athlete);
    }
  }, [currentUser?.id]);

  useEffect(() => { if (currentUser) loadFromSupabase(); }, [currentUser?.id]);

  async function loadFromSupabase() {
    if (!supabase) return;
    const { data } = await supabase.from('exercises').select('*').eq('is_archived', false).order('name');
    if (data?.length) setExercises(data as Exercise[]);
  }

  function handleLogout(){ setCurrentUser(null); setDrawerOpen(false); }
  function go(p: Page){ setPage(p); setDrawerOpen(false); window.scrollTo({top:0, behavior:'smooth'}); }
  function openSession(event: CalendarEvent){ setActiveSession(event); setPage('session'); setDrawerOpen(false); }

  if (!currentUser) return <LoginScreen users={users} setCurrentUser={setCurrentUser} />;

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(currentUser.role));
  const activeTitle = page === 'session' ? (activeSession?.class_name || activeSession?.type === 'FMA' ? 'Class Session' : 'Complete Workout') : visibleNav.find(n=>n.page===page)?.label || 'Dashboard';

  return <div className="appShell">
    <header className="topbar">
      <button className="iconButton" onClick={()=>setDrawerOpen(true)} aria-label="Open menu"><Menu size={24}/></button>
      <div className="topBrand"><Shield size={22}/><div><b>BlackBeltBootcamp</b><span>Training OS V2.2.1</span></div></div>
      <div className="topContext"><span>{currentUser.name}</span><em>{titleCase(currentUser.role)}</em></div>
    </header>

    {drawerOpen && <div className="drawerBackdrop" onClick={()=>setDrawerOpen(false)} />}
    <aside className={`drawer ${drawerOpen ? 'open' : ''}`}>
      <div className="drawerHead"><div className="brand"><Shield className="brandIcon"/><div><h1>BlackBeltBootcamp</h1><span>Training OS V2.2.1</span></div></div><button className="iconButton" onClick={()=>setDrawerOpen(false)}><X size={20}/></button></div>
      <div className="drawerUser"><b>{currentUser.name}</b><span>{currentUser.email}</span><em>{titleCase(currentUser.role)} profile</em></div>
      <nav>{visibleNav.map(n => <button key={n.page} onClick={() => go(n.page)} className={page===n.page?'active':''}>{n.icon}<span>{n.label}</span></button>)}</nav>
      <button className="logoutButton" onClick={handleLogout}><LogOut size={18}/> Sign out</button>
    </aside>

    <main className="pageFrame">
      <section className="pageHeader"><span className="muted">{profile.name} · {profile.gym}</span><h2>{activeTitle}</h2></section>
      {page==='dashboard' && <Dashboard logs={logs} events={events} badges={initialBadges} profile={profile} setPage={go} openSession={openSession}/>} 
      {page==='library' && <ExerciseLibrary exercises={exercises} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} />}
      {page==='import' && <Importer setExercises={setExercises} reloadSupabase={loadFromSupabase} exercises={exercises} />}
      {page==='builder' && <WorkoutBuilder exercises={exercises} plans={plans} setPlans={setPlans} />}
      {page==='today' && <Today events={events} exercises={exercises} logs={logs} setLogs={setLogs} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})} openSession={openSession}/>} 
      {page==='calendar' && <TrainingCalendar events={events} setEvents={setEvents} openSession={openSession}/>} 
      {page==='session' && <SessionWorkout session={activeSession} setSession={setActiveSession} exercises={exercises} logs={logs} setLogs={setLogs} events={events} setEvents={setEvents} onPlay={(e)=>setVideo({url: safeVideo(e), title: titleCase(e.name)})}/>} 
      {page==='fma' && <FmaClasses events={events} setEvents={setEvents} openSession={openSession}/>} 
      {page==='stats' && <Stats logs={logs} events={events} profile={profile}/>} 
      {page==='badges' && <Badges badges={initialBadges}/>} 
      {page==='profile' && <Profile profile={profile} setProfile={(p)=>{setProfile(p); setAthletes(athletes.map(a=>a.id===p.id?p:a));}}/>} 
      {page==='admin' && <Admin profile={profile} events={events} plans={plans} exercises={exercises} setExercises={setExercises} users={users} setUsers={setUsers} athletes={athletes} setAthletes={setAthletes}/>} 
    </main>
    {video && <VideoModal title={video.title} url={video.url} onClose={()=>setVideo(null)} />}
  </div>;
}

function LoginScreen({users,setCurrentUser}:{users:AppUser[]; setCurrentUser:(u:AppUser)=>void}){
  const [email,setEmail]=useState('james@blackbeltbootcamp.app');
  const [password,setPassword]=useState('james123');
  const [status,setStatus]=useState('');
  async function login(e: React.FormEvent){
    e.preventDefault(); setStatus('');
    const demo = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (demo) { setCurrentUser(demo); return; }
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        const role = (data.user.user_metadata?.role || 'athlete') as AppUser['role'];
        setCurrentUser({ id:data.user.id, email:data.user.email || email, name:data.user.user_metadata?.name || data.user.email || email, role, athlete_id:data.user.user_metadata?.athlete_id });
        return;
      }
      setStatus(error?.message || 'Unable to sign in.');
      return;
    }
    setStatus('No matching demo profile. Use the demo buttons or configure Supabase Auth.');
  }
  function quick(user:AppUser){ setEmail(user.email); setPassword(user.password || ''); setCurrentUser(user); }
  return <main className="loginPage">
    <section className="loginCard">
      <div className="loginBrand"><Shield size={42}/><div><h1>BlackBeltBootcamp</h1><p>Professional training hub for James Hiles</p></div></div>
      <form onSubmit={login} className="loginForm">
        <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>
        {status && <div className="status error">{status}</div>}
        <button className="primary big" type="submit">Sign in</button>
      </form>
      <div className="demoGrid">
        <button onClick={()=>quick(demoUsers[1])}>Open James Demo</button>
        <button onClick={()=>quick(demoUsers[0])}>Open Admin Profile</button>
      </div>
      <p className="muted smallText">The app stays signed in on this device until you choose Sign out. Supabase Auth sign-in is supported for real users once accounts are created.</p>
    </section>
  </main>
}

function Dashboard({logs,events,badges,profile,setPage,openSession}:{logs:WorkoutLog[];events:CalendarEvent[];badges:Badge[];profile:AthleteProfile;setPage:(p:Page)=>void;openSession:(e:CalendarEvent)=>void}) {
  const today = todayISO();
  const todaySessions = events.filter(e=>e.date===today).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const next = todaySessions.find(e=>e.status==='planned') || events.find(e=>e.status==='planned');
  const sessionsDone = events.filter(e=>e.status==='completed').length;
  const exercisesDone = logs.filter(l=>l.completed).length;
  const streak = calcStreak(logs, events);
  const weekComplete = Math.round((events.filter(e=>e.status==='completed').length / Math.max(events.length,1))*100);
  return <div className="dashboardGrid">
    <section className="heroPanel athleteHero">
      <div>
        <span className="eyebrow">Today's focus</span>
        <h1>{profile.name.split(' ')[0]}, keep stacking the small wins.</h1>
        <p>{profile.goal}</p>
        <div className="heroActions"><button className="primary" onClick={()=> next ? openSession(next) : setPage('today')}><PlayCircle size={18}/>Start next session</button><button onClick={()=>setPage('calendar')}><CalendarDays size={18}/>View week</button></div>
      </div>
      <div className="readinessRing"><b>{weekComplete}%</b><span>Weekly completion</span></div>
    </section>
    <div className="kpiRow"><Kpi label="Sessions Completed" value={sessionsDone}/><Kpi label="Exercises Completed" value={exercisesDone}/><Kpi label="Training Streak" value={`${streak} days`}/><Kpi label="BMI" value={bmi(profile) || '—'}/></div>
    <section className="panel"><div className="row between"><h3>Today’s Schedule</h3><button className="miniBtn" onClick={()=>setPage('calendar')}>Open calendar</button></div>{todaySessions.length===0 && <p className="muted">No sessions planned today. Add one from the calendar or FMA classes page.</p>}{todaySessions.map(s=><SessionRow key={s.id} event={s} onClick={()=>openSession(s)}/>)}</section>
    <section className="panel"><h3>Next Achievement</h3>{badges.filter(b=>!b.unlocked).slice(0,3).map(b=><div className="badgeProgress" key={b.id}><span>{b.icon}</span><div><b>{b.name}</b><p>{b.description}</p><div className="progress"><i style={{width:`${b.progress}%`}}/></div></div></div>)}</section>
  </div>
}
function Kpi({label,value}:{label:string;value:string|number}){ return <div className="kpi"><span>{label}</span><b>{value}</b></div> }
function SessionRow({event,onClick}:{event:CalendarEvent; onClick:()=>void}){ return <button className="sessionRow" onClick={onClick}><span className={classNameForType(event.type)}>{event.type}</span><div><b>{event.time || 'Time TBC'} · {event.title}</b><em>{event.date}</em></div><ChevronRight size={18}/></button> }

function ExerciseLibrary({exercises,onPlay}:{exercises:Exercise[];onPlay:(e:Exercise)=>void}){
  const [q,setQ]=useState(''); const [category,setCategory]=useState('all'); const [body,setBody]=useState('all');
  const cats=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>e.category).filter(Boolean))).sort()], [exercises]);
  const bodies=useMemo(()=>['all',...Array.from(new Set(exercises.map(e=>bodyOf(e)).filter(Boolean))).sort()], [exercises]);
  const filtered=exercises.filter(e=>
    (category==='all'||e.category===category) &&
    (body==='all'||bodyOf(e)===body) &&
    `${e.name} ${e.exercise_id} ${e.target} ${bodyOf(e)} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0,150);
  return <section className="panel"><div className="toolbar"><div className="searchBox"><Search size={18}/><input placeholder="Search exercise, muscle or equipment" value={q} onChange={e=>setQ(e.target.value)}/></div><select value={body} onChange={e=>setBody(e.target.value)}>{bodies.map(c=><option key={c} value={c}>{c==='all'?'All Body Parts':titleCase(c)}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c} value={c}>{c==='all'?'All Types':titleCase(c)}</option>)}</select></div><div className="exerciseGrid">{filtered.map(e=><ExerciseCard key={e.exercise_id} e={e} onPlay={onPlay}/>)}</div></section>
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

function TrainingCalendar({events,setEvents,openSession}:{events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;openSession:(e:CalendarEvent)=>void}){
  const days = weekDates();
  const [newDate,setNewDate]=useState(todayISO()); const [newTime,setNewTime]=useState('18:00'); const [newTitle,setNewTitle]=useState('Training Session'); const [newType,setNewType]=useState<SessionType>('Gym');
  function add(){ setEvents([...events,{id:crypto.randomUUID(), date:newDate, time:newTime, title:newTitle, type:newType, status:'planned'}]); }
  return <div className="calendarPage">
    <section className="panel"><div className="row between"><div><h3>Weekly Training Calendar</h3><p className="muted">Click any session to open the completion page.</p></div></div><div className="weekGrid">{days.map(d=>{ const dayEvents=events.filter(e=>e.date===iso(d)).sort((a,b)=>(a.time||'').localeCompare(b.time||'')); return <div className="dayColumn" key={iso(d)}><h4>{dayLabel(d)}</h4>{dayEvents.length===0 && <span className="emptyDay">No session</span>}{dayEvents.map(e=><button key={e.id} className={`calendarSession ${e.status}`} onClick={()=>openSession(e)}><span>{e.time}</span><b>{e.title}</b><em>{e.type}</em></button>)}</div>})}</div></section>
    <section className="panel compact"><h3>Add Session</h3><div className="grid four"><label>Date<input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}/></label><label>Time<input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><label>Type<select value={newType} onChange={e=>setNewType(e.target.value as SessionType)}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label><label>Title<input value={newTitle} onChange={e=>setNewTitle(e.target.value)}/></label></div><button className="primary" onClick={add}><Plus size={16}/>Add to calendar</button></section>
  </div>
}
const sessionTypes: SessionType[] = ['Home','Gym','FMA','MMA','BJJ','Boxing','Kickboxing','Cardio','Mobility','Physio','Recovery','Strength'];

function Today({events,exercises,logs,setLogs,onPlay,openSession}:{events:CalendarEvent[];exercises:Exercise[];logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void;onPlay:(e:Exercise)=>void;openSession:(e:CalendarEvent)=>void}){
  const [date,setDate]=useState(todayISO());
  const sessions=events.filter(e=>e.date===date).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  return <section className="panel"><div className="row between"><div><h3>Today's Training</h3><p className="muted">Choose a date, open a session, follow the exercises and log completion.</p></div><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>{sessions.length===0 && <p className="muted">No sessions planned for this date.</p>}{sessions.map(e=><SessionRow key={e.id} event={e} onClick={()=>openSession(e)}/>)}<QuickCompletion exercises={exercises} logs={logs} setLogs={setLogs} onPlay={onPlay}/></section>
}

function SessionWorkout({session,setSession,exercises,logs,setLogs,events,setEvents,onPlay}:{session:CalendarEvent|null; setSession:(s:CalendarEvent|null)=>void; exercises:Exercise[]; logs:WorkoutLog[]; setLogs:(l:WorkoutLog[])=>void; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void; onPlay:(e:Exercise)=>void}){
  const fallback: CalendarEvent = session || { id:'adhoc', date:todayISO(), time:'', title:'Ad hoc Workout', type:'Gym', status:'planned' };
  const isClassSession = !!fallback.class_name || fallback.type === 'FMA';
  if (isClassSession) return <ClassSessionCompletion session={fallback} setSession={setSession} events={events} setEvents={setEvents}/>;
  return <ExerciseSessionCompletion session={fallback} exercises={exercises} logs={logs} setLogs={setLogs} events={events} setEvents={setEvents} onPlay={onPlay}/>;
}

function ExerciseSessionCompletion({session,exercises,logs,setLogs,events,setEvents,onPlay}:{session:CalendarEvent; exercises:Exercise[]; logs:WorkoutLog[]; setLogs:(l:WorkoutLog[])=>void; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void; onPlay:(e:Exercise)=>void}){
  const picks = useMemo(()=>pickExercisesForSession(session, exercises), [session.id, exercises.length]);
  const [date,setDate]=useState(session.date || todayISO());
  const [setRows,setSetRows]=useState<Record<string,ExerciseLogSet[]>>(()=>Object.fromEntries(picks.map(e=>[e.exercise_id,[1,2,3].map(n=>({set_number:n,reps:'',weight:'',completed:false}))])));
  useEffect(()=>{ setSetRows(Object.fromEntries(picks.map(e=>[e.exercise_id,[1,2,3].map(n=>({set_number:n,reps:'',weight:'',completed:false}))]))); }, [picks.map(p=>p.exercise_id).join('|')]);
  function updateSet(exId:string, idx:number, field:keyof ExerciseLogSet, value:any){ setSetRows(prev=>({...prev,[exId]:(prev[exId]||[]).map((s,i)=>i===idx?{...s,[field]:value}:s)})); }
  function completeExercise(e:Exercise, quick=false){ const sets = quick ? [] : (setRows[e.exercise_id] || []); const entry: WorkoutLog = { id:crypto.randomUUID(), session_id:session.id, date, session_type:session.type, exercise_id:e.exercise_id, exercise_name:titleCase(e.name), sets, completed:true, reps: sets.map(s=>s.reps).filter(Boolean).join(', '), weight: sets.map(s=>s.weight).filter(Boolean).join(', ') }; setLogs([entry,...logs]); }
  function completeSession(){ setEvents(events.map(e=>e.id===session.id?{...e,status:'completed'}:e)); }
  return <section className="panel workoutCompletionPanel"><div className="sessionHeader"><div><span className={classNameForType(session.type)}>{session.type}</span><h3>{session.time ? `${session.time} · ` : ''}{session.title}</h3><p className="muted">Follow the programme for the selected date. Record sets, reps and weight where useful, or mark each exercise complete without logging numbers.</p></div><label>Session Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="workoutList">{picks.map(e=><div className="workoutExercise" key={e.exercise_id}><div className="row between"><div><h3>{titleCase(e.name)}</h3><p>{titleCase(bodyOf(e))} · {titleCase(e.target)} · {titleCase(e.equipment)}</p></div><button onClick={()=>onPlay(e)} disabled={!safeVideo(e)}><Video size={16}/>Watch Demo</button></div><InstructionsBlock exercise={e}/><div className="setTable"><div className="setHead"><span>Set</span><span>Reps</span><span>Weight</span><span>Done</span></div>{(setRows[e.exercise_id] || []).map((s,idx)=><div className="setRow" key={s.set_number}><span>{s.set_number}</span><input value={s.reps||''} onChange={ev=>updateSet(e.exercise_id,idx,'reps',ev.target.value)} placeholder="8-12"/><input value={s.weight||''} onChange={ev=>updateSet(e.exercise_id,idx,'weight',ev.target.value)} placeholder="kg"/><input type="checkbox" checked={!!s.completed} onChange={ev=>updateSet(e.exercise_id,idx,'completed',ev.target.checked)}/></div>)}</div><div className="row actions"><button className="primary" onClick={()=>completeExercise(e)}><CheckCircle2 size={16}/>Save exercise log</button><button onClick={()=>completeExercise(e,true)}>Mark complete only</button></div></div>)}</div><button className="primary big" onClick={completeSession}><Trophy size={18}/>Mark session completed</button></section>
}

function ClassSessionCompletion({session,setSession,events,setEvents}:{session:CalendarEvent; setSession:(s:CalendarEvent|null)=>void; events:CalendarEvent[]; setEvents:(e:CalendarEvent[])=>void}){
  const [date,setDate]=useState(session.date || todayISO());
  const [time,setTime]=useState(session.time || '19:00');
  function updateStatus(status:'completed'|'missed'){
    const updated = events.map(e=>e.id===session.id?{...e,date,time,status}:e);
    setEvents(updated);
    setSession({...session,date,time,status});
  }
  return <section className="panel classCompletionPanel"><div className="classHero"><div><span className={classNameForType(session.type)}>{session.class_name ? 'FMA Class' : session.type}</span><h3>{session.class_name || session.title}</h3><p className="muted">This is a class session. It tracks attendance and calendar completion only. There are no individual exercise logs, sets, reps or weight entries for FMA classes.</p></div><div className={`classStatus ${session.status}`}><b>{titleCase(session.status)}</b><span>Attendance status</span></div></div><div className="grid two"><label>Class Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Class Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="classActions"><button className="primary big" onClick={()=>updateStatus('completed')}><CheckCircle2 size={18}/>Mark Class Attended</button><button className="big" onClick={()=>updateStatus('missed')}><X size={18}/>Mark Class Missed</button></div><div className="classNote"><b>Class focus</b><p>{fmaClasses.find(c=>c.name===session.class_name)?.focus || 'FMA academy session added to the training calendar.'}</p></div></section>
}
function InstructionsBlock({exercise}:{exercise:Exercise}){ const [open,setOpen]=useState(false); const instructions=(exercise.instructions||[]).filter(s=>s && !/no written instructions stored yet/i.test(s)); return <div className="compactInstructions"><button onClick={()=>setOpen(!open)}>{open?<ChevronDown size={16}/>:<ChevronRight size={16}/>} Exercise Details & Instructions</button>{open && <div className="instructionsPanel">{exercise.description && <p>{sentence(exercise.description)}</p>}{instructions.length>0 && <ol>{instructions.map((s,i)=><li key={i}>{sentence(s)}</li>)}</ol>}<div className="chips">{[bodyOf(exercise),exercise.target,...(exercise.secondary_muscles||[])].filter(Boolean).map(x=><span key={x}>{titleCase(x)}</span>)}</div></div>}</div> }
function pickExercisesForSession(session:CalendarEvent, exercises:Exercise[]){ const t=session.type; let terms:string[]=['plank','push-up','dead bug','squat','row']; if(t==='Home') terms=['ladder','shadow','plank','mountain climber','push-up']; if(t==='Gym'||t==='Strength') terms=['back squat','romanian deadlift','bench press','shoulder press','row']; if(t==='FMA'||t==='MMA'||t==='Boxing'||t==='Kickboxing') terms=['agility','boxing','jumping jack','mountain climber','plank']; if(t==='BJJ') terms=['bear crawl','bridge','superman','plank','hip']; if(t==='Mobility'||t==='Physio'||t==='Recovery') terms=['stretch','mobility','rotation','hamstring','shoulder']; const found=terms.map(term=>exercises.find(e=>e.name.toLowerCase().includes(term))).filter(Boolean) as Exercise[]; return found.length ? found.slice(0,6) : exercises.slice(0,5); }

function QuickCompletion({exercises,logs,setLogs,onPlay}:{exercises:Exercise[];logs:WorkoutLog[];setLogs:(l:WorkoutLog[])=>void;onPlay:(e:Exercise)=>void}){ const picks=exercises.slice(0,3); return <div className="quickBox"><h3>Quick Exercise Completion</h3><p className="muted">Use this when James completes a standalone drill outside a planned session.</p><div className="grid three">{picks.map(e=><div className="miniExercise" key={e.exercise_id}><b>{titleCase(e.name)}</b><span>{titleCase(bodyOf(e))}</span><div className="row actions"><button onClick={()=>onPlay(e)}>Demo</button><button className="primary" onClick={()=>setLogs([{id:crypto.randomUUID(),date:todayISO(),session_type:'Home',exercise_id:e.exercise_id,exercise_name:titleCase(e.name),sets:[],completed:true},...logs])}>Complete</button></div></div>)}</div></div> }

function WorkoutBuilder({exercises,plans,setPlans}:{exercises:Exercise[];plans:WorkoutPlan[];setPlans:(p:WorkoutPlan[])=>void}){
  const bodies=useMemo(()=>Array.from(new Set(exercises.map(e=>bodyOf(e)).filter(Boolean))).sort(),[exercises]);
  const [body,setBody]=useState(bodies[0] || 'waist'); const [q,setQ]=useState(''); const [name,setName]=useState('James Strength Session'); const [focus,setFocus]=useState('MMA strength and athletic development'); const [sessionType,setSessionType]=useState<SessionType>('Gym');
  const [selected,setSelected]=useState<ProgrammeExercise[]>([]);
  const list=exercises.filter(e=>bodyOf(e)===body && `${e.name} ${e.target} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())).slice(0,80);
  function savePlan(){ const plan={id:crypto.randomUUID(),name,focus,session_type:sessionType,exercises:selected}; setPlans([plan,...plans]); setSelected([]); }
  return <section className="panel builderPage"><div><h3>Workout Builder</h3><p className="muted">Select a body part first, then build a focused session from exercises that target that area.</p></div><div className="grid three"><label>Workout Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Training Focus<input value={focus} onChange={e=>setFocus(e.target.value)}/></label><label>Session Type<select value={sessionType} onChange={e=>setSessionType(e.target.value as SessionType)}>{sessionTypes.map(t=><option key={t}>{t}</option>)}</select></label></div><div className="builderLayout"><div><h4>1. Body Part</h4><div className="bodyList">{bodies.map(b=><button className={`listBtn ${b===body?'activeBody':''}`} onClick={()=>setBody(b)} key={b}><span>{titleCase(b)}</span><span>{exercises.filter(e=>bodyOf(e)===b).length}</span></button>)}</div></div><div><h4>2. Choose Exercises For {titleCase(body)}</h4><div className="searchBox"><Search size={16}/><input placeholder={`Search ${titleCase(body)} exercises`} value={q} onChange={e=>setQ(e.target.value)}/></div><div className="selectList">{list.map(e=><button className="listBtn" key={e.exercise_id} onClick={()=>setSelected([...selected,{exercise_id:e.exercise_id,name:titleCase(e.name),planned_sets:3,planned_reps:'8-12'}])}><span>+ {titleCase(e.name)}</span><small>{titleCase(e.target)}</small></button>)}</div></div><div className="builderPlan"><div className="row between"><h4>Draft Workout</h4><button className="miniBtn" onClick={savePlan} disabled={!selected.length}><Save size={16}/>Save</button></div>{selected.length===0 && <p className="muted">Select exercises from the list.</p>}{selected.map((e,i)=><div className="preview" key={`${e.exercise_id}-${i}`}><b>{i+1}. {e.name}</b><span>{e.planned_sets} sets · {e.planned_reps} reps</span><button className="miniBtn" onClick={()=>setSelected(selected.filter((_,idx)=>idx!==i))}>Remove</button></div>)}</div></div><section className="panel inner"><h3>Saved Programmes</h3>{plans.length===0 ? <p className="muted">No saved programmes yet.</p> : plans.map(p=><div className="preview" key={p.id}><b>{p.name}</b><span>{p.focus}</span><em>{p.exercises.length} exercises</em></div>)}</section></section>
}

function FmaClasses({events,setEvents,openSession}:{events:CalendarEvent[];setEvents:(e:CalendarEvent[])=>void;openSession:(e:CalendarEvent)=>void}){
  const [selected,setSelected]=useState(fmaClasses[0]); const [date,setDate]=useState(todayISO()); const [time,setTime]=useState('19:00');
  function add(){ const event={id:crypto.randomUUID(),date,time,title:`FMA ${selected.name}`,type:'FMA' as SessionType,status:'planned' as const,class_name:selected.name}; setEvents([...events,event]); }
  return <div className="fmaLayout"><section className="panel"><h3>FMA Chester Classes</h3><p className="muted">Select a class, choose a date and time, then add it to James’s calendar as a class session. Class sessions track attendance only — no sets, reps or exercise log required.</p><div className="classList">{fmaClasses.map(c=><button className={selected.name===c.name?'selected':''} onClick={()=>setSelected(c)} key={c.name}><b>{c.name}</b><span>{c.focus}</span></button>)}</div></section><section className="panel"><h3>Add {selected.name}</h3><p>{selected.focus}</p><div className="grid two"><label>Class Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Class Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><button className="primary big" onClick={add}><CalendarDays size={18}/>Add class to calendar</button><h3>Upcoming FMA Sessions</h3>{events.filter(e=>e.type==='FMA').map(e=><SessionRow key={e.id} event={e} onClick={()=>openSession(e)}/>)}</section></div>
}

function Stats({logs,events,profile}:{logs:WorkoutLog[];events:CalendarEvent[];profile:AthleteProfile}){
  const exercisesCompleted=logs.filter(l=>l.completed).length;
  const sessionsCompleted=events.filter(e=>e.status==='completed').length;
  const streak=calcStreak(logs,events);
  const weekStart=iso(startOfWeek()); const weekEnd=iso(addDays(startOfWeek(),6));
  const thisWeek=events.filter(e=>e.date>=weekStart && e.date<=weekEnd && e.status==='completed');
  const typeCounts=sessionTypes.map(t=>({type:t,count:thisWeek.filter(e=>e.type===t).length})).filter(x=>x.count>0);
  const chart = Array.from({length:7}, (_,i)=>{ const d=iso(addDays(startOfWeek(),i)); return { day: addDays(startOfWeek(),i).toLocaleDateString('en-GB',{weekday:'short'}), sessions: events.filter(e=>e.date===d && e.status==='completed').length, exercises: logs.filter(l=>l.date===d && l.completed).length }; });
  return <div><div className="kpiRow"><Kpi label="Exercises Completed" value={exercisesCompleted}/><Kpi label="Sessions Completed" value={sessionsCompleted}/><Kpi label="Workout Streak" value={`${streak} days`}/><Kpi label="Current Weight" value={`${profile.weight_kg || '—'} kg`}/></div><section className="panel"><h3>This Week By Session Type</h3>{typeCounts.length===0 ? <p className="muted">No completed sessions this week yet.</p> : <div className="typeCountGrid">{typeCounts.map(x=><div className="typeCount" key={x.type}><span className={classNameForType(x.type)}>{x.type}</span><b>{x.count}</b></div>)}</div>}</section><section className="panel"><h3>Weekly Output</h3><div className="chart"><ResponsiveContainer width="100%" height={260}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day"/><YAxis/><Tooltip/><Bar dataKey="sessions"/><Bar dataKey="exercises"/></BarChart></ResponsiveContainer></div></section></div>
}
function calcStreak(logs:WorkoutLog[], events:CalendarEvent[]){ const doneDates=new Set([...logs.filter(l=>l.completed).map(l=>l.date), ...events.filter(e=>e.status==='completed').map(e=>e.date)]); let streak=0; for(let i=0;i<365;i++){ const d=iso(addDays(new Date(), -i)); if(doneDates.has(d)) streak++; else if(i>0) break; } return streak; }

function Badges({badges}:{badges:Badge[]}){ return <section className="panel"><h3>Achievements</h3><div className="badgeGrid">{badges.map(b=><div className={`badgeCard ${b.unlocked?'unlocked':''}`} key={b.id}><span>{b.icon}</span><h3>{b.name}</h3><p>{b.description}</p><div className="progress"><i style={{width:`${b.progress}%`}}/></div></div>)}</div></section> }
function Profile({profile,setProfile}:{profile:AthleteProfile;setProfile:(p:AthleteProfile)=>void}){ function upd(k:keyof AthleteProfile,v:any){ setProfile({...profile,[k]:v}); } return <section className="panel profilePage"><h3>Athlete Profile</h3><p className="muted">These details help personalise targets, BMI, competition planning and progress tracking.</p><div className="grid three"><Field label="Athlete Name" help="Shown throughout the app." value={profile.name} onChange={v=>upd('name',v)}/><Field label="Age" help="Current age in years." value={profile.age||''} type="number" onChange={v=>upd('age',Number(v))}/><Field label="Gym / Academy" help="Primary training location." value={profile.gym||''} onChange={v=>upd('gym',v)}/><Field label="Height (cm)" help="Used to calculate BMI." value={profile.height_cm||''} type="number" onChange={v=>upd('height_cm',Number(v))}/><Field label="Weight (kg)" help="Current body weight." value={profile.weight_kg||''} type="number" onChange={v=>upd('weight_kg',Number(v))}/><Field label="Competition Weight (kg)" help="Target fight or competition weight." value={profile.competition_weight_kg||''} type="number" onChange={v=>upd('competition_weight_kg',Number(v))}/><Field label="Belt Rank" help="Current martial arts rank." value={profile.belt_rank||''} onChange={v=>upd('belt_rank',v)}/><Field label="Profile Photo URL" help="Optional image link for later use." value={profile.profile_photo_url||''} onChange={v=>upd('profile_photo_url',v)}/><div className="profileStat"><span>BMI</span><b>{bmi(profile)||'—'}</b><em>Calculated from height and weight.</em></div></div><label className="fullLabel">Athlete Goal<span>Main training objective.</span><textarea value={profile.goal||''} onChange={e=>upd('goal',e.target.value)}/></label></section> }
function Field({label,help,value,onChange,type='text'}:{label:string;help:string;value:any;type?:string;onChange:(v:string)=>void}){ return <label className="fieldLabel">{label}<span>{help}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label> }

function Admin({profile,events,plans,exercises,setExercises,users,setUsers,athletes,setAthletes}:{profile:AthleteProfile;events:CalendarEvent[];plans:WorkoutPlan[];exercises:Exercise[];setExercises:(e:Exercise[])=>void;users:AppUser[];setUsers:(u:AppUser[])=>void;athletes:AthleteProfile[];setAthletes:(a:AthleteProfile[])=>void}){
  return <div className="adminGrid"><section className="panel"><h3>Admin Console</h3><div className="grid three"><Kpi label="Athletes" value={athletes.length}/><Kpi label="Sessions Planned" value={events.length}/><Kpi label="Saved Programmes" value={plans.length}/></div></section><AthleteCreator users={users} setUsers={setUsers} athletes={athletes} setAthletes={setAthletes}/><ManualExercise setExercises={setExercises} exercises={exercises}/></div>
}
function AthleteCreator({users,setUsers,athletes,setAthletes}:{users:AppUser[];setUsers:(u:AppUser[])=>void;athletes:AthleteProfile[];setAthletes:(a:AthleteProfile[])=>void}){
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState('training123');
  function create(){ const id=crypto.randomUUID(); const athlete={id,name,email,role:'athlete' as const,gym:'FMA Chester',goal:'Build consistent training habits.'}; setAthletes([...athletes,athlete]); setUsers([...users,{id:`user-${id}`,email,password,name,role:'athlete',athlete_id:id}]); setName(''); setEmail(''); }
  return <section className="panel"><h3>Create Athlete</h3><p className="muted">Creates a local athlete profile and login. For full Supabase Auth, invite the user in Supabase Auth and mirror the role in profiles.</p><div className="grid three"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Athlete name"/></label><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="athlete@email.com"/></label><label>Temporary Password<input value={password} onChange={e=>setPassword(e.target.value)}/></label></div><button className="primary" onClick={create} disabled={!name||!email}><Users size={16}/>Create Athlete</button>{athletes.map(a=><div className="preview" key={a.id}><b>{a.name}</b><span>{a.email}</span><em>{a.gym}</em></div>)}</section>
}
function ManualExercise({exercises,setExercises}:{exercises:Exercise[];setExercises:(e:Exercise[])=>void}){
  const [name,setName]=useState(''); const [description,setDescription]=useState(''); const [body,setBody]=useState('waist'); const [target,setTarget]=useState('abs'); const [category,setCategory]=useState('strength'); const [equipment,setEquipment]=useState('body weight'); const [location,setLocation]=useState('Home'); const [videoUrl,setVideoUrl]=useState('');
  const bodyOptions=Array.from(new Set(exercises.map(e=>bodyOf(e)).filter(Boolean))).sort(); const targetOptions=Array.from(new Set(exercises.map(e=>e.target).filter(Boolean))).sort(); const categoryOptions=Array.from(new Set(exercises.map(e=>e.category).filter(Boolean))).sort();
  async function save(){ const exercise:Exercise={exercise_id:`manual-${Date.now()}`,name,description,body_part:body,target,category,equipment,location,video_url:videoUrl,has_video:!!videoUrl,instructions:[]}; setExercises([exercise,...exercises]); if(supabase){ await supabase.from('exercises').upsert({...exercise, exercise_type:category, archived:false, is_archived:false},{onConflict:'exercise_id'}); } setName(''); setDescription(''); setVideoUrl(''); }
  return <section className="panel"><h3>Manually Add Exercise</h3><p className="muted">Add custom MMA, boxing, BJJ, physio or flexibility drills and link any open video URL.</p><div className="grid three"><label>Exercise Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Slip rope footwork"/></label><label>Body Part<select value={body} onChange={e=>setBody(e.target.value)}>{bodyOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Target Muscle / Focus<select value={target} onChange={e=>setTarget(e.target.value)}>{targetOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Type<select value={category} onChange={e=>setCategory(e.target.value)}>{categoryOptions.map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select></label><label>Equipment<input value={equipment} onChange={e=>setEquipment(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label></div><label className="fullLabel">Short Description<span>Keep this short. Full written instructions can be added later.</span><textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Demo Video URL<input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://..."/></label><button className="primary" onClick={save} disabled={!name}><Plus size={16}/>Add exercise</button></section>
}

function Importer({setExercises,reloadSupabase,exercises}:{setExercises:(e:Exercise[])=>void; reloadSupabase:()=>void; exercises:Exercise[]}) {
  const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState('Ready to load the bundled V2.2.1 catalogue.'); const [busy,setBusy]=useState(false); const [missingOpen,setMissingOpen]=useState(false);
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
