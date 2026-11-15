/* Lossless CPU PNG I/O. No canvas readback is used for export verification.
   Supports non-interlaced 8-bit RGB/RGBA PNGs; preserves color-profile chunks. */
(function(root){
  'use strict';
  const signature=new Uint8Array([137,80,78,71,13,10,26,10]);
  const colorChunks=new Set(['iCCP','sRGB','gAMA','cHRM','cICP']);
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
  function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=table[(c^bytes[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function chunk(type,data=new Uint8Array()){
    const bytes=new Uint8Array(data.length+12),view=new DataView(bytes.buffer);view.setUint32(0,data.length);for(let i=0;i<4;i++)bytes[4+i]=type.charCodeAt(i);bytes.set(data,8);view.setUint32(bytes.length-4,crc32(bytes.subarray(4,bytes.length-4)));return bytes;
  }
  async function collect(stream,limit){
    const reader=stream.getReader(),parts=[];let total=0;
    try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();throw Error('PNG data exceeds the declared image dimensions.');}parts.push(value);}}finally{reader.releaseLock();}
    const result=new Uint8Array(total);let at=0;for(const part of parts){result.set(part,at);at+=part.length;}return result;
  }
  function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
  function unsupported(){const e=Error('PNG format requires the browser decoder.');e.code='UNSUPPORTED_PNG';throw e;}
  async function decode(input){
    const bytes=input instanceof Uint8Array?new Uint8Array(input.buffer,input.byteOffset,input.byteLength):new Uint8Array(input);
    if(bytes.length<8||!signature.every((b,i)=>bytes[i]===b))return null;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),compressed=[],metadata=[];let width=0,height=0,bpp=0,at=8,ended=false,hasHeader=false;
    while(at+12<=bytes.length){
      const length=view.getUint32(at);if(length>bytes.length-at-12)throw Error('Truncated PNG chunk.');
      const type=String.fromCharCode(...bytes.subarray(at+4,at+8)),data=bytes.subarray(at+8,at+8+length);
      if(crc32(bytes.subarray(at+4,at+8+length))!==view.getUint32(at+8+length))throw Error('PNG checksum mismatch.');
      if(type==='IHDR'){
        if(hasHeader||at!==8||length!==13)throw Error('Invalid PNG header.');hasHeader=true;width=view.getUint32(at+8);height=view.getUint32(at+12);
        if(!width||!height||width*height>12000000||Math.max(width,height)>8192)throw Error('PNG dimensions exceed the image limit.');
        if(data[8]!==8||![2,6].includes(data[9])||data[10]!==0||data[11]!==0||data[12]!==0)unsupported();bpp=data[9]===6?4:3;
      }else if(type==='IDAT'){if(!hasHeader)throw Error('PNG header is missing.');compressed.push(data);}
      else if(type==='IEND'){ended=true;break;}
      else if(colorChunks.has(type))metadata.push({type,data:data.slice()});
      at+=length+12;
    }
    if(!hasHeader||!ended||!compressed.length)throw Error('Incomplete PNG image.');
    const stride=width*bpp,expected=(stride+1)*height;
    const raw=await collect(new Blob(compressed).stream().pipeThrough(new DecompressionStream('deflate')),expected);
    if(raw.length!==expected)throw Error('Unexpected PNG scanline length.');
    const reconstructed=new Uint8Array(stride*height);
    for(let y=0;y<height;y++){
      const filter=raw[y*(stride+1)];if(filter>4)throw Error('Invalid PNG scanline filter.');
      for(let x=0;x<stride;x++){
        const at=y*stride+x,left=x>=bpp?reconstructed[at-bpp]:0,above=y?reconstructed[at-stride]:0,upperLeft=y&&x>=bpp?reconstructed[at-stride-bpp]:0;
        const predict=filter===0?0:filter===1?left:filter===2?above:filter===3?Math.floor((left+above)/2):paeth(left,above,upperLeft);
        reconstructed[at]=(raw[y*(stride+1)+1+x]+predict)&255;
      }
    }
    const data=new Uint8ClampedArray(width*height*4);
    if(bpp===4)data.set(reconstructed);else for(let i=0,j=0;i<reconstructed.length;i+=3,j+=4){data[j]=reconstructed[i];data[j+1]=reconstructed[i+1];data[j+2]=reconstructed[i+2];data[j+3]=255;}
    return {width,height,data,metadata};
  }
  async function encode({width,height,data,metadata=[]}){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>12000000||Math.max(width,height)>8192||data.length!==width*height*4)throw Error('Invalid PNG image dimensions.');
    const stride=width*4,rows=new Uint8Array((stride+1)*height);
    for(let y=0;y<height;y++){const start=y*(stride+1);rows[start]=2;for(let x=0;x<stride;x++)rows[start+1+x]=(data[y*stride+x]-(y?data[(y-1)*stride+x]:0))&255;}
    const compressed=await collect(new Blob([rows]).stream().pipeThrough(new CompressionStream('deflate')),rows.length+65536);
    const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=6;
    return new Blob([signature,chunk('IHDR',header),...metadata.filter(m=>colorChunks.has(m.type)).map(m=>chunk(m.type,m.data)),chunk('IDAT',compressed),chunk('IEND')],{type:'image/png'});
  }
  function commitPatches(original,width,height,patches){
    if(original.length!==width*height*4)throw Error('Source dimensions changed.');const data=new Uint8ClampedArray(original);
    for(const p of patches){
      if(![p.x,p.y,p.w,p.h].every(Number.isInteger)||p.x<0||p.y<0||p.w<1||p.h<1||p.x+p.w>width||p.y+p.h>height||p.data.length!==p.w*p.h*4)throw Error('Invalid edit patch.');
      for(let y=0;y<p.h;y++)data.set(p.data.subarray(y*p.w*4,(y+1)*p.w*4),((p.y+y)*width+p.x)*4);
    }
    return data;
  }
  const api={decode,encode,commitPatches,crc32,chunk};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaxCardPNG=api;
})(globalThis);
