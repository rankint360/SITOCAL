export function hostConfig(env){
  const baseDomain=String(env.BASE_DOMAIN||'').trim().toLowerCase();
  if(baseDomain&&!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(baseDomain))throw Error('BASE_DOMAIN must be a bare domain, without protocol, port or path');
  const allowedHosts=new Set(String(env.ALLOWED_HOSTS||'localhost,127.0.0.1').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  if(baseDomain)for(const sub of ['','www','app','editor','wp','serp'])allowedHosts.add((sub?sub+'.':'')+baseDomain);
  if(env.RENDER_EXTERNAL_HOSTNAME)allowedHosts.add(env.RENDER_EXTERNAL_HOSTNAME.toLowerCase());
  return {baseDomain,allowedHosts};
}
