/* Minimal PNG read/write on node:zlib only (no packages).
   Reads 8-bit non-interlaced greyscale, grey+alpha, RGB, RGBA and palette images; always returns RGBA.
   Writes 8-bit RGBA. Enough for generated UI art and its cleaned output. */
import zlib from 'node:zlib';

const SIG=Buffer.from([137,80,78,71,13,10,26,10]);

export function decodePNG(buf){
  if(!buf.subarray(0,8).equals(SIG))throw new Error('not a PNG (save the image as .png, not .jpg/.webp)');
  let p=8,w=0,h=0,depth=0,type=0,interlace=0,plte=null,trns=null;const idat=[];
  while(p<buf.length){
    const len=buf.readUInt32BE(p),kind=buf.toString('ascii',p+4,p+8),data=buf.subarray(p+8,p+8+len);p+=12+len;
    if(kind==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);depth=data[8];type=data[9];interlace=data[12];}
    else if(kind==='PLTE')plte=data;else if(kind==='tRNS')trns=data;else if(kind==='IDAT')idat.push(data);else if(kind==='IEND')break;
  }
  if(depth!==8)throw new Error(`unsupported bit depth ${depth} (need 8)`);
  if(interlace)throw new Error('interlaced PNG not supported');
  const ch={0:1,2:3,3:1,4:2,6:4}[type];if(!ch)throw new Error('unsupported color type '+type);
  const raw=zlib.inflateSync(Buffer.concat(idat)),stride=w*ch,out=new Uint8Array(w*h*4);
  let prev=new Uint8Array(stride),cur=new Uint8Array(stride);
  for(let y=0;y<h;y++){
    const f=raw[y*(stride+1)],row=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1));
    for(let x=0;x<stride;x++){
      const a=x>=ch?cur[x-ch]:0,b=prev[x],c=x>=ch?prev[x-ch]:0,v=row[x];
      let r;
      if(f===0)r=v;else if(f===1)r=v+a;else if(f===2)r=v+b;else if(f===3)r=v+((a+b)>>1);
      else{const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);r=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}
      cur[x]=r&255;
    }
    for(let x=0;x<w;x++){
      const o=(y*w+x)*4,s=x*ch;
      if(type===6){out[o]=cur[s];out[o+1]=cur[s+1];out[o+2]=cur[s+2];out[o+3]=cur[s+3];}
      else if(type===2){out[o]=cur[s];out[o+1]=cur[s+1];out[o+2]=cur[s+2];out[o+3]=255;}
      else if(type===0){out[o]=out[o+1]=out[o+2]=cur[s];out[o+3]=255;}
      else if(type===4){out[o]=out[o+1]=out[o+2]=cur[s];out[o+3]=cur[s+1];}
      else{const i=cur[s];out[o]=plte[i*3];out[o+1]=plte[i*3+1];out[o+2]=plte[i*3+2];out[o+3]=trns&&i<trns.length?trns[i]:255;}
    }
    [prev,cur]=[cur,prev];
  }
  return {width:w,height:h,data:out};
}

const CRC=(()=>{const t=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
const crc32=b=>{let c=-1;for(const x of b)c=CRC[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(kind,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const body=Buffer.concat([Buffer.from(kind,'ascii'),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body));return Buffer.concat([len,body,crc]);};

export function encodePNG({width:w,height:h,data}){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;Buffer.from(data.buffer,data.byteOffset+y*w*4,w*4).copy(raw,y*(w*4+1)+1);}
  return Buffer.concat([SIG,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
