/**
 * Drill generator.
 *
 * The point is volume that actually teaches. Two rules make the difference
 * between a drill bank and the "53,000 questions" this project started from:
 *
 *  1. Repeat the CONCEPT, never the QUESTION. Every item below is a different
 *     problem - different network, different resistor, different budget - not a
 *     reworded stem over the same four options. Rewording teaches someone to
 *     recognise phrasing; new numbers make them do the work again.
 *
 *  2. Distractors are the mistakes people actually make. For R = V/I the wrong
 *     options are V*I and I/V, because those are the two things a candidate
 *     reaches for under time pressure. Picking one tells them which error they
 *     made, which a random number never could.
 *
 * Everything is deterministic: the same seed produces byte-identical output, so
 * rebuilding never moves an answer under someone who has already bought a bank.
 *
 *   node scripts/generate-drills.mjs [count]
 */

import fs from 'node:fs';
import { extraFamilies } from './drill-families-extra.mjs';

const TARGET = Number(process.argv[2]) || 12000;

/* ---------- deterministic randomness ---------- */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260909);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const round = (n, d = 2) => Number(n.toFixed(d));

/* ---------- helpers ---------- */

const RW = [
  'a Kigali district office',
  'a health-centre server room',
  'a TVET training workshop',
  'a sector office network',
  'a hospital IT room',
  'a school computer lab',
];

/** Build one item, dropping distractors that collide with the key or each other. */
function item(skill, topic, source, stem, correct, wrongs, explanation, difficulty = 'Medium') {
  const seen = new Set([String(correct)]);
  const options = [String(correct)];
  for (const w of wrongs) {
    const s = String(w);
    if (seen.has(s)) continue;
    seen.add(s);
    options.push(s);
    if (options.length === 4) break;
  }
  if (options.length < 4) return null; // never pad with filler
  return { skill, topic, source, stem, options, answerIndex: 0, explanation, difficulty };
}

/* ---------- skill families ----------
   Each returns one item, or null when its parameters happen to collide.      */

const FAMILIES = [
  // ---------------- electrical ----------------
  {
    id: 'ohm-voltage',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const I = round(between(2, 90) / 10, 1);
      const R = between(3, 220);
      const V = round(I * R, 2);
      return item(
        this.id, this.topic, this.source,
        `A resistor of ${R} Ω carries a current of ${I} A. What voltage appears across it?`,
        `${V} V`,
        [`${round(R / I, 2)} V`, `${round(I / R, 3)} V`, `${round(V / 2, 2)} V`],
        `Ohm's law gives V = I × R, so ${I} × ${R} = ${V} V. Dividing instead of multiplying is the usual slip.`,
        'Easy'
      );
    },
  },
  {
    id: 'ohm-resistance',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const I = round(between(2, 60) / 10, 1);
      const R = between(4, 180);
      const V = round(I * R, 2);
      return item(
        this.id, this.topic, this.source,
        `A component drops ${V} V while carrying ${I} A. What is its resistance?`,
        `${R} Ω`,
        [`${round(V * I, 2)} Ω`, `${round(I / V, 4)} Ω`, `${round(R * 2, 2)} Ω`],
        `Rearranging Ohm's law, R = V / I = ${V} / ${I} = ${R} Ω. Multiplying V by I gives power, not resistance.`,
        'Easy'
      );
    },
  },
  {
    id: 'power-vi',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const V = pick([12, 24, 48, 110, 230, 240, 400]);
      const I = round(between(3, 140) / 10, 1);
      const P = round(V * I, 2);
      return item(
        this.id, this.topic, this.source,
        `Equipment in ${pick(RW)} runs at ${V} V and draws ${I} A. What power does it consume?`,
        `${P} W`,
        [`${round(V / I, 2)} W`, `${round(P / 2, 2)} W`, `${round(V + I, 2)} W`],
        `P = V × I = ${V} × ${I} = ${P} W.`,
        'Easy'
      );
    },
  },
  {
    id: 'power-i2r',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const I = round(between(5, 60) / 10, 1);
      const R = between(2, 60);
      const P = round(I * I * R, 2);
      return item(
        this.id, this.topic, this.source,
        `A cable of ${R} Ω carries ${I} A. How much power is dissipated as heat in the cable?`,
        `${P} W`,
        [`${round(I * R, 2)} W`, `${round(I * I / R, 3)} W`, `${round(P * 2, 2)} W`],
        `Conduction loss is P = I²R = ${I}² × ${R} = ${P} W. Forgetting to square the current is the common error.`
      );
    },
  },
  {
    id: 'series-resistance',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const a = between(5, 180), b = between(5, 180), c = between(5, 180);
      const total = a + b + c;
      const par = round(1 / (1 / a + 1 / b + 1 / c), 2);
      return item(
        this.id, this.topic, this.source,
        `Three resistors of ${a} Ω, ${b} Ω and ${c} Ω are connected in series. What is the total resistance?`,
        `${total} Ω`,
        [`${par} Ω`, `${Math.max(a, b, c)} Ω`, `${round(total / 3, 2)} Ω`],
        `Series resistances add: ${a} + ${b} + ${c} = ${total} Ω. The reciprocal formula is for parallel, and gives ${par} Ω here.`,
        'Easy'
      );
    },
  },
  {
    id: 'parallel-resistance',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const a = between(4, 120), b = between(4, 120);
      const par = round((a * b) / (a + b), 2);
      return item(
        this.id, this.topic, this.source,
        `Two resistors of ${a} Ω and ${b} Ω are wired in parallel. What is the combined resistance?`,
        `${par} Ω`,
        [`${a + b} Ω`, `${round((a + b) / 2, 2)} Ω`, `${Math.min(a, b)} Ω`],
        `For two in parallel R = (R₁R₂)/(R₁+R₂) = (${a}×${b})/(${a}+${b}) = ${par} Ω. Note it is always below the smaller resistor.`
      );
    },
  },
  {
    id: 'energy-cost',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const W = pick([400, 750, 1200, 1500, 2000, 2500]);
      const hrs = between(2, 10);
      const rate = pick([89, 105, 126, 182]);
      const kwh = round((W * hrs) / 1000, 2);
      const cost = Math.round(kwh * rate);
      return item(
        this.id, this.topic, this.source,
        `A ${W} W appliance runs for ${hrs} hours. At ${rate} RWF per kWh, what does that cost?`,
        `${cost.toLocaleString()} RWF`,
        [
          `${(Math.round(W * hrs * rate)).toLocaleString()} RWF`,
          `${(Math.round(kwh * rate / hrs)).toLocaleString()} RWF`,
          `${(Math.round(kwh)).toLocaleString()} RWF`,
        ],
        `Energy = ${W} W × ${hrs} h = ${W * hrs} Wh = ${kwh} kWh. Cost = ${kwh} × ${rate} = ${cost.toLocaleString()} RWF. Forgetting to convert Wh to kWh inflates it a thousandfold.`
      );
    },
  },
  {
    id: 'voltage-divider',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const Vin = pick([9, 12, 15, 24, 48]);
      const r1 = between(10, 100), r2 = between(10, 100);
      const vout = round((Vin * r2) / (r1 + r2), 2);
      return item(
        this.id, this.topic, this.source,
        `In a divider across ${Vin} V, R₁ = ${r1} Ω and R₂ = ${r2} Ω. What voltage appears across R₂?`,
        `${vout} V`,
        [`${round((Vin * r1) / (r1 + r2), 2)} V`, `${round(Vin / 2, 2)} V`, `${round(Vin * r2, 1)} V`],
        `V_out = V_in × R₂/(R₁+R₂) = ${Vin} × ${r2}/${r1 + r2} = ${vout} V. Using R₁ on top gives the voltage across the other resistor.`
      );
    },
  },
  {
    id: 'transformer-turns',
    topic: 'Electronics & Automation',
    source: 'Electrical Principles Drill',
    make() {
      const np = pick([100, 120, 150, 200, 240, 300, 400, 480, 500, 600, 800, 960, 1200, 1500, 2000]);
      const ratio = pick([2, 3, 4, 5, 6, 8, 10, 12]);
      const ns = np / ratio;
      const vp = pick([230, 240, 400]);
      const vs = round(vp / ratio, 1);
      return item(
        this.id, this.topic, this.source,
        `A transformer has ${np} primary turns and ${ns} secondary turns, with ${vp} V on the primary. What is the secondary voltage?`,
        `${vs} V`,
        [`${round(vp * ratio, 1)} V`, `${vp} V`, `${round(vp / (ratio * 2), 1)} V`],
        `Vₛ/Vₚ = Nₛ/Nₚ, so Vₛ = ${vp} × ${ns}/${np} = ${vs} V. Inverting the ratio turns a step-down into a step-up.`
      );
    },
  },
  {
    id: 'rms-peak',
    topic: 'Electrical Circuits',
    source: 'Electrical Principles Drill',
    make() {
      const peak = between(10, 340);
      const rms = round(peak / Math.SQRT2, 2);
      return item(
        this.id, this.topic, this.source,
        `A sinusoidal supply has a peak value of ${peak} V. What is its RMS value?`,
        `${rms} V`,
        [`${round(peak * Math.SQRT2, 2)} V`, `${round(peak / 2, 2)} V`, `${peak} V`],
        `For a sine wave V_RMS = V_peak / √2 = ${peak} / 1.414 = ${rms} V. Multiplying by √2 instead goes the wrong way.`
      );
    },
  },

  // ---------------- networking ----------------
  {
    id: 'subnet-hosts',
    topic: 'Networking',
    source: 'Networking Drill',
    make() {
      const cidr = between(16, 30);
      const bits = 32 - cidr;
      const usable = Math.pow(2, bits) - 2;
      const octet = pick(['192.168', '10.40', '172.16', '10.10', '192.168.20']);
      return item(
        this.id, this.topic, this.source,
        `An engineer plans addressing for ${octet}.0/${cidr} in ${pick(RW)}. How many usable host addresses does that subnet provide?`,
        usable.toLocaleString(),
        [
          Math.pow(2, bits).toLocaleString(),
          (Math.pow(2, bits) - 1).toLocaleString(),
          Math.pow(2, Math.max(1, bits - 1)).toLocaleString(),
        ],
        `A /${cidr} leaves ${bits} host bits: 2^${bits} = ${Math.pow(2, bits).toLocaleString()} addresses, minus the network and broadcast, so ${usable.toLocaleString()} are usable.`,
        cidr >= 28 ? 'Easy' : 'Medium'
      );
    },
  },
  {
    id: 'cidr-to-mask',
    topic: 'Networking',
    source: 'Networking Drill',
    make() {
      const cidr = between(8, 30);
      const maskOf = (n) => {
        const m = [];
        for (let i = 0; i < 4; i++) {
          const bits = Math.min(8, Math.max(0, n - i * 8));
          m.push(256 - Math.pow(2, 8 - bits));
        }
        return m.join('.');
      };
      return item(
        this.id, this.topic, this.source,
        `Which subnet mask matches the prefix /${cidr}?`,
        maskOf(cidr),
        [maskOf(cidr + 1), maskOf(cidr - 1), maskOf(Math.max(8, cidr - 8))],
        `A /${cidr} sets the first ${cidr} bits, which is ${maskOf(cidr)} in dotted decimal.`
      );
    },
  },
  {
    id: 'subnet-network-address',
    topic: 'Networking',
    source: 'Networking Drill',
    make() {
      const cidr = pick([25, 26, 27, 28, 29]);
      const block = Math.pow(2, 32 - cidr);
      const third = between(0, 254);
      const host = between(1, 254);
      const netLast = Math.floor(host / block) * block;
      const bcast = netLast + block - 1;
      const base = `192.168.${third}.`;
      return item(
        this.id, this.topic, this.source,
        `A host is configured as ${base}${host}/${cidr}. What is its network address?`,
        `${base}${netLast}`,
        [`${base}${bcast}`, `${base}0`, `${base}${Math.max(0, netLast - block)}`],
        `A /${cidr} makes blocks of ${block}. ${host} falls in the block starting at ${netLast}, so the network address is ${base}${netLast} and the broadcast is ${base}${bcast}.`,
        'Hard'
      );
    },
  },
  {
    id: 'subnet-broadcast',
    topic: 'Networking',
    source: 'Networking Drill',
    make() {
      const cidr = pick([26, 27, 28, 29, 30]);
      const block = Math.pow(2, 32 - cidr);
      const third = between(0, 254);
      const netLast = Math.floor(between(0, 240) / block) * block;
      const bcast = netLast + block - 1;
      const base = `10.20.${third}.`;
      return item(
        this.id, this.topic, this.source,
        `What is the broadcast address of the subnet ${base}${netLast}/${cidr}?`,
        `${base}${bcast}`,
        [`${base}${netLast}`, `${base}255`, `${base}${Math.max(0, bcast - 1)}`],
        `With a block size of ${block}, the subnet runs ${base}${netLast} to ${base}${bcast}, so the broadcast is ${base}${bcast}. The last usable host is ${base}${bcast - 1}.`,
        'Hard'
      );
    },
  },
  {
    id: 'subnet-count',
    topic: 'Networking',
    source: 'Networking Drill',
    make() {
      const base = pick([8, 12, 16, 20, 22, 24]);
      const cidr = between(base + 1, Math.min(30, base + 10));
      const n = Math.pow(2, cidr - base);
      return item(
        this.id, this.topic, this.source,
        `How many /${cidr} subnets fit inside a single /${base} network?`,
        n.toLocaleString(),
        [
          Math.pow(2, 32 - cidr).toLocaleString(),
          (n * 2).toLocaleString(),
          (cidr - base).toLocaleString(),
        ],
        `Borrowing ${cidr - base} bits gives 2^${cidr - base} = ${n.toLocaleString()} subnets.`
      );
    },
  },
  {
    id: 'transfer-time',
    topic: 'Networking',
    source: 'Networking Drill',
    make() {
      const mb = pick([50, 120, 250, 400, 800, 1500]);
      const mbps = pick([5, 10, 20, 50, 100]);
      const secs = round((mb * 8) / mbps, 1);
      return item(
        this.id, this.topic, this.source,
        `Transferring a ${mb} MB file over a link of ${mbps} Mbps takes roughly how long, ignoring overhead?`,
        `${secs} s`,
        [`${round(mb / mbps, 1)} s`, `${round((mb * 8) / (mbps * 8), 1)} s`, `${round(secs / 2, 1)} s`],
        `${mb} MB is ${mb * 8} Mb. At ${mbps} Mbps that is ${mb * 8}/${mbps} = ${secs} s. Mixing megabytes with megabits is the classic factor-of-eight error.`
      );
    },
  },

  // ---------------- fibre ----------------
  {
    id: 'fibre-loss-budget',
    topic: 'Fiber Optics',
    source: 'Fibre Optics Drill',
    make() {
      const km = between(2, 40);
      const perKm = pick([0.22, 0.25, 0.35, 0.4]);
      const conn = between(2, 6);
      const splices = between(2, 14);
      const total = round(km * perKm + conn * 0.3 + splices * 0.1, 2);
      return item(
        this.id, this.topic, this.source,
        `A ${km} km link at ${perKm} dB/km has ${conn} connectors at 0.3 dB each and ${splices} splices at 0.1 dB each. What is the total loss?`,
        `${total} dB`,
        [
          `${round(km * perKm, 2)} dB`,
          `${round(total + conn * 0.3, 2)} dB`,
          `${round(conn * 0.3 + splices * 0.1, 2)} dB`,
        ],
        `Fibre ${round(km * perKm, 2)} dB + connectors ${round(conn * 0.3, 2)} dB + splices ${round(splices * 0.1, 2)} dB = ${total} dB. Budgets fail when the connector and splice terms are left out.`
      );
    },
  },
  {
    id: 'fibre-delay',
    topic: 'Fiber Optics',
    source: 'Fibre Optics Drill',
    make() {
      const km = between(3, 90);
      const n = pick([1.46, 1.465, 1.48]);
      const ms = round((km * 1000) / (3e8 / n) * 1000, 3);
      return item(
        this.id, this.topic, this.source,
        `Light travels ${km} km through fibre with refractive index ${n}. What is the one-way propagation delay?`,
        `${ms} ms`,
        [`${round(ms * 2, 3)} ms`, `${round((km * 1000) / 3e8 * 1000, 3)} ms`, `${round(ms / 2, 3)} ms`],
        `Speed in fibre is c/n = ${Math.round(3e8 / n).toLocaleString()} m/s. Delay = ${km * 1000} m ÷ that = ${ms} ms. Using c alone ignores the glass.`,
        'Hard'
      );
    },
  },
  {
    id: 'db-power-ratio',
    topic: 'Fiber Optics',
    source: 'Fibre Optics Drill',
    make() {
      const ratio = pick([2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 400, 500, 800, 1000]);
      const db = round(10 * Math.log10(ratio), 2);
      return item(
        this.id, this.topic, this.source,
        `An amplifier raises optical power by a factor of ${ratio}. What is that gain in decibels?`,
        `${db} dB`,
        [`${round(20 * Math.log10(ratio), 2)} dB`, `${ratio} dB`, `${round(db / 2, 2)} dB`],
        `For power ratios, dB = 10 log₁₀(${ratio}) = ${db} dB. The 20 log form is for voltage or field, not power.`
      );
    },
  },

  // ---------------- hardware, storage, reliability ----------------
  {
    id: 'storage-binary',
    topic: 'Hardware & Operating Systems',
    source: 'IT Fundamentals Drill',
    make() {
      const n = between(2, 512);
      const bytes = n * 1048576;
      return item(
        this.id, this.topic, this.source,
        `How many bytes are in ${n} MiB, using binary units?`,
        bytes.toLocaleString() + ' bytes',
        [
          (n * 1000000).toLocaleString() + ' bytes',
          (n * 1024).toLocaleString() + ' bytes',
          (n * 1073741824).toLocaleString() + ' bytes',
        ],
        `1 MiB = 1024² = 1,048,576 bytes, so ${n} × 1,048,576 = ${bytes.toLocaleString()} bytes. The decimal megabyte (${(n * 1000000).toLocaleString()}) is a different unit.`
      );
    },
  },
  {
    id: 'raid-capacity',
    topic: 'Hardware & Operating Systems',
    source: 'IT Fundamentals Drill',
    make() {
      const disks = between(4, 24);
      const size = pick([1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      const level = pick(['RAID 5', 'RAID 6', 'RAID 10']);
      const usable =
        level === 'RAID 5' ? (disks - 1) * size : level === 'RAID 6' ? (disks - 2) * size : (disks / 2) * size;
      if (level === 'RAID 10' && disks % 2 !== 0) return null;
      return item(
        this.id, this.topic, this.source,
        `An array of ${disks} × ${size} TB disks is configured as ${level}. How much usable capacity results?`,
        `${usable} TB`,
        [`${disks * size} TB`, `${(disks - 1) * size === usable ? (disks - 2) * size : (disks - 1) * size} TB`, `${round((disks * size) / 2, 1)} TB`],
        level === 'RAID 5'
          ? `RAID 5 spends one disk on parity: (${disks} − 1) × ${size} = ${usable} TB.`
          : level === 'RAID 6'
            ? `RAID 6 spends two disks on parity: (${disks} − 2) × ${size} = ${usable} TB.`
            : `RAID 10 mirrors, so half the raw capacity is usable: ${disks}/2 × ${size} = ${usable} TB.`
      );
    },
  },
  {
    id: 'ups-runtime',
    topic: 'Maintenance',
    source: 'Maintenance Drill',
    make() {
      const wh = pick([240, 300, 360, 500, 600, 720, 900, 1000, 1200, 1500, 1800, 2400, 3000]);
      const eff = pick([0.7, 0.75, 0.8, 0.85, 0.9]);
      const load = pick([80, 100, 120, 150, 180, 200, 250, 300, 400, 500]);
      const hrs = round((wh * eff) / load, 2);
      return item(
        this.id, this.topic, this.source,
        `A UPS stores ${wh} Wh, of which ${Math.round(eff * 100)}% is usable, and carries a ${load} W load. What is the idealised runtime?`,
        `${hrs} h`,
        [`${round(wh / load, 2)} h`, `${round((wh * eff) / (load * 2), 2)} h`, `${round(load / wh, 3)} h`],
        `Usable energy = ${wh} × ${eff} = ${round(wh * eff, 1)} Wh. Divided by ${load} W gives ${hrs} h. Ageing and battery curves cut this further in practice.`
      );
    },
  },
  {
    id: 'availability-mtbf',
    topic: 'Maintenance',
    source: 'Maintenance Drill',
    make() {
      const mtbf = pick([200, 400, 640, 900, 1200, 2000, 5000]);
      const mttr = round(between(5, 90) / 10, 1);
      const a = round((mtbf / (mtbf + mttr)) * 100, 3);
      return item(
        this.id, this.topic, this.source,
        `Equipment records MTBF of ${mtbf} h and MTTR of ${mttr} h. What inherent availability does that give?`,
        `${a}%`,
        [`${round((mttr / (mtbf + mttr)) * 100, 3)}%`, `${round((mtbf / mttr), 1)}%`, `${round(a / 2, 3)}%`],
        `Inherent availability = MTBF/(MTBF+MTTR) = ${mtbf}/${round(mtbf + mttr, 1)} = ${a}%. Putting MTTR on top gives unavailability instead.`
      );
    },
  },
  {
    id: 'frequency-period',
    topic: 'Electronics & Automation',
    source: 'Electrical Principles Drill',
    make() {
      const hz = pick([50, 60, 100, 120, 150, 200, 250, 400, 500, 800, 1000, 1200, 1500, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12500, 16000, 20000]);
      const ms = round(1000 / hz, 4);
      return item(
        this.id, this.topic, this.source,
        `A control waveform runs at ${hz} Hz. What is its period?`,
        `${ms} ms`,
        [`${round(hz / 1000, 4)} ms`, `${round(ms * 2, 4)} ms`, `${hz} ms`],
        `Period is the reciprocal of frequency: T = 1/${hz} = ${round(1 / hz, 6)} s = ${ms} ms.`,
        'Easy'
      );
    },
  },
  {
    id: 'ontime-compliance',
    topic: 'Maintenance',
    source: 'Maintenance Drill',
    make() {
      const planned = between(20, 200);
      const done = between(Math.floor(planned * 0.5), planned);
      const pct = round((done / planned) * 100, 1);
      return item(
        this.id, this.topic, this.source,
        `A maintenance schedule planned ${planned} tasks and ${done} were completed on time. What is the on-time compliance?`,
        `${pct}%`,
        [`${round((planned / done) * 100, 1)}%`, `${round(((planned - done) / planned) * 100, 1)}%`, `${done}%`],
        `Compliance = completed / planned = ${done}/${planned} = ${pct}%. The complement, ${round(((planned - done) / planned) * 100, 1)}%, is the backlog.`,
        'Easy'
      );
    },
  },
];

// Task-variety families: same physics, genuinely different question.
FAMILIES.push(...extraFamilies({ item, pick, between, round, rand, RW }));

/* ---------- generate ---------- */

const out = [];
const seen = new Set();
const perFamily = new Map();
const perStem = new Map();

/**
 * A stem may not be reused, full stop.
 *
 * Uniqueness on stem+options is not enough: a family whose variation lives
 * entirely in the options produces one stem over and over, which is what a
 * candidate actually notices. Two questions that read identically are one
 * question however different their option lists.
 */
const MAX_PER_STEM = 1;

/**
 * Each family sizes itself to the parameters it genuinely has.
 *
 * Guessing a cap gets it wrong in both directions - it pads families whose
 * space ran out and starves ones with thousands of real combinations left. So
 * instead a family is retired once it has failed MISS_LIMIT times in a row to
 * produce anything new, which is the point at which more attempts would only
 * re-enumerate what is already there.
 *
 * The global ceiling stops any single family dominating even when its space is
 * effectively unlimited: subnetting alone could fill the whole bank.
 */
const MISS_LIMIT = 300;
const CAP = Number(process.argv[3]) || Math.ceil(TARGET * 0.09);

const misses = new Map();
const retired = new Set();
let attempts = 0;

while (out.length < TARGET && retired.size < FAMILIES.length && attempts < TARGET * 400) {
  attempts++;
  const fam = FAMILIES[attempts % FAMILIES.length];
  if (retired.has(fam.id)) continue;
  if ((perFamily.get(fam.id) ?? 0) >= CAP) {
    retired.add(fam.id);
    continue;
  }

  const q = fam.make();
  const key = q ? q.stem + '||' + [...q.options].sort().join('|') : null;
  const fresh = q && !seen.has(key) && (perStem.get(q.stem) ?? 0) < MAX_PER_STEM;

  if (!fresh) {
    const m = (misses.get(fam.id) ?? 0) + 1;
    misses.set(fam.id, m);
    if (m >= MISS_LIMIT) retired.add(fam.id);
    continue;
  }

  misses.set(fam.id, 0);
  seen.add(key);
  perStem.set(q.stem, 1);
  perFamily.set(q.skill, (perFamily.get(q.skill) ?? 0) + 1);
  out.push(q);
}

/* Spread the key across A-D deterministically, so the bank has no positional
   tell of the kind that gave the paid questions away for free. */
out.forEach((q, i) => {
  const target = i % 4;
  const correct = q.options[q.answerIndex];
  const rest = q.options.filter((_, j) => j !== q.answerIndex);
  const arranged = [];
  let r = 0;
  for (let slot = 0; slot < 4; slot++) arranged.push(slot === target ? correct : rest[r++]);
  q.options = arranged;
  q.answerIndex = target;
  q.id = `D${String(i + 1).padStart(5, '0')}`;
});

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/drills.json', JSON.stringify(out, null, 1));

const pos = [0, 0, 0, 0];
for (const q of out) pos[q.answerIndex]++;

console.log(`generated ${out.length} drill questions from ${FAMILIES.length} skill families`);
console.log(`families retired after exhausting their parameters: ${retired.size}`);
console.log(`distinct stems     : ${perStem.size}  (no stem reused)`);
console.log(`answer position: ${pos.map((n, i) => 'ABCD'[i] + ' ' + Math.round((n / out.length) * 100) + '%').join('  ')}`);
console.log('\nper skill:');
for (const [k, v] of [...perFamily].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`);
}
