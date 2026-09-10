import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { openJobs, toView, JOB_TAGS, JOB_SOURCE, type Job } from '@/lib/jobs';
import JobsBoard from './JobsBoard';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Jobs in Rwanda for ICT, electrical and teaching candidates',
  description:
    'Open vacancies in Rwanda matched to what this site prepares you for: ICT and networking, electrical and electronics, telecom and teaching posts. Updated every morning, with a link to apply at the source.',
  alternates: { canonical: '/jobs' },
};

export default async function JobsPage() {
  let jobs: Job[] = [];
  let failed = false;
  try {
    jobs = await openJobs({ limit: 200 });
  } catch (err) {
    // The board is a convenience, not the product. A database wobble should
    // leave a page that still explains itself and still links to the sources -
    // but it must say so in the log rather than looking like an empty result.
    console.error('[jobs] could not read the board', err);
    failed = true;
  }

  const relevant = jobs.filter((j) => j.relevant).length;
  const updated = jobs.reduce<Date | null>((latest, j) => {
    const seen = j.lastSeen ? new Date(j.lastSeen) : null;
    return seen && (!latest || seen > latest) ? seen : latest;
  }, null);

  return (
    <>
      <h1>Jobs worth applying for</h1>
      <p className="lead">
        Studying is the means; the job is the point. Every morning a script reads the public
        vacancy listings and keeps the ones an ICT, electrical, telecom or teaching candidate
        could actually apply for &mdash; {relevant.toLocaleString()} open right now.
      </p>

      <div className="jobs-note">
        <RefreshCw size={15} />
        <span>
          {updated
            ? `Last checked ${updated.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Africa/Kigali',
              })} Kigali time.`
            : 'The first run has not happened yet.'}{' '}
          Adverts are indexed, never copied &mdash; the title, employer and dates are listed
          here and the advert itself stays on{' '}
          <a href={JOB_SOURCE.base} target="_blank" rel="noopener noreferrer nofollow">
            {JOB_SOURCE.name}
          </a>
          , where you also apply.
        </span>
      </div>

      {failed ? (
        <div className="notice bad">
          The job list could not be loaded just now. The sources below still work.
        </div>
      ) : jobs.length === 0 ? (
        <div className="notice">
          No vacancies stored yet. The daily run fills this in at 07:00 Kigali time.
        </div>
      ) : (
        <JobsBoard jobs={jobs.map(toView)} tags={JOB_TAGS} />
      )}

      <section className="card jobs-elsewhere">
        <h2 style={{ marginTop: 0 }}>Where else to look</h2>
        <p className="muted">
          Two sources worth checking yourself, for different reasons.
        </p>
        <ul>
          <li>
            <a
              href="https://recruitment.mifotra.gov.rw"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              MIFOTRA recruitment portal <ExternalLink size={13} />
            </a>{' '}
            &mdash; where public-service posts are actually advertised and applied for. It is
            a JavaScript application with no public feed, so it cannot be indexed here without
            guessing at its contents; check it directly, and register early because the account
            step takes longer than people expect.
          </li>
          <li>
            <a
              href="https://www.mifotra.gov.rw"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              mifotra.gov.rw <ExternalLink size={13} />
            </a>{' '}
            &mdash; announcements, exam calendars and the rules that govern how recruitment
            examinations are run.
          </li>
        </ul>
        <p className="muted" style={{ marginBottom: 0 }}>
          Preparing for one of these? Start with the{' '}
          <Link href="/courses">course closest to the post</Link> and work the{' '}
          <Link href="/study">study plan</Link>.
        </p>
      </section>
    </>
  );
}
