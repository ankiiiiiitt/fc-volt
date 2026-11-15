const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib'),fs=require('node:fs');
const P=require('../maxcard-png.js'),C=require('../maxcard-core.js');
function fixture(type,filter){
 const width=3,height=3,bpp=type===6?4:3,source=new Uint8Array(width*height*bpp);for(let i=0;i<source.length;i++)source[i]=(i*71+9)%256;
 const rows=new Uint8Array((width*bpp+1)*height),stride=width*bpp;
 function paeth(a,b,c){const p=a+b-c,ds=[Math.abs(p-a),Math.abs(p-b),Math.abs(p-c)],min=Math.min(...ds);return ds[0]===min?a:ds[1]===min?b:c;}
 for(let y=0;y<height;y++){rows[y*(stride+1)]=filter;for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?source[i-bpp]:0,b=y?source[i-stride]:0,c=y&&x>=bpp?source[i-stride-bpp]:0,predict=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];rows[y*(stride+1)+1+x]=(source[i]-predict)&255;}}
 const header=new Uint8Array(13),v=new DataView(header.buffer);v.setUint32(0,width);v.setUint32(4,height);header[8]=8;header[9]=type;
 return {source,bytes:Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),P.chunk('IHDR',header),P.chunk('IDAT',zlib.deflateSync(rows)),P.chunk('IEND')])};
}
test('decodes independently constructed RGB and RGBA PNGs with all five filters',async()=>{
 for(const type of [2,6])for(let filter=0;filter<=4;filter++){const f=fixture(type,filter),r=await P.decode(f.bytes);assert.equal(r.width,3);assert.equal(r.height,3);if(type===6)assert.deepEqual([...r.data],[...f.source]);else for(let i=0;i<9;i++)assert.deepEqual([...r.data.slice(i*4,i*4+4)],[...f.source.slice(i*3,i*3+3),255]);}
});
test('CPU encoder preserves every channel and color metadata without a canvas',async()=>{
 const data=new Uint8ClampedArray([1,2,3,0,7,18,29,255,0,255,78,128,88,90,255,255]);
 const metadata=[{type:'sRGB',data:new Uint8Array([0])}];const blob=await P.encode({width:2,height:2,data,metadata});const r=await P.decode(await blob.arrayBuffer());assert.deepEqual(r.data,data);assert.deepEqual(r.metadata,metadata);
});
test('PNG corruption and malformed dimensions are rejected',async()=>{
 const f=fixture(6,0);f.bytes[50]^=1;await assert.rejects(()=>P.decode(f.bytes),/checksum/);
 await assert.rejects(()=>P.encode({width:2,height:2,data:new Uint8ClampedArray(4)}),/dimensions/);
});
test('privacy-noised patch readbacks cannot touch protected source pixels',async()=>{
 const original=new Uint8ClampedArray(40*30*4).fill(91),region={x:.25,y:.2,w:.2,h:.2},p=C.rect(region,40,30),noise=new Uint8ClampedArray(p.w*p.h*4).fill(129);
 const final=P.commitPatches(original,40,30,[{...p,data:noise}]);C.assertPreserved(original,final,40,30,[region]);
 const png=await P.encode({width:40,height:30,data:final});const decoded=await P.decode(await png.arrayBuffer());assert.deepEqual(decoded.data,final);C.assertPreserved(original,decoded.data,40,30,[region]);
});
test('rejects out-of-bounds patches',()=>{assert.throws(()=>P.commitPatches(new Uint8ClampedArray(16),2,2,[{x:1,y:1,w:2,h:1,data:new Uint8ClampedArray(8)}]),/patch/);});
test('real screenshot roundtrip retains raw pixels and ICC metadata when private fixture exists',async t=>{
 const path='/tmp/fcvolt-maxcard-fixtures/base.png';if(!fs.existsSync(path))return t.skip('private fixture unavailable');
 const original=await P.decode(fs.readFileSync(path));assert(original.metadata.some(m=>m.type==='iCCP'));const png=await P.encode(original),decoded=await P.decode(await png.arrayBuffer());assert.deepEqual(decoded.data,original.data);assert.deepEqual(decoded.metadata,original.metadata);
});
