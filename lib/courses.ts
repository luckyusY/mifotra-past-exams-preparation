import { freeQuestions, type Question } from '@/lib/questions';

/**
 * Courses are curated views over the one corpus, not separate question banks.
 * A question can appear in more than one course - a subnetting item belongs in
 * both Network+ and CCNA - so courses are defined by predicates rather than by
 * duplicating rows.
 *
 * Each course is a landing page, a hub, and its own timed exam, which is also
 * what makes them worth having for search: a page per exam candidates actually
 * type into Google.
 */

export type Course = {
  slug: string;
  name: string;
  /** Short label for cards and badges. */
  short: string;
  /** One line for the card. */
  blurb: string;
  /** Longer copy for the landing page. */
  intro: string;
  /** What a candidate searching for this would type. */
  keywords: string[];
  /** Questions in scope. */
  match: (q: Question) => boolean;
  /** Length and time of the practice exam. */
  examLength: number;
  durationMinutes: number;
  /** Ordered first on the index. */
  featured?: boolean;
};

const src = (q: Question, ...needles: string[]) =>
  needles.some((n) => q.examSource.toLowerCase().includes(n.toLowerCase()));

const topic = (q: Question, ...names: string[]) =>
  names.some((n) => q.topic.toLowerCase() === n.toLowerCase());

export const COURSES: Course[] = [
  {
    slug: 'mifotra-ict-officer',
    name: 'MIFOTRA Centralized ICT Acquisition Officer',
    short: 'MIFOTRA ICT Officer',
    blurb: 'The real past paper, bilingual, with every answer verified.',
    intro:
      'The complete Centralized ICT Acquisition Officer past paper as it was sat: 50 questions, two hours, marks weighted 1 to 4, every question in both English and French. Answers were re-checked item by item, and seventeen differ from the choices marked in the original session.',
    keywords: [
      'MIFOTRA past papers',
      'MIFOTRA ICT officer exam',
      'ibizamini bya MIFOTRA',
      'Rwanda public service ICT exam',
    ],
    match: (q) => q.examNumber !== null,
    examLength: 50,
    durationMinutes: 120,
    featured: true,
  },
  {
    slug: 'comptia-security-plus',
    name: 'CompTIA Security+ (SY0-701)',
    short: 'Security+',
    blurb: 'Threats, cryptography, access control and incident response.',
    intro:
      'Practice written against the published Security+ SY0-701 objectives: threat types, cryptographic controls, identity and access management, secure network design, and incident response. Each answer explains why the distractors fail, not only why the key is right.',
    keywords: ['CompTIA Security+ practice questions', 'SY0-701 practice test', 'security+ exam Rwanda'],
    match: (q) => src(q, 'Security+') || topic(q, 'Cybersecurity'),
    examLength: 60,
    durationMinutes: 90,
    featured: true,
  },
  {
    slug: 'comptia-network-plus',
    name: 'CompTIA Network+ (N10-009)',
    short: 'Network+',
    blurb: 'OSI layers, addressing, routing, wireless and troubleshooting.',
    intro:
      'Written to the Network+ N10-009 objectives: the OSI model in practice, IPv4 and IPv6 addressing, routing and switching behaviour, wireless standards, and a structured troubleshooting method. Scenario-led rather than definition-led.',
    keywords: ['CompTIA Network+ practice questions', 'N10-009 practice test', 'networking exam Rwanda'],
    match: (q) => src(q, 'Network+') || topic(q, 'Networking'),
    examLength: 60,
    durationMinutes: 90,
    featured: true,
  },
  {
    slug: 'cisco-ccna',
    name: 'Cisco CCNA (200-301)',
    short: 'CCNA',
    blurb: 'Routing, switching, VLANs, OSPF and network access.',
    intro:
      'Practice against the CCNA 200-301 blueprint: network fundamentals, switching and VLANs, OSPF and static routing, IP services, security fundamentals, and automation basics. Questions are configuration- and symptom-driven, the way the exam asks them.',
    keywords: ['CCNA practice questions', 'Cisco 200-301 practice test', 'CCNA Rwanda'],
    match: (q) => src(q, 'CCNA') || topic(q, 'Cisco CCNA'),
    examLength: 60,
    durationMinutes: 90,
    featured: true,
  },
  {
    slug: 'comptia-a-plus',
    name: 'CompTIA A+ (220-1101 / 220-1102)',
    short: 'A+',
    blurb: 'Hardware, operating systems, mobile devices and support practice.',
    intro:
      'Both A+ cores: hardware and mobile devices, operating systems and software troubleshooting, plus the operational-procedure material that support roles are actually assessed on.',
    keywords: ['CompTIA A+ practice questions', '220-1101 practice test', 'IT support exam Rwanda'],
    match: (q) => src(q, 'A+') || topic(q, 'Hardware & Operating Systems', 'Hardware', 'Operating Systems'),
    examLength: 60,
    durationMinutes: 90,
  },
  {
    slug: 'fiber-optics-and-cabling',
    name: 'Fibre Optics and Structured Cabling',
    short: 'Fibre & Cabling',
    blurb: 'Fibre theory, splicing, testing and cabling standards.',
    intro:
      'Fibre and structured-cabling practice aligned to TIA-568 and ITU-T G.652: single-mode versus multi-mode behaviour, attenuation and dispersion, splicing and connectorisation, OTDR interpretation, and installation standards.',
    keywords: ['fiber optics exam questions', 'structured cabling test', 'OTDR practice questions'],
    match: (q) => topic(q, 'Fiber Optics') || src(q, 'TIA-568', 'ITU-T', 'BICSI'),
    examLength: 50,
    durationMinutes: 75,
  },
  {
    slug: 'electrical-and-electronics',
    name: 'Electrical Circuits and Electronics',
    short: 'Electrical',
    blurb: 'Circuit theory, safety, semiconductors and automation.',
    intro:
      'Electrical and electronics practice covering circuit analysis, AC and DC behaviour, protection and earthing to NFPA 70 and IEC 60364, semiconductors, and industrial automation basics.',
    keywords: ['electrical exam questions Rwanda', 'circuit theory practice test', 'TVET electrical exam'],
    match: (q) =>
      topic(q, 'Electrical Circuits', 'Electronics & Automation', 'Maintenance') ||
      src(q, 'NFPA', 'IEC 60364'),
    examLength: 50,
    durationMinutes: 75,
  },
];

export const courseBySlug = (slug: string) => COURSES.find((c) => c.slug === slug);

/** Free questions in a course - what the public pages can show. */
export function freeQuestionsFor(course: Course): Question[] {
  return freeQuestions.filter(course.match);
}

/**
 * Which courses a question belongs to. Used for the breadcrumb and the
 * cross-links on a question page, so every deep page points back up into at
 * least one hub.
 */
export function coursesForQuestion(q: Question): Course[] {
  return COURSES.filter((c) => c.match(q));
}
