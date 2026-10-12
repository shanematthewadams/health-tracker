import {stagingResource,supabaseUrl,supabasePublishableKey} from './deployment-config.mjs';
export async function rolloutReady(fetcher=fetch){
 try{const response=await fetcher(supabaseUrl+'/rest/v1/rpc/mcp_rollout_status',{method:'POST',headers:{apikey:supabasePublishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});if(!response.ok)return false;const status=await response.json();return status.security_ready===true&&status.resource===stagingResource;}catch{return false;}
}
export function connectionStatus(ready,origin){return {enabled:ready&&origin===new URL(stagingResource).origin,consent_enabled:ready,connections_available:ready,mcp_resource:stagingResource,version:'3.0.0-alpha.2',state:ready?'authorization_required':'security_setup_pending',integrations:{apple_health:'not_connected',garmin:'not_connected',strava:'not_connected'}};}
