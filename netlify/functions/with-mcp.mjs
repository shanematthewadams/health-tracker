import {createHandler} from '../lib/mcp/http.mjs';
export default createHandler({env:name=>Netlify.env.get(name),log:event=>console.info(JSON.stringify({component:'with_mcp',...event}))});
export const config={path:['/mcp','/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp','/connected-health/status'],rateLimit:{windowSize:60,windowLimit:90,aggregateBy:['ip','domain']}};
