import {rolloutReady,connectionStatus} from '../lib/mcp/rollout.mjs';
export default async function(req){if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});return Response.json(connectionStatus(await rolloutReady(),new URL(req.url).origin),{headers:{'Cache-Control':'no-store'}});}
export const config={path:'/connected-health/status',rateLimit:{windowSize:60,windowLimit:90,aggregateBy:['ip','domain']}};
