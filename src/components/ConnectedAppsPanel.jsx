import {useEffect,useState} from 'react';
import {supabase} from '../supabase.js';
import {brand} from '../brand.jsx';
export default function ConnectedAppsPanel({session,styles}) {
 const [state,setState]=useState('loading'),[apps,setApps]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 async function load(){setError('');try{const response=await fetch('/connected-health/status');if(!response.ok)throw Error();const status=await response.json();if(!status.connections_available){setState('inactive');return;}const {data,error}=await supabase.from('connected_ai_apps').select('client_id,client_name,permissions,categories,created_at,expires_at,revoked_at').eq('user_id',session.user.id).order('created_at');if(error)throw error;setApps(data||[]);setState('ready');}catch{setState('unavailable');setError('Connections could not be loaded. Try again.');}}
 useEffect(()=>{load();},[session.user.id]);
 async function revoke(app){setBusy(app.client_id);setError('');try{const {error}=await supabase.from('connected_ai_apps').update({revoked_at:new Date().toISOString()}).eq('user_id',session.user.id).eq('client_id',app.client_id).select('client_id').single();if(error)throw error;const result=await supabase.auth.oauth.revokeGrant({clientId:app.client_id});await load();if(result.error)setError('With access is blocked. Sign-in access could not be removed yet; disconnect this app in ChatGPT too.');}catch{setError('Access could not be revoked. Try again.');}finally{setBusy('');}}
 const {SURFACE,BORDER,TEXT,TEXT_MUTED}=styles;
 return <section style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:18,padding:18,color:TEXT}}>
  <h2 style={{fontFamily:"'Newsreader', Georgia, serif",fontSize:26,margin:'0 0 8px'}}>Connected Apps & AI</h2>
  <p style={{color:TEXT_MUTED,lineHeight:1.5}}>Choose what an app can access. Your connections belong to you; people in your With keep their own information private.</p>
  {state==='loading'&&<p role="status">Checking your connections…</p>}
  {state==='inactive'&&<p>AI connections are being tested and aren’t ready to connect yet.</p>}
  {error&&<p role="alert">{error}</p>}
  {state==='unavailable'&&<button onClick={load}>Try again</button>}
  {state==='ready'&&apps.length===0&&<p>No AI apps are connected.</p>}
  {apps.map(app=><div key={app.client_id} style={{borderTop:`1px solid ${BORDER}`,padding:'16px 0'}}>
    <strong>{app.client_name}</strong><p>{app.revoked_at?'Disconnected':Date.parse(app.expires_at)<=Date.now()?'Expired':app.permissions.includes('health:write')?'Can read and add approved records':'Can read approved records'}</p>
    <p style={{color:TEXT_MUTED}}>Approved information: {app.categories.join(', ')}. Automatic sync: not available.</p>
    {!app.revoked_at&&<button disabled={!!busy} onClick={()=>revoke(app)} style={{minHeight:44,color:brand.tealDark}}>{busy===app.client_id?'Disconnecting…':'Disconnect'}</button>}
  </div>)}
  <p style={{color:TEXT_MUTED}}>Apple Health, Garmin, and Strava: not connected.</p>
 </section>;
}
