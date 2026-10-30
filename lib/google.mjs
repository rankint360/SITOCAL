import { randomBytes,createHash } from 'node:crypto';
import { request,ProviderError } from './providers.mjs';
export const googleReady=()=>Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REDIRECT_URI);
export function googleStart(db,user,{indexing=false}={}){
  if(!googleReady())throw new ProviderError('Google OAuth is not configured on this server. Add client ID, secret and callback URI.',409);
  const state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO oauth_states VALUES(?,?,?,?)').run(state,user,verifier,Date.now()+600000);
  const p=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:process.env.GOOGLE_REDIRECT_URI,response_type:'code',scope:(indexing===true?'https://www.googleapis.com/auth/webmasters':'https://www.googleapis.com/auth/webmasters.readonly')+' https://www.googleapis.com/auth/analytics.readonly',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  return 'https://accounts.google.com/o/oauth2/v2/auth?'+p;
}
export async function googleCallback(store,query,user){
  const row=store.db.prepare('SELECT * FROM oauth_states WHERE state=? AND user_id=? AND expires>?').get(query.get('state')||'',user,Date.now());
  if(!row)throw new ProviderError('OAuth state expired or does not match this session',400);
  store.db.prepare('DELETE FROM oauth_states WHERE state=?').run(row.state);
  if(query.get('error')||!query.get('code'))throw new ProviderError('Google authorization was not granted',400);
  const token=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:process.env.GOOGLE_REDIRECT_URI,grant_type:'authorization_code',code:query.get('code'),code_verifier:row.verifier}).toString()});
  token.expires_at=Date.now()+Number(token.expires_in)*1000;store.db.prepare('INSERT OR REPLACE INTO connections VALUES(?,?,?)').run(user,'google',store.seal(token));
}
export async function googleToken(store,user){
  const row=store.db.prepare("SELECT secret FROM connections WHERE user_id=? AND provider='google'").get(user);if(!row)throw new ProviderError('Connect Google first',409);let token=store.unseal(row.secret);
  if(token.expires_at<Date.now()+60000){
    if(!token.refresh_token)throw new ProviderError('Reconnect Google to renew access',409);
    const fresh=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:token.refresh_token}).toString()});
    token={...token,...fresh,expires_at:Date.now()+Number(fresh.expires_in)*1000};store.db.prepare('UPDATE connections SET secret=? WHERE user_id=? AND provider=?').run(store.seal(token),user,'google');
  }return token.access_token;
}
export async function googleProperties(store,user){const headers={Authorization:`Bearer ${await googleToken(store,user)}`};return {gsc:await request('https://www.googleapis.com/webmasters/v3/sites',{headers}),ga4:await request('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',{headers})};}
export async function googleReport(store,user,input){
  const headers={Authorization:`Bearer ${await googleToken(store,user)}`,'Content-Type':'application/json'};
  if(input.kind==='gsc'){
    const allowed=await request('https://www.googleapis.com/webmasters/v3/sites',{headers});if(!allowed.siteEntry?.some(s=>s.siteUrl===input.property))throw new ProviderError('Choose an accessible Search Console property',403);
    const date=new Date(),end=new Date(date.getTime()-3*86400000).toISOString().slice(0,10),start=new Date(date.getTime()-31*86400000).toISOString().slice(0,10);
    return {kind:'gsc',start,end,source:'Google Search Console; property search data, not a live SERP rank check',data:await request(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.property)}/searchAnalytics/query`,{method:'POST',headers,body:{startDate:start,endDate:end,dimensions:['query'],rowLimit:100}})};
  }
  if(!/^properties\/\d+$/.test(input.property||''))throw new ProviderError('Choose a valid GA4 property',400);
  return {kind:'ga4',source:'Google Analytics 4; observed property traffic',data:await request(`https://analyticsdata.googleapis.com/v1beta/${input.property}:runReport`,{method:'POST',headers,body:{dateRanges:[{startDate:'28daysAgo',endDate:'yesterday'}],dimensions:[{name:'date'}],metrics:[{name:'sessions'},{name:'activeUsers'},{name:'screenPageViews'}],limit:100}})};
}
