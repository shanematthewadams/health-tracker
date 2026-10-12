import {useEffect,useState} from 'react';
import {supabase} from '../supabase.js';
import {brand} from '../brand.jsx';
import {ArrowUpRight,Copy,CheckCircle2} from 'lucide-react';
const MCP_URL='https://staging--shane-and-alli-health-tracker.netlify.app/mcp';
const CHATGPT_URL='https://chatgpt.com/';
export default function ConnectedAppsPanel({session,styles}) {
 const [showSetup,setShowSetup]=useState(false),[copied,setCopied]=useState(false);const [state,setState]=useState('loading'),[apps,setApps]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 async function load(){setError('');try{const response=await fetch('/connected-health/status');if(!response.ok)throw Error();const status=await response.json();if(!status.connections_available){setState('inactive');return;}const {data,error}=await supabase.from('connected_ai_apps').select('client_id,client_name,permissions,categories,created_at,expires_at,revoked_at').eq('user_id',session.user.id).order('created_at');if(error)throw error;setApps(data||[]);setState('ready');}catch{setState('unavailable');setError('Connections could not be loaded. Try again.');}}
 useEffect(()=>{load();},[session.user.id]);
 async function revoke(app){setBusy(app.client_id);setError('');try{const {error}=await supabase.from('connected_ai_apps').update({revoked_at:new Date().toISOString()}).eq('user_id',session.user.id).eq('client_id',app.client_id).select('client_id').single();if(error)throw error;const result=await supabase.auth.oauth.revokeGrant({clientId:app.client_id});await load();if(result.error)setError('With access is blocked. Sign-in access could not be removed yet; disconnect this app in ChatGPT too.');}catch{setError('Access could not be revoked. Try again.');}finally{setBusy('');}}
 const {SURFACE,BORDER,TEXT,TEXT_MUTED}=styles;
 return <section style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:18,padding:18,color:TEXT}}>
  <h2 style={{fontFamily:"'Newsreader', Georgia, serif",fontSize:26,margin:'0 0 8px'}}>Connected Apps & AI</h2>
  <p style={{color:TEXT_MUTED,lineHeight:1.5}}>Choose what an app can access. Your connections belong to you; people in your With keep their own information private.</p>
  <div style={{background:brand.surfaceSoft,border:'1px solid '+brand.border,borderRadius:16,padding:18,margin:'18px 0'}}>
   <h3 style={{fontFamily:"'Newsreader',Georgia,serif",fontSize:24,fontWeight:400,margin:'0 0 6px'}}>Bring With into ChatGPT</h3>
   <p style={{color:TEXT_MUTED,fontSize:14,lineHeight:1.6,margin:'0 0 12px'}}>Ask about your nutrition, weight, workouts and progress in a conversation. You choose what ChatGPT can read or add.</p>
   <button type="button" onClick={()=>setShowSetup(v=>!v)} aria-expanded={showSetup} style={{background:brand.teal,color:'#fff',minHeight:44,border:0,borderRadius:11,padding:'0 18px',fontWeight:700,cursor:'pointer'}}>{showSetup?'Hide setup steps':'Connect to ChatGPT'}</button>
   {showSetup&&<div style={{marginTop:18,borderTop:'1px solid '+brand.border,paddingTop:14}}>
    <p style={{fontSize:13,lineHeight:1.55,color:TEXT_MUTED}}>This connection uses our testing server. Each person must set it up in their own ChatGPT account. Connecting here does not automatically install a plugin.</p>
    <ol style={{paddingLeft:20,fontSize:14,lineHeight:1.8}}>
     <li>Open ChatGPT and go to <strong>Plugins → + → Add custom MCP server</strong>.</li>
     <li>Name the connection <strong>With</strong>, use <strong>OAuth</strong> authentication, and paste the server address below.</li>
     <li>Follow ChatGPT's setup prompts. If asked for a client ID or redirect configuration, the With administrator must register the client in Supabase first. Never paste passwords or API keys here.</li>
     <li>Create and install the plugin, then sign in to With and approve the information you want to share.</li>
     <li>In ChatGPT, ask: <em>“Use With to show my weight entries for the past seven days.”</em></li>
    </ol>
    <div style={{background:brand.surface,border:'1px solid '+brand.border,borderRadius:11,padding:12,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
     <code style={{fontSize:12,flex:'1 1 220px',overflowWrap:'anywhere'}}>{MCP_URL}</code>
     <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(MCP_URL);setCopied(true);}catch{setCopied(false);}}} style={{border:'1px solid '+brand.border,borderRadius:9,background:brand.surface,minHeight:40,padding:'0 10px',display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>{copied?<CheckCircle2 size={15}/>:<Copy size={15}/>} {copied?'Copied':'Copy address'}</button>
    </div>
    <a href={CHATGPT_URL} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',gap:7,alignItems:'center',marginTop:16,color:brand.teal,fontWeight:700}}>Open ChatGPT <ArrowUpRight size={16}/></a>
    <p style={{fontSize:12,color:TEXT_MUTED,lineHeight:1.5}}>Custom MCP connections may depend on your ChatGPT account and workspace. This is an early-access testing connection, not yet a public one-click installation.</p>
   </div>}
  </div>
  {state==='loading'&&<p role="status">Checking your connections…</p>}
  {state==='inactive'&&<p>AI connections are being tested and aren’t ready to connect yet.</p>}
  {error&&<p role="alert">{error}</p>}
  {state==='unavailable'&&<button onClick={load}>Try again</button>}
  {state==='ready'&&apps.length===0&&<p><strong>Not connected yet.</strong> Follow the steps above to link ChatGPT to your account.</p>}
  {apps.map(app=><div key={app.client_id} style={{borderTop:`1px solid ${BORDER}`,padding:'16px 0'}}>
    <strong>{app.client_name}</strong><p>{app.revoked_at?'Disconnected':Date.parse(app.expires_at)<=Date.now()?'Expired':app.permissions.includes('health:write')?'Can read and add approved records':'Can read approved records'}</p>
    <p style={{color:TEXT_MUTED}}>Approved information: {app.categories.join(', ')}. Automatic sync: not available.</p>
    {!app.revoked_at&&<button disabled={!!busy} onClick={()=>revoke(app)} style={{minHeight:44,color:brand.tealDark}}>{busy===app.client_id?'Disconnecting…':'Disconnect'}</button>}
  </div>)}
  <p style={{color:TEXT_MUTED}}>Apple Health, Garmin, and Strava: not connected.</p>
 </section>;
}
