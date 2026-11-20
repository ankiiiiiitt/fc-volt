/* Native game controls, measured against the supplied 2796×1290 profile.
   Coordinates are converted back to canonical space before the upload transform.
   Keep existing active artwork; RenderZ supplies values, never replacement icons. */
(function(root){
  const calibration={sx:1579/1940,sy:257/316,dx:257.0051546391753,dy:110.84177215189874};
  function map(box,t){const [x,y,w,h]=box,c=calibration;return MaxCardLayout.map([(x-c.dx)/c.sx,(y-c.dy)/c.sy,w/c.sx,h/c.sy],t);}
  function boxes(t){return {ranks:Array.from({length:6},(_,i)=>map([1731+48.2*i,748,i===5?50:40,43],t)),skills:Array.from({length:6},(_,i)=>map([1730+104.8*i,908,98,100],t)),badges:Array.from({length:6},(_,i)=>map([1804+104.8*i,964,24,42],t))};}
  function active(data){let bright=0;for(let i=0;i<data.length;i+=4)if(Math.min(data[i],data[i+1],data[i+2])>130)bright++;return bright>data.length/4*.12;}
  function orange(data){let n=0;for(let i=0;i<data.length;i+=4)if(data[i]>90&&data[i]>data[i+1]*1.5&&data[i+1]>data[i+2]*1.4)n++;return n>data.length/4*.08;}
  function sameGlyph(a,b,width){
    const height=a.length/4/width;let best=0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){let same=0,ink=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=(y*width+x)*4,j=((y+dy)*width+x+dx)*4;
        const ai=Math.min(a[i],a[i+1],a[i+2])>140,bi=x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height&&Math.min(b[j],b[j+1],b[j+2])>140;
        if(ai||bi){ink++;if(ai===bi)same++;}
      }best=Math.max(best,ink?same/ink:0);
    }return best>.78;
  }
  function sameArtwork(a,b,width){
    // Correlation ignores the disabled-state brightness multiplier, but checks
    // the actual central symbol before reusing a primary-role sprite.
    const height=a.length/4/width,aa=[],bb=[];
    for(let y=Math.floor(height*.25);y<height*.7;y++)for(let x=Math.floor(width*.3);x<width*.7;x++){const k=(y*width+x)*4;aa.push((a[k]+a[k+1]+a[k+2])/3);bb.push((b[k]+b[k+1]+b[k+2])/3);}
    const ma=aa.reduce((a,b)=>a+b,0)/aa.length,mb=bb.reduce((a,b)=>a+b,0)/bb.length;let dot=0,va=0,vb=0;
    aa.forEach((v,i)=>{const x=v-ma,y=bb[i]-mb;dot+=x*y;va+=x*x;vb+=y*y;});return dot/Math.sqrt(va*vb)>.92;
  }
  root.MaxCardNative={boxes,active,orange,sameGlyph,sameArtwork};
})(globalThis);
