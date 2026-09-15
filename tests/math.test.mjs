import test from 'node:test';
import assert from 'node:assert/strict';
import {quadratic,quadraticFacts,bernoulli,ols,leverage,clampFinite,seededRandom,BASE_POINTS} from '../site/assets/math.mjs';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('quadratic target passes through (4,5)',()=>close(quadratic(2,2,-3,4),5));
test('quadratic symmetry around h',()=>{for(const a of [-3,-1,.5,2])for(const d of [.5,1,2])close(quadratic(a,2,-3,2+d),quadratic(a,2,-3,2-d));});
test('positive and negative a retain vertex',()=>{assert.deepEqual(quadraticFacts(-2,-1,3).vertex,[-1,3]);});
test('a=0 has no unique vertex',()=>{assert.deepEqual(quadraticFacts(0,2,4),{kind:'constant',vertex:null,roots:[]});assert.equal(quadraticFacts(0,2,0).roots,'all');});
test('two real roots, one root and no real roots',()=>{assert.deepEqual(quadraticFacts(1,0,-4).roots,[-2,2]);assert.deepEqual(quadraticFacts(2,3,0).roots,[3]);assert.deepEqual(quadraticFacts(1,0,1).roots,[]);});
test('computed roots satisfy equation',()=>{for(const x of quadraticFacts(2,2,-3).roots)close(quadratic(2,2,-3,x),0);});
test('invalid quadratic input rejected',()=>assert.throws(()=>quadraticFacts(NaN,0,0)));
test('seeded RNG reproducible and in [0,1)',()=>{const a=seededRandom(2026),b=seededRandom(2026);for(let i=0;i<1000;i++){const x=a();assert.equal(x,b());assert.ok(x>=0&&x<1);}});
test('uint32 seed 0 is valid',()=>assert.equal(typeof seededRandom(0)(),'number'));
test('invalid seeds rejected',()=>{for(const s of [-1,1.2,4294967296,NaN])assert.throws(()=>seededRandom(s));});
test('Bernoulli zero trials is not a zero proportion',()=>assert.deepEqual(bernoulli(.5,0,5),{n:0,heads:0,proportion:null,path:[]}));
test('p=0 and p=1 endpoints',()=>{assert.equal(bernoulli(0,100,5).heads,0);assert.equal(bernoulli(1,100,5).heads,100);});
test('appending trials preserves original seeded path',()=>assert.deepEqual(bernoulli(.7,10,5).path,bernoulli(.7,100,5).path.slice(0,10)));
test('proportions calculated from counts',()=>{const r=bernoulli(.5,20000,0);assert.equal(r.proportion,r.heads/r.n);assert.equal(r.path.length,20000);});
test('teacher counterexample: a longer seeded sample can be farther from p',()=>{
  // Counts independently checked using Python integer arithmetic for the uint32 generator.
  const short=bernoulli(.5,100,5),long=bernoulli(.5,1000,5);
  assert.equal(short.heads,49);assert.equal(long.heads,528);
  close(short.proportion,.49);close(long.proportion,.528);
  assert.ok(Math.abs(long.proportion-.5)>Math.abs(short.proportion-.5));
});
test('count deviation can grow while relative frequency approaches p',()=>{
  const short=bernoulli(.5,100,0),long=bernoulli(.5,1000,0);
  assert.equal(short.heads,56);assert.equal(long.heads,511);
  assert.ok(Math.abs(long.heads-long.n*.5)>Math.abs(short.heads-short.n*.5));
  assert.ok(Math.abs(long.proportion-.5)<Math.abs(short.proportion-.5));
});
test('invalid probabilities and batch sizes rejected',()=>{for(const p of [-.1,1.1,NaN])assert.throws(()=>bernoulli(p,10,1));for(const n of [-1,.5,20001,Infinity])assert.throws(()=>bernoulli(.5,n,1));});
test('OLS exact line',()=>{const r=ols([[0,1],[1,3],[2,5]]);close(r.slope,2);close(r.intercept,1);close(r.r2,1);});
test('OLS centered implementation baseline',()=>{
  const r=ols(BASE_POINTS);
  // Independently from raw sums: sum(x)=36, sum(y)=46, sum(x²)=204,
  // sum(xy)=252, sum(y²)=316. Thus Sxx=42, Sxy=45, Syy=103/2.
  close(r.sxx,42);close(r.syy,103/2);close(r.slope,15/14);close(r.intercept,13/14);
  close(r.sse,23/7);close(r.r2,675/721);
});
test('residuals are signed vertical offsets from the current fit',()=>{
  const r=ols(BASE_POINTS),expected=[0,-1/14,6/7,-17/14,5/7,-5/14,-3/7,1/2];
  r.residuals.forEach((e,i)=>close(e,expected[i]));
  close(r.residuals.reduce((sum,e)=>sum+e,0),0);
});
test('x mean point changes intercept not slope',()=>{const b=ols(BASE_POINTS),r=ols([...BASE_POINTS,[4.5,14]]);close(r.slope,b.slope);assert.ok(r.intercept>b.intercept);});
test('far low point changes slope more than mean point',()=>{const b=ols(BASE_POINTS),m=ols([...BASE_POINTS,[4.5,14]]),f=ols([...BASE_POINTS,[11,2]]);assert.ok(Math.abs(f.slope-b.slope)>Math.abs(m.slope-b.slope));});
test('extreme point on fitted line does not change fit',()=>{const b=ols(BASE_POINTS),r=ols([...BASE_POINTS,[11,b.intercept+11*b.slope]]);close(r.slope,b.slope);close(r.intercept,b.intercept);});
test('equal high leverage can accompany different changes to the fitted line',()=>{
  const low=ols([...BASE_POINTS,[11,2]]),along=ols([...BASE_POINTS,[11,13]]);
  // Independent rational raw-sum calculations; these are the two classroom presets.
  close(leverage(low,11),95/179);close(leverage(along,11),95/179);
  close(low.slope,105/358);close(low.intercept,1361/358);
  close(along.slope,391/358);close(along.intercept,305/358);
  assert.ok(Math.abs(along.slope-15/14)<Math.abs(low.slope-15/14));
  close(leverage(ols([...BASE_POINTS,[4.5,14]]),4.5),1/9);
});
test('identical x values and too few points are explicitly undefined',()=>{assert.equal(ols([[1,0],[1,1]]).valid,false);assert.equal(ols([[0,1]]).valid,false);assert.equal(ols([]).valid,false);});
test('constant y returns undefined R-squared',()=>{const r=ols([[0,4],[1,4],[2,4]]);assert.equal(r.r2,null);close(r.slope,0);});
test('nonfinite and malformed data rejected',()=>{assert.throws(()=>ols([[0,NaN],[1,2]]));assert.throws(()=>ols([[0],[1,2]]));});
test('clamp URL values rather than propagating NaN',()=>{assert.equal(clampFinite('NaN',1,-3,3),1);assert.equal(clampFinite('Infinity',1,-3,3),1);assert.equal(clampFinite(null,1,-3,3),1);assert.equal(clampFinite('',1,-3,3),1);assert.equal(clampFinite('200',1,-3,3),3);assert.equal(clampFinite('-200',1,-3,3),-3);});
