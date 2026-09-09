/**
 * Task-variety families.
 *
 * The numeric families ask one thing: substitute into the formula. Five hundred
 * of those is one question with five hundred sets of numbers, which is the
 * complaint these exist to answer. Each family here asks the same physics a
 * genuinely different way - compare four cases, judge against a threshold,
 * reason about what changes, diagnose from a symptom - so the concept is
 * rehearsed from several angles rather than drilled through one hole.
 */

export function extraFamilies({ item, pick, between, round, rand, RW }) {
  return [
    {
      id: 'compare-current',
      topic: 'Electrical Circuits',
      source: 'Electrical Principles Drill',
      make() {
        // The comparison itself has to live in the stem. An earlier version put
        // every varying detail in the options, so 130 questions shared six
        // stems and read as the same question over and over.
        const metric = pick([
          ['draws the largest current', (o) => o.V / o.R, 'max', 'Current is V/R, so compare the ratios rather than the voltages.'],
          ['draws the smallest current', (o) => o.V / o.R, 'min', 'Current is V/R. The lowest voltage does not automatically give the lowest current.'],
          ['dissipates the most power', (o) => (o.V * o.V) / o.R, 'max', 'Power is V²/R, so voltage counts twice over and dominates the comparison.'],
          ['dissipates the least power', (o) => (o.V * o.V) / o.R, 'min', 'Power is V²/R. A high resistance lowers power for a given voltage.'],
        ]);
        const opts = [];
        for (let i = 0; i < 4; i++) {
          opts.push({ V: pick([12, 24, 48, 110, 230, 400]), R: between(4, 120) });
        }
        const label = (o) => `${o.V} V across ${o.R} Ω`;
        const vals = opts.map(metric[1]);
        if (new Set(opts.map(label)).size < 4) return null;
        if (new Set(vals.map((v) => round(v, 3))).size < 4) return null;
        const best = metric[2] === 'max'
          ? opts[vals.indexOf(Math.max(...vals))]
          : opts[vals.indexOf(Math.min(...vals))];
        const shown = opts.map(label).join(', ');
        return item(
          this.id, this.topic, this.source,
          `In ${pick(RW)} four loads are measured: ${shown}. Which ${metric[0]}?`,
          label(best),
          opts.filter((o) => o !== best).map(label),
          `${metric[3]} Working through: ${opts
            .map((o) => `${label(o)} = ${round(metric[1](o), 2)}`)
            .join(', ')}.`,
          'Medium'
        );
      },
    },
    {
      id: 'breaker-threshold',
      topic: 'Electrical Circuits',
      source: 'Electrical Principles Drill',
      make() {
        const V = pick([230, 240]);
        const kw = pick([1.2, 1.5, 2, 2.2, 2.5, 3, 3.5, 4]);
        const I = (kw * 1000) / V;
        const breaker = pick([6, 10, 13, 16, 20, 25, 32]);
        const trips = I > breaker;
        return item(
          this.id, this.topic, this.source,
          `A ${kw} kW heater runs from a ${V} V supply on a circuit protected by a ${breaker} A breaker. Will that circuit carry it?`,
          trips
            ? `No - it draws ${round(I, 1)} A, above the ${breaker} A rating`
            : `Yes - it draws ${round(I, 1)} A, within the ${breaker} A rating`,
          [
            trips
              ? `Yes - ${round(I, 1)} A is within the ${breaker} A rating`
              : `No - ${round(I, 1)} A exceeds the ${breaker} A rating`,
            'Only if the cable is undersized',
            'It cannot be judged without the power factor',
          ],
          `I = P/V = ${kw * 1000}/${V} = ${round(I, 1)} A against a ${breaker} A device, so it ${
            trips ? 'exceeds the rating and trips' : 'sits within the rating'
          }. A resistive heater has unity power factor, so no correction applies.`,
          'Hard'
        );
      },
    },
    {
      id: 'effect-of-change',
      topic: 'Electrical Circuits',
      source: 'Electrical Principles Drill',
      make() {
        const c = pick([
          ['the supply voltage is doubled with the resistance unchanged', 'the power dissipated', 'quadruples', ['doubles', 'halves', 'stays the same'], 'P = V²/R, so doubling V multiplies power by four. The square is the step people skip.'],
          ['the resistance is doubled with the voltage unchanged', 'the current', 'halves', ['doubles', 'quadruples', 'stays the same'], 'I = V/R, so doubling R halves the current.'],
          ['the current through a fixed resistor is doubled', 'the power dissipated', 'quadruples', ['doubles', 'halves', 'stays the same'], 'P = I²R, so doubling I multiplies power by four.'],
          ['a second identical resistor is added in series', 'the total resistance', 'doubles', ['halves', 'stays the same', 'quadruples'], 'Series resistances add, so two identical resistors give twice the resistance.'],
          ['a second identical resistor is added in parallel', 'the total resistance', 'halves', ['doubles', 'stays the same', 'quadruples'], 'Two identical resistors in parallel give half the resistance of one.'],
          ['the frequency of a supply is doubled', 'the period', 'halves', ['doubles', 'quadruples', 'stays the same'], 'Period is the reciprocal of frequency, so doubling one halves the other.'],
          ['the length of a conductor is doubled with the same cross-section', 'its resistance', 'doubles', ['halves', 'stays the same', 'quadruples'], 'Resistance is proportional to length, so twice the length is twice the resistance.'],
          ['the cross-sectional area of a conductor is doubled', 'its resistance', 'halves', ['doubles', 'stays the same', 'quadruples'], 'Resistance is inversely proportional to area, so twice the area is half the resistance.'],
        ]);
        return item(
          this.id, this.topic, this.source,
          `If ${c[0]}, what happens to ${c[1]}?`,
          `It ${c[2]}`,
          c[3].map((w) => `It ${w}`),
          c[4],
          'Medium'
        );
      },
    },
    {
      id: 'fault-diagnosis',
      topic: 'Maintenance',
      source: 'Maintenance Drill',
      make() {
        const c = pick([
          ['a lamp in a series circuit is unlit and a voltmeter across it reads the full supply voltage', 'The lamp filament is open circuit', ['The lamp is short circuited', 'The supply has failed', 'The circuit is working correctly'], 'An open component drops the whole supply, because no current flows and nothing else in the loop drops anything.'],
          ['a lamp in a series circuit is unlit and a voltmeter across it reads 0 V', 'The lamp is short circuited or bypassed', ['The lamp filament is open circuit', 'The supply voltage is too high', 'The protective device has operated'], 'A short drops no voltage. An open circuit would show the full supply across the break instead.'],
          ['a protective device opens instantly every time it is reset', 'There is a persistent short circuit downstream', ['The load is slightly oversized', 'The supply frequency is wrong', 'The device rating is too high'], 'An instant trip on every reset points to a hard fault. An overload takes time to operate.'],
          ['an earth-leakage device trips only when one particular appliance is connected', 'That appliance has an insulation fault to earth', ['The device rating is too low for the circuit', 'The neutral is disconnected', 'The supply voltage is unstable'], 'Leakage tied to one appliance points at that appliance, and the device is doing exactly its job.'],
          ['a three-phase motor runs hot and noisy with reduced torque', 'A phase has been lost, so it is single phasing', ['The rotation direction is reversed', 'The supply frequency is too high', 'The motor is oversized for the load'], 'Single phasing overloads the remaining windings, producing heat, noise and lost torque.'],
          ['a circuit works until load is applied, then the voltage at the load collapses', 'There is a high-resistance joint in the supply', ['The load is faulty', 'The supply frequency has drifted', 'The earth conductor is disconnected'], 'A high-resistance joint drops little at no load but a lot once current flows, which is why it only shows under load.'],
        ]);
        return item(
          this.id, this.topic, this.source,
          `While fault-finding in ${pick(RW)}, ${c[0]}. What does that indicate?`,
          c[1], c[2], c[3], 'Hard'
        );
      },
    },
    {
      id: 'subnet-choose-mask',
      topic: 'Networking',
      source: 'Networking Drill',
      make() {
        const need = pick([2, 6, 12, 20, 28, 50, 100, 200, 400, 800, 1500]);
        let cidr = 30;
        while (Math.pow(2, 32 - cidr) - 2 < need && cidr > 8) cidr--;
        const fits = Math.pow(2, 32 - cidr) - 2;
        return item(
          this.id, this.topic, this.source,
          `A site in ${pick(RW)} needs ${need} usable addresses. What is the smallest subnet that fits without waste?`,
          `/${cidr}`,
          [`/${cidr + 1}`, `/${cidr - 1}`, `/${Math.min(30, cidr + 2)}`],
          `A /${cidr} gives ${fits.toLocaleString()} usable addresses, the smallest that covers ${need}. A /${cidr + 1} would give only ${(Math.pow(2, 31 - cidr) - 2).toLocaleString()}.`,
          'Hard'
        );
      },
    },
    {
      id: 'same-subnet',
      topic: 'Networking',
      source: 'Networking Drill',
      make() {
        const cidr = pick([24, 25, 26, 27, 28]);
        const block = Math.pow(2, 32 - cidr);
        const a = between(1, 200);
        const b = rand() < 0.5 ? Math.min(254, a + 1) : Math.min(254, a + block);
        if (a === b) return null;
        const together = Math.floor(a / block) === Math.floor(b / block);
        return item(
          this.id, this.topic, this.source,
          `Two hosts are addressed 192.168.5.${a}/${cidr} and 192.168.5.${b}/${cidr}. Can they reach each other without a router?`,
          together ? 'Yes - they are in the same subnet' : 'No - they are in different subnets and need a router',
          [
            together
              ? 'No - they are in different subnets and need a router'
              : 'Yes - they are in the same subnet',
            'Only if they share a default gateway',
            'Only if a VLAN is configured on the switch',
          ],
          `With a /${cidr} the block size is ${block}. ${a} sits in the block starting ${
            Math.floor(a / block) * block
          } and ${b} in the block starting ${Math.floor(b / block) * block}, so they are ${
            together ? 'in the same subnet and talk directly' : 'in different subnets and need routing'
          }.`,
          'Hard'
        );
      },
    },
    {
      id: 'port-decision',
      topic: 'Cybersecurity',
      source: 'Ports and Protocols Drill',
      make() {
        const c = pick([
          ['remote administration of a Linux server across the internet', 'SSH on 22', ['Telnet on 23', 'FTP on 21', 'HTTP on 80'], 'Telnet and FTP send credentials in clear text. SSH encrypts the whole session.'],
          ['transferring files to a server with the contents protected in transit', 'SFTP over SSH on 22', ['FTP on 21', 'TFTP on 69', 'HTTP on 80'], 'Plain FTP and TFTP offer no encryption; TFTP has no authentication at all.'],
          ['a browser reaching a site where a password will be typed', 'HTTPS on 443', ['HTTP on 80', 'FTP on 21', 'Telnet on 23'], 'Only HTTPS encrypts the exchange, so anything else exposes the password on the wire.'],
          ['collecting log messages centrally from network devices', 'Syslog on 514', ['SNMP trap on 162', 'NTP on 123', 'RDP on 3389'], 'Syslog is the protocol for log messages; SNMP traps carry device events, which is a related but different job.'],
          ['keeping clocks aligned across servers so log timestamps correlate', 'NTP on 123', ['Syslog on 514', 'DNS on 53', 'DHCP on 67'], 'NTP synchronises time. Without it, correlating events across machines becomes guesswork.'],
        ]);
        return item(
          this.id, this.topic, this.source,
          `Which protocol and port should be used for ${c[0]}?`,
          c[1], c[2], c[3], 'Medium'
        );
      },
    },
  ];
}
