import {applyAppearance,appearancePreference,saveAppearance} from './appearance.js';
export const siteLanguages=[["en","🇬🇧","English"],["ur","🇵🇰","اردو"],["ar","🇸🇦","العربية"],["hi","🇮🇳","हिन्दी"],["bn","🇧🇩","বাংলা"],["zh-CN","🇨🇳","简体中文"],["zh-TW","🇹🇼","繁體中文"],["es","🇪🇸","Español"],["fr","🇫🇷","Français"],["de","🇩🇪","Deutsch"],["pt","🇵🇹","Português"],["it","🇮🇹","Italiano"],["ja","🇯🇵","日本語"],["ko","🇰🇷","한국어"],["ru","🇷🇺","Русский"],["tr","🇹🇷","Türkçe"],["fa","🇮🇷","فارسی"],["id","🇮🇩","Bahasa Indonesia"],["ms","🇲🇾","Bahasa Melayu"],["vi","🇻🇳","Tiếng Việt"],["th","🇹🇭","ไทย"],["nl","🇳🇱","Nederlands"],["pl","🇵🇱","Polski"],["uk","🇺🇦","Українська"],["sw","🇰🇪","Kiswahili"]];
export const nichePacks=[['hvac','HVAC','Heating, cooling and indoor air services'],['law-firms','Law Firms','Practice areas, credentials and consultation requests'],['automotive','Automotive','Vehicle services and workshop enquiries'],['roofing','Roofing','Roof repairs, inspections and replacements'],['electrician','Electrician','Electrical installations, repairs and safety'],['chiropractor','Chiropractor','Practitioner profiles, care information and appointments'],['plumbing','Plumbing','Repairs, installations and service-area enquiries'],['dentists','Dentists','Dental services, practitioner profiles and appointments'],['restaurants','Restaurants','Menus, opening hours and reservations'],['salons','Salons','Services, styling portfolios and bookings'],['cleaning','Cleaning','Cleaning services, schedules and quote requests'],['landscaping','Landscaping','Garden care, outdoor projects and estimates'],['appliance-repair','Appliance Repair','Appliance services and repair enquiries'],['painting','Painting','Interior, exterior and commercial painting'],['pest-control','Pest Control','Treatment services and inspection requests'],['auto-detailers','Auto Detailers','Detailing packages, galleries and bookings'],['med-spas','Med Spas','Practitioner information, treatments and consultations'],['physiotherapists','Physiotherapists','Care services, practitioner profiles and appointments'],['contractors','Contractors','Project types, portfolios and estimate requests'],['movers','Movers','Moving services, coverage and quote requests'],['optometrists','Optometrists','Eye-care services, practitioner profiles and appointments']];
nichePacks.push(...[["tree-care","Tree Care","Tree pruning, removal and arborist enquiries"],["handyman","Handyman","Home maintenance, repairs and small projects"],["locksmith","Locksmith","Lock repairs, key services and security enquiries"],["pool-service","Pool Service","Pool cleaning, maintenance and equipment care"],["pressure-washing","Pressure Washing","Exterior surface cleaning and washing estimates"],["garage-doors","Garage Doors","Door installation, repairs and opener services"],["damage-restoration","Damage Restoration","Water, fire and storm restoration enquiries"],["junk-removal","Junk Removal","Property clear-outs, collection and disposal enquiries"],["carpet-cleaning","Carpet Cleaning","Carpet, rug and upholstery cleaning enquiries"]]);
export const navigationRoutes=['features','why-sitocal','pricing','niche-packs','leadsmart-coverage-intelligence',...nichePacks.map(([slug])=>'niche-packs/'+slug)];
export const navSymbol=i=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+['M3 4h18v16H3zM3 9h18M8 9v11','m4 12 5 5L20 6','M12 3v18M3 12h18','m3 11 9-8 9 8M6 10v11h12V10','M5 3h14v18H5zM8 7h8m-8 5h8m-8 5h5','M3 5h18v14H3zM7 9l3 3-3 3m6 0h4','M3 19h18M5 16l5-5 4 2 5-9'][i%7]+'"/></svg>';
export function publicNavigation(href,darkLogo){
 const tools=[['google-indexer','Google Indexer','Inspect URLs and manage verified sitemaps'],['api-mcp','API & MCP','Connect your scripts and compatible assistants'],['app','Website Builder','Turn a business brief into a website draft'],['editor','Sitocal Editor','Refine supported page content visually'],['wp','WordPress Converter','Export content for supported page builders'],['serpum','SERPUM Local Checker','Explore Google from a chosen point'],['serp-landing','SERP Engine','Research local search and competitors'],['leadsmart-coverage-intelligence','LeadSmart Coverage Intelligence','Compare service markets and ZIP coverage']];
 const lightLogo=darkLogo.replace('logo-dark.svg','logo.svg');
 const product='<details class="site-dropdown"><summary>Product <span aria-hidden="true">⌄</span></summary><div class="site-mega site-tools-mega"><div class="site-mega-intro"><span class="eyebrow">ONE FOCUSED WORKSPACE</span><h2>From first draft to next move.</h2><p>Build your website, refine the details and explore local search.</p><a href="'+href('features')+'">Explore all features ↗</a></div><div class="site-tool-links">'+tools.map(([p,t,d],i)=>'<a href="'+href(p)+'"><span class="site-tool-icon">'+navSymbol(i)+'</span><span><strong>'+t+'</strong><small>'+d+'</small></span></a>').join('')+'</div></div></details>';
 const solutions='<details class="site-dropdown"><summary>Solutions <span aria-hidden="true">⌄</span></summary><div class="site-mega site-niche-mega"><div class="site-mega-intro"><span class="eyebrow">NICHE PACKS</span><h2>Built around your business.</h2><p>Find page ideas and business briefs for the work you do.</p><a href="'+href('niche-packs')+'">Explore all niche packs ↗</a></div><div class="site-niche-links">'+nichePacks.map(([slug,title])=>'<a href="'+href('niche-packs/'+slug)+'">'+nicheIcon(slug)+'<span>'+title+'</span></a>').join('')+'</div></div></details>';
 const resources='<details class="site-dropdown studio-resources"><summary>Resources <span aria-hidden="true">⌄</span></summary><div class="studio-resource-menu">'+[['why-sitocal','Why Sitocal','Compare your options'],['about','About Us','The people behind the platform'],['blog','Blog','Practical website guidance'],['serpum/features/','SERPUM field guides','Understand the search signals'],['contact','Contact','Talk to our team'],['admin','Admin Dashboard','Separate administrator sign-in']].map(([p,t,d])=>'<a href="'+href(p)+'"><strong>'+t+'</strong><small>'+d+'</small></a>').join('')+'</div></details>';
 return '<div class="nav-wrap"><nav class="site-navigation" aria-label="Main navigation"><a href="'+href('landing')+'" aria-label="Sitocal home">'+lightLogo+'</a><button class="site-menu-button" type="button" data-site-menu aria-expanded="false" aria-controls="site-menu">☰ <span>Menu</span></button><div class="site-menu" id="site-menu"><div class="site-primary">'+product+solutions+resources+'<a href="'+href('pricing')+'">Pricing</a><a data-member-integrations hidden href="'+href('integrations')+'">Integrations</a><a data-member-integrations hidden href="'+href('settings')+'">Settings</a><a data-member-integrations hidden href="'+href('account')+'">Profile</a><button class="btn small" data-member-integrations hidden type="button" data-appearance aria-haspopup="dialog">Appearance</button></div><div class="site-account"><a href="'+href('login')+'">Sign in</a><a class="btn" href="'+href('login','?signup=1')+'">Start building ↗</a></div></div><button class="site-theme-toggle" type="button" data-site-theme aria-label="Switch to dark view" aria-pressed="false"><span aria-hidden="true">☾</span><span class="sr-only">Toggle appearance</span></button></nav></div>';
}
export function footerLanguage(){return '<div class="site-footer-controls"><form id="site-language-form" action="https://translate.google.com/translate" method="get" target="_blank" rel="noopener noreferrer"><label for="site-language">Language</label><input type="hidden" name="sl" value="en"><input type="hidden" name="u" value="https://sitocal.com/"><select id="site-language" name="tl" aria-label="Website language">'+siteLanguages.map(([code,flag,name])=>'<option value="'+code+'">'+flag+' '+code.toUpperCase()+' — '+name+'</option>').join('')+'</select><button class="btn" type="submit">Translate ↗</button><small>Public page translation opens in Google Translate. Workspace stays in English.</small></form></div>';}
export function initFormHints(root){
 if(!root)return;
 const fields='input:not([type]), input[type=text], input[type=email], input[type=password], input[type=tel], input[type=url], input[type=search], input[type=number], textarea';
 const examples={email:'you@example.com',phone:'+1 512 555 0100',password:'Enter your password',currentPassword:'Enter your current password',website:'https://yourbusiness.com',keyword:'e.g. plumber in Austin',domain:'example.com',locationCode:'e.g. 2840'};
 const decorate=scope=>{
  const controls=[...(scope.matches?.(fields)?[scope]:[]),...scope.querySelectorAll(fields)];
  for(const field of controls){
   if(field.hasAttribute('placeholder')||field.readOnly||field.disabled)continue;
   const label=field.labels?.[0]?.cloneNode(true);
   label?.querySelectorAll('input,select,textarea,button,small,.hint').forEach(node=>node.remove());
   const title=(label?.textContent||field.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim();
   const hint=Object.hasOwn(examples,field.name)?examples[field.name]:title||field.name.replace(/(?<=[a-z])(?=[A-Z])/g,' ').replaceAll('_',' ');
   if(hint)field.placeholder=hint;
  }
 };
 decorate(root);
 new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)decorate(node);
 }).observe(root,{childList:true,subtree:true});
}

export function initAppearance(){
 if(typeof document==='undefined'||!document.documentElement||typeof window==='undefined')return;
 const languageTarget=()=>{const form=document.getElementById('site-language-form');if(!form)return;let target='https://sitocal.com/';try{const canonical=document.querySelector('link[rel="canonical"]')?.href;if(canonical&&new URL(canonical).protocol==='https:')target=canonical;}catch{}form.elements.u.value=target;};
 languageTarget();
 document.addEventListener('submit',e=>{if(e.target.id==='site-language-form'){languageTarget();if(e.target.elements.tl.value==='en')e.preventDefault();}});
 applyAppearance();
 document.addEventListener('click',e=>{if(!location.hostname.endsWith('.translate.goog'))return;const a=e.target.closest('a[href]');if(!a)return;const target=originalWorkspaceUrl(a.href,document.querySelector('meta[name="sitocal-domain"]')?.content||'sitocal.com');if(target){e.preventDefault();e.stopImmediatePropagation();location.href=target;}},true);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-site-theme]');if(b)saveAppearance(appearancePreference().palette,document.documentElement.dataset.theme==='dark'?'Light':'Dark');
 const menu=e.target.closest('[data-site-menu]');if(menu){const opened=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(opened));document.getElementById('site-menu')?.classList.toggle('is-open',opened);}
 if(!e.target.closest('.site-dropdown'))document.querySelectorAll('.site-dropdown[open]').forEach(d=>d.open=false);
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.site-dropdown[open]').forEach(d=>d.open=false);document.querySelectorAll('[data-site-menu]').forEach(b=>b.setAttribute('aria-expanded','false'));document.getElementById('site-menu')?.classList.remove('is-open');}});
 document.addEventListener('toggle',e=>{if(e.target.matches?.('.site-dropdown')&&e.target.open)document.querySelectorAll('.site-dropdown[open]').forEach(d=>{if(d!==e.target)d.open=false;});},true);
 new MutationObserver(()=>{applyAppearance();languageTarget();}).observe(document.getElementById('root'),{childList:true});
}


export function originalWorkspaceUrl(input,baseDomain='sitocal.com'){
 try{
 const u=new URL(input);let target;
 if(u.hostname==='translate.google.com'&&u.pathname==='/website'){target=new URL(u.searchParams.get('u'));}
 else if(u.hostname.endsWith('.translate.goog')){
 const path=u.pathname,aliases={'/sign-in':'/login','/create-account':'/login?signup=1','/dashboard':'/','/app':'/'};
 if(['/login','/sign-in','/create-account','/dashboard','/app','/account'].includes(path))return 'https://app.'+baseDomain+(aliases[path]||path);
 return '';
 }else return '';
 if(target.protocol!=='https:')return '';
 const privateHost=['app','editor','wp'].some(s=>target.hostname===s+'.'+baseDomain);
 const serpWorkspace=target.hostname==='serp.'+baseDomain&&target.pathname==='/serp';
 return privateHost||serpWorkspace?target.href:'';
 }catch{return '';}
}

const nicheIconPaths={"hvac":"M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6M9 3l3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3m18-6-3 3 3 3","law-firms":"M12 3v17M5 20h14M4 7h16M6 7l-4 7h8L6 7zm12 0-4 7h8l-4-7z","automotive":"m5 5-2 7v7h3v-3h12v3h3v-7l-2-7H5zM3 12h18M6 13v1m12-1v1M7 5l-1 5h12l-1-5","roofing":"m2 12 10-9 10 9M5 10v11h14V10M9 21v-7h6v7M15 5V3h4v6","electrician":"m13 2-9 12h7l-1 8L21 9h-8l1-7","chiropractor":"M12 3v18M8 5h8M7 9h10M8 13h8M9 17h6M10 21h4","plumbing":"M4 3v6h7v6h6v6h4V11h-6V5H8V3H4zM2 3h8m7 18h6","dentists":"M7 3C3 3 3 9 5 12c1 2 1 9 4 9 2 0 1-8 3-8s1 8 3 8c3 0 3-7 4-9 2-3 2-9-2-9-2 0-3 2-5 2S9 3 7 3z","restaurants":"M4 3v6c0 2 6 2 6 0V3M7 3v18M18 3c-3 2-4 7-1 9h3V3h-2zm2 9v9","salons":"M9 8 20 3M9 16 20 21M3 5a3 3 0 1 0 6 0 3 3 0 1 0-6 0zm0 14a3 3 0 1 0 6 0 3 3 0 1 0-6 0zM8 7l9 10M8 17l9-10","cleaning":"m14 3-5 9M7 11l8 4-4 7-9-5 5-6zm-2 4 5 3M19 3v6m-3-3h6","landscaping":"M5 20C3 8 9 3 21 3c0 12-5 18-16 17zm0 0L17 7M5 20v2","appliance-repair":"M5 3h14v18H5zM8 6h1m3 0h4M8 14a4 4 0 1 0 8 0 4 4 0 1 0-8 0z","painting":"M3 3h14v7H3zM17 6h4v8H11v7H8v-8h10V9","pest-control":"M9 5l-2-2m8 2 2-2M8 9h8v7a4 4 0 0 1-8 0V9zm0 3H4m12 0h4M8 16H4m12 0h4M9 9V7a3 3 0 0 1 6 0v2M12 10v10","auto-detailers":"m3 11 2-6h11l2 6M3 11v7h3v-3h9v3h3v-7H3zm3 1v1m8-1v1M20 2v6m-3-3h6M20 12v3m-2-1h4","med-spas":"M12 3c0 5 6 7 6 12a6 6 0 0 1-12 0c0-5 6-7 6-12zM9 15h6m-3-3v6M20 3v4m-2-2h4","physiotherapists":"M12 3a2 2 0 1 0 0 4 2 2 0 1 0 0-4zM5 9h14M12 7v7m0 0-5 7m5-7 5 7","contractors":"M3 13a9 9 0 0 1 18 0M9 5V3h6v2M12 5v7M2 13h20v4H2zM5 20h14","movers":"M2 7h12v11H2zM14 10h5l3 4v4h-8M5 18a2 2 0 1 0 0 4 2 2 0 1 0 0-4zm13 0a2 2 0 1 0 0 4 2 2 0 1 0 0-4zM17 11v3h4","optometrists":"M2 9h7v7H2zM15 9h7v7h-7zM9 12h6M2 9l2-6m18 6-2-6","tree-care":"M12 2 6 9h3l-5 7h6v6h4v-6h6l-5-7h3L12 2z","handyman":"m3 4 4-1 6 6-4 4-6-6V4zm7 8 9 9 3-3-9-9M15 7l4-4 2 2-4 4M3 21l5-5","locksmith":"M14 3a7 7 0 1 1-5 12l-6 6H1v-4l6-6a7 7 0 0 1 7-8zm2 4a1 1 0 1 0 0 2 1 1 0 1 0 0-2z","pool-service":"M9 13V5a2 2 0 0 1 4 0m1 10V5a2 2 0 0 1 4 0M9 8h5m-5 4h5M2 17q3-3 6 0t6 0 6 0M2 21q3-3 6 0t6 0 6 0","pressure-washing":"m3 15 7-7 5 5-7 7-3-3-2-2zm7-7 4-4 4 4-3 5M18 8l4-2m-3 4 3 1M6 18l-2 4","garage-doors":"m2 8 10-5 10 5M4 8v13h16V8H4zm0 4h16M4 16h16M4 20h16M10 18h4","damage-restoration":"m2 11 10-8 10 8M5 10v11h14V10M12 9c0 3 4 4 4 7a4 4 0 0 1-8 0c0-3 4-4 4-7z","junk-removal":"M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7","carpet-cleaning":"M4 4h16v16H4zM7 4v16M17 4v16M2 7h2m-2 5h2m-2 5h2m16-10h2m-2 5h2m-2 5h2M10 8h4m-4 4h4m-4 4h4"};
export const nicheIcon=slug=>'<span class="site-niche-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(nicheIconPaths[slug]||nicheIconPaths.contractors)+'"/></svg></span>';

const workspaceIconPaths = {
  "app": "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  "create-website": "M3 5h18v14H3z M3 9h18 M12 11v6m-3-3h6",
  "my-websites": "M3 7h18v13H3z M6 4h12 M3 11h18",
  "generations": "M12 3a9 9 0 1 1-9 9m0-6v6h6m3-5v5l3 2",
  "editor": "M4 19l1-5L16 3l5 5-11 11z M14 5l5 5",
  "publish": "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  "deployments": "M6 16c0-8 4-12 14-12 0 10-4 14-12 14z M12 12l4-4 M5 19l-2 2",
  "wp": "M4 5h16v14H4z M7 9l2 6 3-5 3 5 2-6",
  "form-leads": "M3 5h18v14H3z M3 6l9 7 9-7",
  "call-earnings": "M4 4h4l2 5-3 2c1 3 3 5 6 6l2-3 5 2v4C11 22 2 13 4 4z",
  "call-intelligence": "M2 12h4l2-6 4 12 3-10 2 4h5",
  "site-search": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  "serp-checker": "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M15 15l6 6",
  "serp": "M3 20h18M6 16v-5m6 5V6m6 10V3",
  "indexing": "M5 3h11l3 3v15H5z M8 12h8m-8 4h8",
  "domains": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c-5 5-5 13 0 18m0-18c5 5 5 13 0 18",
  "billing": "M3 5h18v14H3z M3 10h18 M6 15h4",
  "integrations": "M9 3v5m6-5v5M7 8h10v4a5 5 0 0 1-10 0z M12 17v4",
  "developer": "M8 6l-6 6 6 6m8-12 6 6-6 6m-2-15-4 18",
  "jobs": "M4 7h16v13H4z M9 7V4h6v3 M4 12h16",
  "account": "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21a8 8 0 0 1 16 0",
  "settings": "M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-6 2v4",
  "admin": "M12 3l8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z M8 12l3 3 5-6",
  "support-tickets": "M3 6h18v10H9l-5 4v-4H3z M7 11h10",
  "whats-new": "M12 2l2 7 7 3-7 2-2 8-2-8-8-2 8-3z",
  "grants": "M4 10h16v11H4z M3 6h18v4H3z M12 6v15",
  "promotions": "M3 4h9l9 9-8 8-10-10z M7 8h1",
  "referrals": "M4 12h16m-5-5 5 5-5 5 M4 5v14",
  "audit": "M5 3h14v18H5z M8 8h8m-8 4h8m-8 4h5"
};
const adminIconRoutes = {overview:'app',users:'account',admins:'admin',security:'admin',plans:'billing',connectors:'integrations',support:'support-tickets'};
export function workspaceIcon(route, admin = false) {
  const key = admin && Object.hasOwn(adminIconRoutes, route) ? adminIconRoutes[route] : route;
  const path = Object.hasOwn(workspaceIconPaths, key) ? workspaceIconPaths[key] : workspaceIconPaths.settings;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + path + '"/></svg>';
}

