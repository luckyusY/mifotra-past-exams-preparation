'use client';

import { useMemo, useState } from 'react';
import {
  Search, MapPin, CalendarClock, Building2, ExternalLink, Landmark, Filter,
} from 'lucide-react';
import type { JobView } from '@/lib/jobs';

type Tag = { id: string; label: string; core: boolean };

function closesIn(deadline: string | null): { label: string; urgent: boolean } {
  if (!deadline) return { label: 'No closing date given', urgent: false };
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Closed', urgent: false };
  if (days === 0) return { label: 'Closes today', urgent: true };
  if (days === 1) return { label: 'Closes tomorrow', urgent: true };
  return { label: `Closes in ${days} days`, urgent: days <= 5 };
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

export default function JobsBoard({ jobs, tags }: { jobs: JobView[]; tags: Tag[] }) {
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [everything, setEverything] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (!everything && !j.relevant) return false;
      if (tag && !j.tags.includes(tag)) return false;
      if (!q) return true;
      return `${j.title} ${j.employer ?? ''} ${j.location ?? ''} ${j.sector ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, tag, query, everything]);

  const counts = useMemo(() => {
    const base = everything ? jobs : jobs.filter((j) => j.relevant);
    const map: Record<string, number> = {};
    for (const j of base) for (const t of j.tags) map[t] = (map[t] ?? 0) + 1;
    return { total: base.length, map };
  }, [jobs, everything]);

  return (
    <>
      <div className="jobs-controls">
        <div className="jobs-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            placeholder="Search title, employer or town"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search jobs"
          />
        </div>

        <div className="chiprow" role="group" aria-label="Filter by field">
          <button
            className={'chip' + (tag === null ? ' is-on' : '')}
            onClick={() => setTag(null)}
          >
            All fields <span className="chip-n">{counts.total}</span>
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              className={'chip' + (tag === t.id ? ' is-on' : '')}
              onClick={() => setTag(tag === t.id ? null : t.id)}
              disabled={!counts.map[t.id]}
            >
              {t.label} <span className="chip-n">{counts.map[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <label className="jobs-toggle">
          <input
            type="checkbox"
            checked={everything}
            onChange={(e) => setEverything(e.target.checked)}
          />
          <Filter size={14} />
          Show everything indexed, not only matches
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="notice">
          Nothing matches that. {!everything && 'Try ticking “show everything indexed”.'}
        </div>
      ) : (
        <ul className="joblist">
          {shown.map((j) => {
            const closing = closesIn(j.deadline);
            return (
              <li key={j.key} className="card jobcard">
                <div className="jobcard-head">
                  <h2>
                    <a href={j.url} target="_blank" rel="noopener noreferrer nofollow">
                      {j.title}
                      <ExternalLink size={14} />
                    </a>
                  </h2>
                  <span className={'jobclose' + (closing.urgent ? ' is-urgent' : '')}>
                    <CalendarClock size={14} />
                    {closing.label}
                  </span>
                </div>

                <div className="jobmeta">
                  {j.employer && (
                    <span>
                      <Building2 size={14} /> {j.employer}
                    </span>
                  )}
                  {j.location && (
                    <span>
                      <MapPin size={14} /> {j.location}
                    </span>
                  )}
                  {j.publicSector && (
                    <span className="jobtag is-gov" title="Employer name suggests a government body or state-owned company">
                      <Landmark size={14} /> Public sector
                    </span>
                  )}
                  {j.tags.map((t) => (
                    <span key={t} className="jobtag">
                      {tags.find((x) => x.id === t)?.label ?? t}
                    </span>
                  ))}
                </div>

                {(j.sector || j.education || j.experience || j.contract) && (
                  <dl className="jobfacts">
                    {j.sector && (
                      <>
                        <dt>Sector</dt>
                        <dd>{j.sector}</dd>
                      </>
                    )}
                    {j.education && (
                      <>
                        <dt>Education</dt>
                        <dd>{j.education}</dd>
                      </>
                    )}
                    {(j.experience || j.level) && (
                      <>
                        <dt>Experience</dt>
                        <dd>{j.experience ?? j.level}</dd>
                      </>
                    )}
                    {j.contract && (
                      <>
                        <dt>Contract</dt>
                        <dd>
                          {j.contract}
                          {j.positions && j.positions > 1 ? ` · ${j.positions} positions` : ''}
                        </dd>
                      </>
                    )}
                  </dl>
                )}

                <div className="jobfoot">
                  <a
                    className="btn"
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Read the advert and apply
                  </a>
                  <span className="muted">
                    Posted {fmt(j.publishedAt)} on {j.sourceName}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
