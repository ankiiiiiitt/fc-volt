const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../maxcard-core.js');
const gabriel = {ovr:127,pacing:179,shooting:137,passing:138,dribbling:158,defending:231,physical:222,position:'CB',skills:[{name:'Defender',points:2},{name:'Scoring',points:1},{name:'Defending',points:1},{name:'Physical',points:1}]};
test('Gabriel example extracts all labeled values and exact skills',()=>{
 const result=C.parseOCR('Player: Gabriel Magalhães\nOVR 127\nCB\nPacing 179\nShooting 137\nPassing 138\nDribbling 158\nDefending 231\nPhysical 222\nDefender +2\nScoring +1\nDefending +1\nPhysical +1');
 for(const key of C.fields)assert.equal(result[key],gabriel[key]);
 assert.equal(result.name,'Gabriel Magalhães');assert.equal(result.position,'CB');assert.deepEqual(result.skills,gabriel.skills);C.validate(result);
});
test('conflicting OCR and missing stats never produce invented numbers',()=>{
 const r=C.parseOCR('OVR 122\nOVR 127\nPace 179\nDefending +1\nPhysical +1');
 assert.equal(r.ovr,undefined);assert.equal(r.pacing,179);assert.equal(r.shooting,undefined);
 // Skill allocations are not attribute totals.
 assert.equal(r.defending,undefined);assert.equal(r.physical,undefined);
});
test('alternate number-first labels and goalkeeper attributes stay conservative',()=>{
 assert.equal(C.parseOCR('179 Pace').pacing,179);assert.equal(C.parseOCR('Diving 200\nHandling 199').pacing,undefined);
});
test('invalid or incomplete values and skill counts are rejected',()=>{
 assert.throws(()=>C.validate({...gabriel,shooting:''}));assert.throws(()=>C.validate({...gabriel,ovr:201}));assert.throws(()=>C.validate({...gabriel,position:'INVALID'}));assert.throws(()=>C.validate({...gabriel,skills:[{name:'Defender',points:2}]}));
});
test('coordinate scaling and bounds reject unsafe masks',()=>{
 assert.deepEqual(C.rect({x:.1,y:.2,w:.2,h:.3},2000,1000),{x:200,y:200,w:400,h:300});
 for(const r of [{x:-1,y:0,w:1,h:1},{x:0,y:0,w:0,h:1},{x:.9,y:0,w:.5,h:1},{x:NaN,y:0,w:1,h:1}])assert.throws(()=>C.rect(r,100,100));
});
test('pixel guard detects RGBA changes outside the union of masks',()=>{
 const input=new Uint8ClampedArray(10*10*4).fill(88),output=input.slice();const masks=[{x:.2,y:.2,w:.2,h:.2}];
 output[(2*10+2)*4]=99;assert.deepEqual(C.assertPreserved(input,output,10,10,masks),{changed:1,outsideChanged:0});
 output[3]=0;assert.throws(()=>C.assertPreserved(input,output,10,10,masks),/preservation failed/);
 assert.throws(()=>C.assertPreserved(input,output,9,10,masks),/dimensions changed/);
});
