/** Pure, dependency-free mathematics. Nothing here reads the DOM or student data. */
export const VERSION = '0.1.0';
export function clampFinite(value, fallback, min, max) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
export function quadratic(a, h, k, x) { return a * (x - h) ** 2 + k; }
export function quadraticFacts(a, h, k) {
  if (![a,h,k].every(Number.isFinite)) throw new TypeError('Finite parameters required');
  if (a === 0) return {kind:'constant',vertex:null,roots:k===0?'all':[]};
  const q = -k/a;
  return {kind:'quadratic',vertex:[h,k],roots:q<0?[]:q===0?[h]:[h-Math.sqrt(q),h+Math.sqrt(q)]};
}
/** Mulberry32: reproducible educational pseudorandomness, NOT cryptographic. */
export function seededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('Invalid uint32 seed');
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function bernoulli(p, n, seed) {
  if (!Number.isFinite(p) || p<0 || p>1) throw new RangeError('p must be in [0,1]');
  if (!Number.isInteger(n) || n<0 || n>20000) throw new RangeError('n must be an integer in [0,20000]');
  const rng = seededRandom(seed);
  const path = []; let heads=0;
  for (let i=1;i<=n;i++) { if(rng()<p) heads++; path.push([i,heads/i]); }
  return {n,heads,proportion:n?heads/n:null,path};
}
export function ols(points) {
  if (!Array.isArray(points) || points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))
    throw new TypeError('Expected finite [x,y] points');
  const n=points.length;
  if(n<2) return {valid:false,reason:'最少需要兩個點'};
  const mx=points.reduce((s,p)=>s+p[0],0)/n, my=points.reduce((s,p)=>s+p[1],0)/n;
  const sxx=points.reduce((s,p)=>s+(p[0]-mx)**2,0);
  const syy=points.reduce((s,p)=>s+(p[1]-my)**2,0);
  const sxy=points.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);
  if(sxx===0) return {valid:false,reason:'x 全部相同：無法唯一估計斜率'};
  const slope=sxy/sxx,intercept=my-slope*mx;
  const residuals=points.map(([x,y])=>y-(slope*x+intercept));
  const sse=residuals.reduce((s,r)=>s+r*r,0);
  const r2=syy===0?null:Math.max(0,Math.min(1,1-sse/syy));
  return {valid:true,n,mx,my,sxx,syy,slope,intercept,sse,residuals,r2};
}
export function leverage(fit,x) { return fit.valid ? 1/fit.n+(x-fit.mx)**2/fit.sxx : null; }
export const BASE_POINTS = [[1,2],[2,3],[3,5],[4,4],[5,7],[6,7],[7,8],[8,10]];
export const fmt = (n,d=2) => n===null || !Number.isFinite(n) ? '—' : Number(n.toFixed(d)).toString();
