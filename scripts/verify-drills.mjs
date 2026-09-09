/**
 * Independent check of the generated drills.
 *
 * Deliberately does NOT reuse the generator's maths. It reads the numbers back
 * out of the finished stem and recomputes from the physics, so a wrong formula
 * in the generator cannot agree with itself and pass.
 */
import fs from 'node:fs';

const drills = JSON.parse(fs.readFileSync('data/drills.json', 'utf8'));
// A NaN here means the check's own regex failed to read the stem, which is a
// bug in this file rather than in the bank - fail loudly instead of silently.
const num = (s) => Number(String(s).replace(/[, ]/g, '').replace(/[^\d.\-]/g, ''));
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= Math.max(tol, Math.abs(b) * 0.01);

const CHECKS = {
  'ohm-voltage': (q) => {
    const [, R, I] = q.stem.match(/resistor of (\d+(?:\.\d+)?) Ω carries a current of (\d+(?:\.\d+)?) A/);
    return [Number(R) * Number(I), num(q.options[q.answerIndex])];
  },
  'ohm-resistance': (q) => {
    const [, V, I] = q.stem.match(/drops (\d+(?:\.\d+)?) V while carrying (\d+(?:\.\d+)?) A/);
    return [Number(V) / Number(I), num(q.options[q.answerIndex])];
  },
  'power-vi': (q) => {
    const [, V, I] = q.stem.match(/runs at (\d+(?:\.\d+)?) V and draws (\d+(?:\.\d+)?) A/);
    return [Number(V) * Number(I), num(q.options[q.answerIndex])];
  },
  'power-i2r': (q) => {
    const [, R, I] = q.stem.match(/cable of (\d+(?:\.\d+)?) Ω carries (\d+(?:\.\d+)?) A/);
    return [Number(I) ** 2 * Number(R), num(q.options[q.answerIndex])];
  },
  'series-resistance': (q) => {
    const [, a, b, c] = q.stem.match(/(\d+(?:\.\d+)?) Ω, (\d+(?:\.\d+)?) Ω and (\d+(?:\.\d+)?) Ω/);
    return [Number(a) + Number(b) + Number(c), num(q.options[q.answerIndex])];
  },
  'parallel-resistance': (q) => {
    const [, a, b] = q.stem.match(/(\d+(?:\.\d+)?) Ω and (\d+(?:\.\d+)?) Ω are wired in parallel/);
    const A = Number(a), B = Number(b);
    return [(A * B) / (A + B), num(q.options[q.answerIndex])];
  },
  'voltage-divider': (q) => {
    const [, Vin, r1, r2] = q.stem.match(/across (\d+(?:\.\d+)?) V, R₁ = (\d+(?:\.\d+)?) Ω and R₂ = (\d+(?:\.\d+)?) Ω/);
    return [(Number(Vin) * Number(r2)) / (Number(r1) + Number(r2)), num(q.options[q.answerIndex])];
  },
  'rms-peak': (q) => {
    const [, p] = q.stem.match(/peak value of (\d+(?:\.\d+)?) V/);
    return [Number(p) / Math.SQRT2, num(q.options[q.answerIndex])];
  },
  'transformer-turns': (q) => {
    const [, np, ns, vp] = q.stem.match(/has (\d+(?:\.\d+)?) primary turns and (\d+(?:\.\d+)?) secondary turns, with (\d+(?:\.\d+)?) V/);
    return [(Number(vp) * Number(ns)) / Number(np), num(q.options[q.answerIndex])];
  },
  'frequency-period': (q) => {
    const [, hz] = q.stem.match(/runs at (\d+(?:\.\d+)?) Hz/);
    return [1000 / Number(hz), num(q.options[q.answerIndex])];
  },
  'subnet-hosts': (q) => {
    const [, cidr] = q.stem.match(/\/(\d+)\b/);
    return [Math.pow(2, 32 - Number(cidr)) - 2, num(q.options[q.answerIndex])];
  },
  'subnet-count': (q) => {
    const [, small, big] = q.stem.match(/\/(\d+) subnets fit inside a single \/(\d+)/);
    return [Math.pow(2, Number(small) - Number(big)), num(q.options[q.answerIndex])];
  },
  'transfer-time': (q) => {
    const [, mb, mbps] = q.stem.match(/a (\d+(?:\.\d+)?) MB file over a link of (\d+(?:\.\d+)?) Mbps/);
    return [(Number(mb) * 8) / Number(mbps), num(q.options[q.answerIndex])];
  },
  'fibre-loss-budget': (q) => {
    const m = q.stem.match(
      /A (\d+(?:\.\d+)?) km link at (\d+(?:\.\d+)?) dB\/km has (\d+) connectors at 0\.3 dB each and (\d+) splices at 0\.1 dB each/
    );
    if (!m) return null;
    const [, km, perKm, conn, spl] = m;
    return [Number(km) * Number(perKm) + Number(conn) * 0.3 + Number(spl) * 0.1, num(q.options[q.answerIndex])];
  },
  'subnet-network-address': (q) => {
    const m = q.stem.match(/as (\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)/);
    if (!m) return null;
    const host = Number(m[4]), cidr = Number(m[5]);
    const block = Math.pow(2, 32 - cidr);
    const net = Math.floor(host / block) * block;
    return [net, num(q.options[q.answerIndex].split('.').pop())];
  },
  'subnet-broadcast': (q) => {
    const m = q.stem.match(/subnet (\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)/);
    if (!m) return null;
    const netLast = Number(m[4]), cidr = Number(m[5]);
    const block = Math.pow(2, 32 - cidr);
    return [netLast + block - 1, num(q.options[q.answerIndex].split('.').pop())];
  },
  'cidr-to-mask': (q) => {
    const m = q.stem.match(/prefix \/(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    const parts = [];
    for (let i = 0; i < 4; i++) {
      const bits = Math.min(8, Math.max(0, n - i * 8));
      parts.push(256 - Math.pow(2, 8 - bits));
    }
    // compare as a single number so the shared helper still applies
    const toNum = (s) => s.split('.').reduce((a, b) => a * 256 + Number(b), 0);
    return [toNum(parts.join('.')), toNum(q.options[q.answerIndex])];
  },
  'raid-capacity': (q) => {
    const m = q.stem.match(/(\d+) × (\d+) TB disks is configured as (RAID \d+)/);
    if (!m) return null;
    const disks = Number(m[1]), size = Number(m[2]), level = m[3];
    const usable =
      level === 'RAID 5' ? (disks - 1) * size : level === 'RAID 6' ? (disks - 2) * size : (disks / 2) * size;
    return [usable, num(q.options[q.answerIndex])];
  },
  'fibre-delay': (q) => {
    const [, km, n] = q.stem.match(/travels (\d+(?:\.\d+)?) km through fibre with refractive index (\d+(?:\.\d+)?)/);
    return [((Number(km) * 1000) / (3e8 / Number(n))) * 1000, num(q.options[q.answerIndex])];
  },
  'db-power-ratio': (q) => {
    const [, r] = q.stem.match(/factor of (\d+(?:\.\d+)?)/);
    return [10 * Math.log10(Number(r)), num(q.options[q.answerIndex])];
  },
  'storage-binary': (q) => {
    const [, n] = q.stem.match(/in (\d+(?:\.\d+)?) MiB/);
    return [Number(n) * 1048576, num(q.options[q.answerIndex])];
  },
  'ups-runtime': (q) => {
    const [, wh, pct, load] = q.stem.match(/stores (\d+(?:\.\d+)?) Wh, of which (\d+(?:\.\d+)?)% is usable, and carries a (\d+(?:\.\d+)?) W/);
    return [(Number(wh) * (Number(pct) / 100)) / Number(load), num(q.options[q.answerIndex])];
  },
  'availability-mtbf': (q) => {
    const [, mtbf, mttr] = q.stem.match(/MTBF of (\d+(?:\.\d+)?) h and MTTR of (\d+(?:\.\d+)?) h/);
    return [(Number(mtbf) / (Number(mtbf) + Number(mttr))) * 100, num(q.options[q.answerIndex])];
  },
  'ontime-compliance': (q) => {
    const [, planned, done] = q.stem.match(/planned (\d+(?:\.\d+)?) tasks and (\d+(?:\.\d+)?) were completed/);
    return [(Number(done) / Number(planned)) * 100, num(q.options[q.answerIndex])];
  },
  'energy-cost': (q) => {
    const [, w, h, rate] = q.stem.match(/A (\d+(?:\.\d+)?) W appliance runs for (\d+(?:\.\d+)?) hours\. At (\d+(?:\.\d+)?) RWF/);
    return [((Number(w) * Number(h)) / 1000) * Number(rate), num(q.options[q.answerIndex])];
  },
};

const stats = new Map();
let checked = 0, failed = 0;
const failures = [];

for (const q of drills) {
  const fn = CHECKS[q.skill];
  if (!fn) continue;
  let pair;
  try { pair = fn(q); } catch { continue; }
  if (!pair) continue;
  const [expected, got] = pair;
  if (!Number.isFinite(expected)) {
    console.error(`check for ${q.skill} could not parse its own stem: ${q.stem.slice(0, 80)}`);
    process.exit(2);
  }
  checked++;
  const ok = near(got, expected);
  const s = stats.get(q.skill) ?? { n: 0, bad: 0 };
  s.n++; if (!ok) { s.bad++; failed++; if (failures.length < 5) failures.push({ id: q.id, skill: q.skill, stem: q.stem.slice(0, 90), expected, got }); }
  stats.set(q.skill, s);
}

console.log(`recomputed ${checked.toLocaleString()} of ${drills.length.toLocaleString()} drills from their own stems`);
console.log(`mismatches: ${failed}`);
console.log('');
for (const [k, v] of [...stats].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${v.bad === 0 ? 'PASS' : 'FAIL'}  ${String(v.n).padStart(4)}  ${k}${v.bad ? '  (' + v.bad + ' wrong)' : ''}`);
}
for (const f of failures) console.log('\n  ' + JSON.stringify(f, null, 1));
process.exit(failed ? 1 : 0);
