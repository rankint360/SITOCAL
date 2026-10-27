import { inflateRawSync } from 'node:zlib';

export function crc32(data) {
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function safeName(name){
  if(!name || name.includes('\\') || name.includes('\0') || name.startsWith('/') || name.split('/').some(x=>x==='..') || /^[a-z]:/i.test(name))throw Error('Unsafe archive path');
  return name;
}
export function zip(files){
  const chunks=[], central=[];let offset=0;
  for(const [path,value] of Object.entries(files)){
    const name=Buffer.from(safeName(path)),data=Buffer.isBuffer(value)?value:Buffer.from(value),crc=crc32(data);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    chunks.push(header,name,data);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=header.length+name.length+data.length;
  }
  const dir=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(chunks.length/3,8);end.writeUInt16LE(chunks.length/3,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...chunks,dir,end]);
}
export function unzip(input){
  const b=Buffer.from(input);if(b.length>12*1024*1024)throw Error('ZIP exceeds 12 MB');
  let end=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0)throw Error('Invalid ZIP directory');
  const count=b.readUInt16LE(end+10);if(count>200 || b.readUInt16LE(end+4)!==0 || b.readUInt16LE(end+6)!==0)throw Error('Unsupported ZIP');
  let pos=b.readUInt32LE(end+16),total=0;const files={};
  for(let i=0;i<count;i++){
    if(pos+46>b.length || b.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid ZIP entry');
    const flags=b.readUInt16LE(pos+8),method=b.readUInt16LE(pos+10),expected=b.readUInt32LE(pos+16),size=b.readUInt32LE(pos+20),outSize=b.readUInt32LE(pos+24),nl=b.readUInt16LE(pos+28),extra=b.readUInt16LE(pos+30),comment=b.readUInt16LE(pos+32),local=b.readUInt32LE(pos+42);
    if(flags&1 || ![0,8].includes(method) || outSize>3*1024*1024)throw Error('Encrypted, oversized or unsupported ZIP entry');
    const name=safeName(b.subarray(pos+46,pos+46+nl).toString('utf8'));pos+=46+nl+extra+comment;
    if(local+30>b.length || b.readUInt32LE(local)!==0x04034b50)throw Error('Invalid local ZIP header');
    const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);if(start+size>b.length)throw Error('Truncated ZIP');
    if(name.endsWith('/'))continue;
    if(Object.hasOwn(files,name))throw Error('Duplicate ZIP entry');
    total+=outSize;if(total>15*1024*1024)throw Error('Archive expanded size exceeds limit');
    const data=method===0?b.subarray(start,start+size):inflateRawSync(b.subarray(start,start+size),{maxOutputLength:3*1024*1024});
    if(data.length!==outSize || crc32(data)!==expected)throw Error('ZIP checksum mismatch');files[name]=data;
  }
  return files;
}
