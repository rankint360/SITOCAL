import { plannedPages,websitePage } from './website.mjs';
import { randomBytes } from 'node:crypto';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slug=s=>String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'site';
const text=(s,max=4000)=>String(s??'').trim().slice(0,max);
export function validateSite(raw){
  if(!raw || typeof raw!=='object')throw Error('Invalid site');
  const business=text(raw.business,120),city=text(raw.city,120);if(!business || !city)throw Error('Business name and service area are required');
  const accent=/^#[a-f0-9]{6}$/i.test(raw.accent)?raw.accent:'#196747';
  const pages=(Array.isArray(raw.pages)?raw.pages:[]).slice(0,30).map(p=>({slug:slug(p.slug),title:text(p.title,150),description:text(p.description,320),sections:(Array.isArray(p.sections)?p.sections:[]).slice(0,40).map(s=>({heading:text(s.heading,200),body:text(s.body),cta:text(s.cta,80)}))}));
  if(!pages.length || pages.some(p=>!p.title || !p.sections.length))throw Error('At least one page with title and sections is required');
  if(new Set(pages.map(p=>p.slug)).size!==pages.length)throw Error('Page slugs must be unique');
  return {version:1,business,city,businessBrief:text(raw.businessBrief,2000),phone:text(raw.phone,60),email:text(raw.email,150),services:text(raw.services,1000),theme:['orchard','slate','clay'].includes(raw.theme)?raw.theme:'orchard',accent,pages};
}
export function draftSite(b){
  const business=text(b.business,120),city=text(b.city,120);
  if(!business||!city)throw Error('Business name and area are required');
  return validateSite({...b,business,city,pages:plannedPages({...b,business,city})});
}
export function renderPage(site,page,editable=false){return websitePage(site,page,editable);}
export function staticFiles(site){
  const files={'sitocal.json':JSON.stringify(site,null,2),'robots.txt':'User-agent: *\nAllow: /\n','README.txt':'Generated with Sitocal. Review business facts before publication. Contact buttons use phone/email. Lead forms, analytics and custom domains require configuration. sitocal.json preserves editable content and supports converter exports.\n'};
  for(const page of site.pages)files[`${page.slug==='home'?'index':page.slug}.html`]=renderPage(site,page);
  // Relative sitemap locations are intentionally omitted until a canonical domain is set.
  return files;
}
const uid=()=>randomBytes(4).toString('hex');
function widget(type,settings){return {id:uid(),elType:'widget',widgetType:type,isInner:false,settings,elements:[]};}
export function elementor(page,site){
  return {version:'0.4',title:page.title,type:'page',page_settings:{},settings:{},content:page.sections.map((s,i)=>({id:uid(),elType:'container',isInner:false,settings:{content_width:'boxed',flex_direction:'column',background_background:'classic',background_color:i===0?'#123F31':'#FFFEFA',padding:{unit:'px',top:'70',right:'30',bottom:'70',left:'30',isLinked:false},padding_mobile:{unit:'px',top:'40',right:'20',bottom:'40',left:'20',isLinked:false}},elements:[widget('heading',{title:s.heading,header_size:i===0?'h1':'h2',title_color:i===0?'#FFFEFA':'#183C30',typography_typography:'custom',typography_font_family:'Georgia',typography_font_size:{unit:'px',size:i===0?52:32},typography_font_size_mobile:{unit:'px',size:30}}),widget('text-editor',{editor:`<p>${esc(s.body).replace(/\n/g,'<br>')}</p>`,text_color:i===0?'#FFFEFA':'#183C30'}),...(s.cta?[widget('button',{text:s.cta,link:{url:site.phone?`tel:${site.phone.replace(/[^+0-9]/g,'')}`:site.email?`mailto:${site.email}`:'#contact'},background_color:site.accent,button_text_color:'#FFFFFF'})]:[])]}))};
}
export function gutenberg(page){return page.sections.map((s,i)=>`<!-- wp:group {"layout":{"type":"constrained"}} --><div class="wp-block-group"><!-- wp:heading {"level":${i===0?1:2}} --><h${i===0?1:2} class="wp-block-heading">${esc(s.heading)}</h${i===0?1:2}><!-- /wp:heading --><!-- wp:paragraph --><p>${esc(s.body).replace(/\n/g,'<br>')}</p><!-- /wp:paragraph -->${s.cta?`<!-- wp:paragraph --><p>${esc(s.cta)} (configure contact link)</p><!-- /wp:paragraph -->`:''}</div><!-- /wp:group -->`).join('\n');}
const cdata=s=>'<![CDATA['+String(s).replace(/\]\]>/g,']]]]><![CDATA[>')+']]>';
export function divi4(page){const safe=s=>esc(s).replace(/\[/g,'&#91;').replace(/\]/g,'&#93;');return page.sections.map((s,i)=>`[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_text]<h${i?2:1}>${safe(s.heading)}</h${i?2:1}><p>${safe(s.body).replace(/\n/g,'<br>')}</p>${s.cta?'<p>'+safe(s.cta)+' (configure contact link)</p>':''}[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]`).join('\n');}
export function wordpressXml(site,format='gutenberg'){
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/"><channel><title>${esc(site.business)}</title><link>https://example.invalid</link><description>Sitocal content export</description><language>en-US</language><wp:wxr_version>1.2</wp:wxr_version><wp:base_site_url>https://example.invalid</wp:base_site_url><wp:base_blog_url>https://example.invalid</wp:base_blog_url><wp:author><wp:author_id>1</wp:author_id><wp:author_login>${cdata('sitocal')}</wp:author_login><wp:author_email>${cdata('')}</wp:author_email><wp:author_display_name>${cdata(site.business)}</wp:author_display_name></wp:author>${site.pages.map((p,i)=>`<item><title>${esc(p.title)}</title><dc:creator>${cdata('sitocal')}</dc:creator><content:encoded>${cdata(format==='divi'?divi4(p):gutenberg(p))}</content:encoded><excerpt:encoded>${cdata(p.description)}</excerpt:encoded><wp:post_id>${i+1}</wp:post_id><wp:post_name>${cdata(p.slug)}</wp:post_name><wp:status>${cdata('draft')}</wp:status><wp:post_parent>0</wp:post_parent><wp:post_type>${cdata('page')}</wp:post_type><wp:comment_status>${cdata('closed')}</wp:comment_status><wp:ping_status>${cdata('closed')}</wp:ping_status>${format==='divi'?`<wp:postmeta><wp:meta_key>${cdata('_et_pb_use_builder')}</wp:meta_key><wp:meta_value>${cdata('on')}</wp:meta_value></wp:postmeta>`:''}</item>`).join('')}</channel></rss>`;
}
export function converterFiles(site,format){
  if(format==='elementor')return Object.fromEntries([['IMPORT.txt','Elementor Free or Pro: Templates → Saved Templates → Import Templates. Unzip this bundle and import each page JSON individually. These are native editable widgets; not an Elementor Import Kit ZIP. Images/custom effects require separate review.'],...site.pages.map(p=>[`${p.slug}.json`,JSON.stringify(elementor(p,site),null,2)])]);
  if(format==='gutenberg')return Object.fromEntries([['IMPORT.txt','Unzip. Use Tools → Import → WordPress to import wordpress.xml as draft pages. Alternatively create a page, open Code editor, paste each .html file, return to Visual editor. Review blocks and configure links. Import validation on a real WordPress installation is outstanding.'],['wordpress.xml',wordpressXml(site)],...site.pages.map(p=>[`${p.slug}.html`,gutenberg(p)])]);
  if(format==='divi')return {'IMPORT.txt':'BETA: Divi 4 shortcode content, not a Divi Library JSON or Divi 5 layout. Install/activate Divi 4, then WordPress Tools → Import → WordPress → import wordpress.xml as draft pages and assign the author. Review in the Divi builder. Styling, buttons and links need review. Real Divi installation validation is outstanding. Divi 5 native layout conversion is not implemented.','wordpress.xml':wordpressXml(site,'divi'),...Object.fromEntries(site.pages.map(p=>[`${p.slug}-divi4.txt`,divi4(p)]))};
  throw Error('Choose Elementor or Gutenberg');
}
