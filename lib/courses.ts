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
    match: (q) => q.examNumber !== null && q.examSource.includes('Centralized ICT'),
    examLength: 50,
    durationMinutes: 120,
    featured: true,
  },
  {
    slug: 'deputy-headteacher-dos',
    name: 'MIFOTRA Deputy Headteacher in Charge of Studies',
    short: 'Deputy Headteacher (DOS)',
    blurb: 'The real past paper for school leadership posts.',
    intro:
      'The complete Deputy Headteacher in Charge of Studies past paper: 50 questions, 100 marks, two and a half hours, covering school leadership, assessment, supervision, curriculum, teacher development and Rwandan education policy. Seven questions turn on published policy targets the source paper did not key; those are shown with the reasoning left open rather than answered by guesswork.',
    keywords: [
      'MIFOTRA head teacher exam',
      'deputy headteacher in charge of studies exam',
      'DOS DOD MIFOTRA past paper',
      'Rwanda school leadership exam',
      'ibizamini bya MIFOTRA abarezi',
    ],
    match: (q) => q.examSource.includes('Deputy Headteacher'),
    examLength: 50,
    durationMinutes: 150,
    featured: true,
  },
  {
    slug: 'comptia-security-plus',
    name: 'MIFOTRA Security and Cybersecurity',
    short: 'Security',
    blurb: 'Threats, cryptography, access control and incident response.',
    intro:
      'MIFOTRA cybersecurity preparation, written against the published CompTIA Security+ SY0-701 objectives: threat types, cryptographic controls, identity and access management, secure network design, and incident response. Each answer explains why the distractors fail, not only why the key is right.',
    keywords: ['MIFOTRA cybersecurity questions', 'MIFOTRA security exam Rwanda', 'CompTIA Security+ SY0-701 practice'],
    match: (q) => src(q, 'Security+') || topic(q, 'Cybersecurity'),
    examLength: 60,
    durationMinutes: 90,
    featured: true,
  },
  {
    slug: 'comptia-network-plus',
    name: 'MIFOTRA Networking',
    short: 'Networking',
    blurb: 'OSI layers, addressing, routing, wireless and troubleshooting.',
    intro:
      'MIFOTRA networking preparation, written to the CompTIA Network+ N10-009 objectives: the OSI model in practice, IPv4 and IPv6 addressing, routing and switching behaviour, wireless standards, and a structured troubleshooting method. Scenario-led rather than definition-led.',
    keywords: ['MIFOTRA networking questions', 'MIFOTRA network exam Rwanda', 'CompTIA Network+ N10-009 practice'],
    match: (q) => src(q, 'Network+') || topic(q, 'Networking'),
    examLength: 60,
    durationMinutes: 90,
    featured: true,
  },
  {
    slug: 'cisco-ccna',
    name: 'MIFOTRA Routing and Switching',
    short: 'Routing & Switching',
    blurb: 'Routing, switching, VLANs, OSPF and network access.',
    intro:
      'MIFOTRA routing and switching preparation, written against the Cisco CCNA 200-301 blueprint: network fundamentals, switching and VLANs, OSPF and static routing, IP services, security fundamentals, and automation basics. Questions are configuration- and symptom-driven, the way the exam asks them.',
    keywords: ['MIFOTRA routing and switching questions', 'MIFOTRA CCNA Rwanda', 'Cisco CCNA 200-301 practice'],
    match: (q) => src(q, 'CCNA') || topic(q, 'Cisco CCNA'),
    examLength: 60,
    durationMinutes: 90,
    featured: true,
  },
  {
    slug: 'comptia-a-plus',
    name: 'MIFOTRA Hardware and Operating Systems',
    short: 'Hardware & OS',
    blurb: 'Hardware, operating systems, mobile devices and support practice.',
    intro:
      'MIFOTRA hardware and support preparation, covering both CompTIA A+ cores: hardware and mobile devices, operating systems and software troubleshooting, plus the operational-procedure material that support roles are actually assessed on.',
    keywords: ['MIFOTRA hardware questions', 'MIFOTRA IT support exam Rwanda', 'CompTIA A+ practice'],
    match: (q) => src(q, 'A+') || topic(q, 'Hardware & Operating Systems', 'Hardware', 'Operating Systems'),
    examLength: 60,
    durationMinutes: 90,
  },
  {
    slug: 'fiber-optics-and-cabling',
    name: 'MIFOTRA Fibre Optics and Cabling',
    short: 'Fibre & Cabling',
    blurb: 'Fibre theory, splicing, testing and cabling standards.',
    intro:
      'MIFOTRA fibre and structured-cabling preparation, aligned to TIA-568 and ITU-T G.652: single-mode versus multi-mode behaviour, attenuation and dispersion, splicing and connectorisation, OTDR interpretation, and installation standards.',
    keywords: ['MIFOTRA fibre optics questions', 'MIFOTRA cabling exam Rwanda', 'OTDR practice questions'],
    match: (q) => topic(q, 'Fiber Optics') || src(q, 'TIA-568', 'ITU-T', 'BICSI'),
    examLength: 50,
    durationMinutes: 75,
  },
  {
    slug: 'electrical-and-electronics',
    name: 'MIFOTRA Electrical and Electronics',
    short: 'Electrical',
    blurb: 'Circuit theory, safety, semiconductors and automation.',
    intro:
      'MIFOTRA electrical and electronics preparation, covering circuit analysis, AC and DC behaviour, protection and earthing to NFPA 70 and IEC 60364, semiconductors, and industrial automation basics.',
    keywords: ['MIFOTRA electrical questions', 'MIFOTRA TVET electrical exam Rwanda', 'circuit theory practice'],
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
