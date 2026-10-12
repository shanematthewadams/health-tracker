import { createClient } from '@supabase/supabase-js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {buildServer} from './server.mjs';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function createHandler({env,makeClient=createClient,makeServer=buildServer,log=()=>{},getReadiness=async()=>false}) {
 return async function handle(req,context={}) {
  const path=new URL(req.url).pathname;
  const enabled=env('WITH_MCP_ENABLED')==='true' && await getReadiness();
  if(path==='/connected-health/status') return json({enabled,version:'3.0.0-alpha.1',state:enabled?'authorization_required':'not_activated',integrations:{apple_health:'not_connected',garmin:'not_connected',strava:'not_connected'}});
  if(!enabled) return json({error:'Connected Health is not activated in this environment.'},503);
  const resource=env('WITH_MCP_RESOURCE');
  const url=env('SUPABASE_URL')||env('VITE_SUPABASE_URL');
  const key=env('SUPABASE_PUBLISHABLE_KEY')||env('VITE_SUPABASE_PUBLISHABLE_KEY');
  if(!resource||!url||!key || !resource.startsWith('https://') || new URL(req.url).origin!==new URL(resource).origin || context.deploy?.context==='production') return json({error:'Integration configuration unavailable.'},503);
  if(path.startsWith('/.well-known/oauth-protected-resource')) return req.method==='GET'?json({resource,authorization_servers:[url+'/auth/v1'],scopes_supported:['openid'],bearer_methods_supported:['header'],resource_name:'With personal health'}):json({error:'Method not allowed'},405,{Allow:'GET'});
  const challenge={ 'WWW-Authenticate':`Bearer resource_metadata="${new URL(resource).origin}/.well-known/oauth-protected-resource/mcp"` };
  if(req.method!=='POST') return json({error:'Use Streamable HTTP POST.'},405,{Allow:'POST'});
  const origin=req.headers.get('origin');
  if(origin && origin!==new URL(resource).origin) return json({error:'Origin is not allowed.'},403);
  const token=req.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if(!token)return json({error:'Sign in and authorize With.'},401,challenge);
  try {
   // No service-role client: PostgREST continues to enforce the caller's RLS.
   const db=makeClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   const verified=await db.auth.getClaims(token);
   const claims=verified.data?.claims;
   if(verified.error||!claims||claims.iss!==url+'/auth/v1'||claims.aud!==resource||claims.role!=='with_mcp'||!claims.client_id||!claims.session_id||claims.exp*1000<=Date.now())return json({error:'Invalid or expired authorization.'},401,challenge);
   const identity=await db.auth.getUser(token);
   if(identity.error||!identity.data?.user||identity.data.user.id!==claims.sub)return json({error:'Invalid authorization.'},401,challenge);
   const profile=await db.rpc('mcp_identity');
   if(profile.error||!profile.data)return json({error:'Connection is revoked, expired, or unavailable.'},403);
   const getGrant=async()=>{const {data,error}=await db.from('connected_ai_apps').select('user_id,client_id,resource,permissions,categories,expires_at,revoked_at').eq('user_id',claims.sub).eq('client_id',claims.client_id).single();if(error)throw new Error('Grant unavailable');return data;};
   const grant=await getGrant();
   if(grant.revoked_at||Date.parse(grant.expires_at)<=Date.now()||grant.resource!==resource)return json({error:'Connection is revoked or expired.'},403);
   if(Number(req.headers.get('content-length'))>65536)return json({error:'Request too large.'},413);
   const reader=req.body?.getReader();let bytes=0;const chunks=[];
   if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>65536){await reader.cancel();return json({error:'Request too large.'},413);}chunks.push(value);}}
   const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
   const request=new Request(req.url,{method:'POST',headers:req.headers,body});
   const server=makeServer({db,user:identity.data.user,profile:{id:profile.data},clientId:claims.client_id,resource,getGrant,log});
   const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
   await server.connect(transport);
   try {const response=await transport.handleRequest(request);response.headers.set('Cache-Control','no-store');return response;} finally {await server.close();}
  }catch{return json({error:'The integration request could not be completed.'},503);}
 };
}
