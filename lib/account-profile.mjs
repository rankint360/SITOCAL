import { ProviderError } from './providers.mjs';

export function initProfiles(db){
 db.exec(`CREATE TABLE IF NOT EXISTS account_profiles(
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE, profile TEXT NOT NULL, avatar BLOB, media TEXT
 )`);
}
const defaults={name:'',theme:'system',public:false,handle:'',website:'',x:'',github:'',linkedin:''};
const read=row=>row?{...defaults,...JSON.parse(row.profile),handle:row.handle||'',hasAvatar:Boolean(row.hasAvatar)}:{...defaults,hasAvatar:false};
export function accountProfile(db,user){
 return read(db.prepare('SELECT profile,handle,avatar IS NOT NULL AS hasAvatar FROM account_profiles WHERE user_id=?').get(user));
}
export function publishedProfile(db,handle){
 const row=db.prepare("SELECT profile,handle,avatar IS NOT NULL AS hasAvatar FROM account_profiles WHERE handle=? AND json_extract(profile,'$.public')=1").get(handle);
 return row?read(row):null;
}
export function publishedAvatar(db,handle){
 return db.prepare("SELECT avatar,media FROM account_profiles WHERE handle=? AND json_extract(profile,'$.public')=1 AND avatar IS NOT NULL").get(handle);
}
export function saveProfile(db,user,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ProviderError('Enter valid profile settings',400);
 function text(key,limit){
  if(typeof input[key]!=='string'||input[key].length>limit||/[\x00-\x1f\x7f]/.test(input[key]))throw new ProviderError('Check '+key+' and its length',400);
  return input[key].trim();
 }
 const name=text('name',100),handle=text('handle',40).toLowerCase(),website=text('website',300),x=text('x',40),github=text('github',40),linkedin=text('linkedin',100);
 if(typeof input.public!=='boolean'||!['system','light','dark'].includes(input.theme))throw new ProviderError('Choose a profile visibility and appearance',400);
 if((handle&&!/^[a-z0-9][a-z0-9-]{2,39}$/.test(handle))||(input.public&&(!handle||!name)))throw new ProviderError('A public profile needs a display name and a username of 3–40 letters, digits or hyphens',400);
 if(website){let url;try{url=new URL(website);}catch{}if(!url||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new ProviderError('Enter an HTTP or HTTPS website URL',400);}
 if([x,github,linkedin].some(value=>value&&!/^[a-zA-Z0-9_-]+$/.test(value)))throw new ProviderError('Enter social usernames without @ or a full URL',400);
 let image=null,media=null;
 if(input.avatar){
  const match=typeof input.avatar==='string'&&input.avatar.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw new ProviderError('Choose a PNG, JPEG or WebP photo',400);
  media=match[1];image=Buffer.from(match[2],'base64');
  const valid=media==='image/png'?image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):media==='image/jpeg'?image.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP';
  if(!valid||image.length>262144)throw new ProviderError('Choose a valid photo under 256 KB',400);
 }
 const profile=JSON.stringify({name,theme:input.theme,public:input.public,website,x,github,linkedin});
 try{
  db.prepare(`INSERT INTO account_profiles VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET handle=excluded.handle,profile=excluded.profile,
  avatar=CASE WHEN ? THEN NULL ELSE COALESCE(excluded.avatar,account_profiles.avatar) END,
  media=CASE WHEN ? THEN NULL ELSE COALESCE(excluded.media,account_profiles.media) END`).run(user,handle||null,profile,image,media,input.removeAvatar===true?1:0,input.removeAvatar===true?1:0);
 }catch(error){if(/UNIQUE constraint failed/.test(error.message))throw new ProviderError('This public username is already taken',409);throw error;}
 return accountProfile(db,user);
}
