import {rolloutReady} from '../lib/mcp/rollout.mjs';
import {stagingResource,supabaseUrl,supabasePublishableKey} from '../lib/mcp/deployment-config.mjs';
import {createHandler} from '../lib/mcp/http.mjs';
export default createHandler({env:name=>Netlify.env.get(name)??({WITH_MCP_ENABLED:"true",WITH_MCP_RESOURCE:stagingResource,SUPABASE_URL:supabaseUrl,SUPABASE_PUBLISHABLE_KEY:supabasePublishableKey}[name]),getReadiness:rolloutReady,log:event=>console.info(JSON.stringify({component:'with_mcp',...event}))});
export const config={path:['/mcp','/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'],rateLimit:{windowSize:60,windowLimit:90,aggregateBy:['ip','domain']}};
