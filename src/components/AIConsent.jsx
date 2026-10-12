import {useEffect,useState} from 'react';
import {LockKeyhole, ShieldCheck, ArrowRight, Check} from 'lucide-react';
import {supabase} from '../supabase.js';
import {brand,BrandLogo} from '../brand.jsx';

const groups=[
 ['profile','Personal goals & profile','Your goals and personal targets'],
 ['weight','Weight & progress','Recorded weight and trends'],
 ['nutrition','Food & nutrition','Meals, macros, and nutrition history'],
 ['activity','Activity','Movement and logged activities'],
 ['strength','Workouts & strength','Exercises, sets, and weights'],
 ['wellness','Recovery & wellbeing','Sleep and wellness information'],
 ['preferences','Tracking preferences','Your personal tracker settings']
];
const card={background:brand.surface,border:'1px solid '+brand.border,borderRadius:24,boxShadow:'0 12px 42px rgba(23,24,22,.055)'};
const heading={fontFamily:"'Newsreader',Georgia,serif",fontWeight:400,letterSpacing:'-.025em'};
export default function AIConsent(){
 const [resource,setResource]=useState(null);
 const [session,setSession]=useState(null),[details,setDetails]=useState(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[write,setWrite]=useState(false),[categories,setCategories]=useState(groups.map(g=>g[0]));
 const id=new URLSearchParams(location.search).get('authorization_id');
 useEffect(()=>{let live=true;async function load(){try{const status=await fetch('/connected-health/status').then(r=>r.json());if(!status.consent_enabled || status.mcp_resource!=='https://staging--shane-and-alli-health-tracker.netlify.app/mcp')throw Error('AI connections are being prepared. Please return later.');setResource(status.mcp_resource);const {data,error}=await supabase.auth.getSession();if(error)throw Error('Sign in to With first.');if(!live)return;setSession(data.session);if(!data.session){setReady(true);return;}if(!id)throw Error('This connection link is incomplete. Start again from the app you want to connect.');const authorization=await supabase.auth.oauth.getAuthorizationDetails(id);if(authorization.error)throw Error('This connection link has expired or is unavailable. Start again from the app you want to connect.');if('redirect_url' in authorization.data){location.assign(authorization.data.redirect_url);return;}setDetails(authorization.data);setReady(true);}catch(e){if(live){setError(e.message);setReady(true);}}}load();return()=>{live=false;};},[id]);
 async function decide(approve){if(busy)return;setBusy(true);setError('');try{if(approve){const {error}=await supabase.from('connected_ai_apps').upsert({user_id:session.user.id,client_id:details.client.id,client_name:details.client.name,resource,permissions:write?['health:read','health:write']:['health:read'],categories,revoked_at:null,expires_at:new Date(Date.now()+90*86400000).toISOString()},{onConflict:'user_id,client_id'});if(error)throw error;}const result=await supabase.auth.oauth[approve?'approveAuthorization':'denyAuthorization'](id,{skipBrowserRedirect:true});if(result.error)throw result.error;location.assign(result.data.redirect_url);}catch{setError('The connection could not be completed. Try again.');setBusy(false);}}
 const toggle=key=>setCategories(old=>old.includes(key)?old.filter(k=>k!==key):[...old,key]);
 return <main style={{minHeight:'100dvh',background:brand.bg,color:brand.text,fontFamily:"'DM Sans',system-ui,sans-serif",boxSizing:'border-box',padding:'clamp(20px,5vw,52px) 16px'}}>
  <div style={{maxWidth:590,margin:'0 auto'}}>
   <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,padding:'0 8px'}}>
    <BrandLogo style={{width:112}}/>
    <span style={{fontSize:12,color:brand.textMuted,display:'flex',alignItems:'center',gap:7}}><LockKeyhole size={14}/> Secure connection</span>
   </header>
   <section style={{...card,padding:'clamp(22px,5vw,38px)'}}>
    <div style={{width:46,height:46,borderRadius:15,background:brand.surfaceSoft,color:brand.teal,display:'grid',placeItems:'center',marginBottom:20}}><ShieldCheck size={25} strokeWidth={1.7}/></div>
    <h1 style={{...heading,fontSize:'clamp(34px,7vw,43px)',lineHeight:1.08,margin:'0 0 13px'}}>Your health. Your choice.</h1>
    <p style={{fontSize:15,lineHeight:1.65,color:brand.textMuted,margin:'0 0 24px'}}>Connect an app to With, on your terms. You decide what it can see and whether it can add information.</p>
    {error&&<div role="alert" style={{background:'#FFF0E9',color:'#913B32',padding:14,borderRadius:12,marginBottom:20,lineHeight:1.5}}>{error}</div>}
    {!ready&&!error&&<p role="status">Checking the connection…</p>}
    {ready&&!session&&<div style={{background:brand.surfaceSoft,borderRadius:16,padding:20}}>
     <h2 style={{...heading,fontSize:25,margin:'0 0 8px'}}>Sign in to continue</h2>
     <p style={{lineHeight:1.6,color:brand.textMuted}}>Sign in to With in a new tab, then come back here to review this request.</p>
     <a href="/" target="_blank" rel="noopener noreferrer" style={{color:brand.teal,fontWeight:700}}>Open With to sign in <ArrowRight size={15} style={{verticalAlign:'middle'}}/></a>
     <button type="button" onClick={()=>location.reload()} style={{display:'block',marginTop:18,padding:'12px 18px',border:'none',borderRadius:12,background:brand.teal,color:'white',fontWeight:700,cursor:'pointer'}}>I'm signed in</button>
    </div>}
    {details&&<div>
     <div style={{background:brand.surfaceSoft,borderRadius:16,padding:'18px 20px',marginBottom:24}}>
      <span style={{fontSize:12,color:brand.textMuted,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase'}}>Connection request</span>
      <h2 style={{...heading,fontSize:27,margin:'8px 0 4px',overflowWrap:'anywhere'}}>{details.client.name}</h2>
      <div style={{color:brand.textMuted,fontSize:13,lineHeight:1.5}}>Return to: {new URL(details.redirect_uri).hostname}</div>
      <div style={{color:brand.textMuted,fontSize:12,marginTop:7}}>Sign-in information: {details.scope||'Default account identity'}</div>
     </div>
     <h2 style={{fontSize:16,margin:'0 0 6px'}}>What would you like to share?</h2>
     <p style={{fontSize:13,color:brand.textMuted,lineHeight:1.6,margin:'0 0 12px'}}>Choose the parts of your own health record this app can read.</p>
     <fieldset style={{border:0,padding:0,margin:0}}>
      <legend style={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)'}}>Information this app can read</legend>
      {groups.map(([key,label,description],index)=><label key={key} style={{display:'flex',gap:14,alignItems:'center',padding:'14px 3px',borderBottom:index===groups.length-1?'none':'1px solid '+brand.border,cursor:'pointer'}}>
       <input type="checkbox" checked={categories.includes(key)} onChange={()=>toggle(key)} style={{width:19,height:19,accentColor:brand.teal,flexShrink:0,cursor:'pointer'}}/>
       <span style={{flex:1}}><span style={{display:'block',fontSize:14,fontWeight:700}}>{label}</span><span style={{display:'block',fontSize:12,color:brand.textMuted,marginTop:3,lineHeight:1.4}}>{description}</span></span>
       {categories.includes(key)&&<Check size={16} color={brand.teal} aria-hidden="true"/>}
      </label>)}
     </fieldset>
     <div style={{background:brand.surfaceSoft,padding:18,borderRadius:16,margin:'20px 0'}}>
      <label style={{display:'flex',gap:12,cursor:'pointer',alignItems:'flex-start'}}>
       <input type="checkbox" checked={write} onChange={e=>setWrite(e.target.checked)} style={{width:19,height:19,accentColor:brand.teal,marginTop:2,flexShrink:0}}/>
       <span><strong style={{fontSize:14}}>Also allow adding or correcting records</strong><span style={{display:'block',fontSize:12,color:brand.textMuted,lineHeight:1.5,marginTop:5}}>Optional. Leave off for read-only access.</span></span>
      </label>
      {write&&<p style={{fontSize:12,lineHeight:1.55,color:brand.textMuted,margin:'12px 0 0'}}>Goal changes and corrections still need your approval in With. Workout logging requires activity and workout permissions.</p>}
     </div>
     <div style={{display:'flex',alignItems:'flex-start',gap:11,color:brand.tealDark,background:'#EEF4EF',padding:16,borderRadius:15}}>
      <LockKeyhole size={19} style={{flexShrink:0,marginTop:2}}/>
      <p style={{fontSize:12,lineHeight:1.65,margin:0}}><strong>You're in control.</strong> Only your approved information is shared. Other people in your With keep their data private. Access expires after 90 days, and you can disconnect anytime in Connected Apps & AI.</p>
     </div>
     <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:26}}>
      <button type="button" disabled={busy} onClick={()=>decide(false)} style={{flex:'1 1 120px',minHeight:48,border:'1px solid '+brand.border,borderRadius:13,background:brand.surface,color:brand.text,fontWeight:700,cursor:'pointer'}}>Cancel</button>
      <button type="button" disabled={busy||!categories.length} onClick={()=>decide(true)} style={{flex:'2 1 190px',minHeight:48,border:0,borderRadius:13,background:brand.teal,color:'white',fontWeight:700,cursor:busy||!categories.length?'not-allowed':'pointer',opacity:busy||!categories.length?.55:1}}> {busy?'Connecting…':'Connect securely'} <ArrowRight size={16} style={{verticalAlign:'middle',marginLeft:6}}/></button>
     </div>
    </div>}
   </section>
   <p style={{fontFamily:"'Newsreader',Georgia,serif",fontStyle:'italic',fontSize:19,textAlign:'center',color:brand.teal,margin:'22px 0'}}>We're in this together.</p>
  </div>
 </main>;
}
