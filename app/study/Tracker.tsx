'use client';

import { Award, Lock } from 'lucide-react';
import { calendar, type Progress } from '@/lib/progress';
import { badgesFor, levelOf } from '@/lib/gamify';

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

/** Four bands is enough to read at a glance; more just becomes noise. */
function band(count: number, goal: number): number {
  if (count === 0) return 0;
  if (count >= goal) return 3;
  if (count >= goal / 2) return 2;
  return 1;
}

export default function Tracker({ progress, bankIds }: { progress: Progress; bankIds: string[] }) {
  const level = levelOf(progress);
  const badges = badgesFor(progress, bankIds);
  const days = calendar(progress, 14);
  const earned = badges.filter((b) => b.earned);

  // Columns are whole weeks, so the grid reads the way a calendar does.
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthLabel = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short' });

  return (
    <>
      <div className="card level-card">
        <div className="level-top">
          <span className="level-badge">{level.level}</span>
          <div>
            <strong>{level.name}</strong>
            <div className="muted" style={{ fontSize: '.86rem' }}>
              {level.xp.toLocaleString()} XP
              {level.needed > 0 && ` · ${(level.needed - level.into).toLocaleString()} to next level`}
            </div>
          </div>
          <span className="muted level-pct">{level.pct}%</span>
        </div>
        <div className="goalbar">
          <i style={{ width: `${level.pct}%` }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="block-head" style={{ marginBottom: '.6rem' }}>
          <strong>Daily tracker</strong>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.84rem' }}>
            last 14 weeks
          </span>
        </div>

        <div className="tracker">
          <div className="tracker-days">
            {DAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="tracker-grid">
            {weeks.map((week, wi) => (
              <div className="tracker-week" key={wi}>
                {week.map((d) => (
                  <span
                    key={d.date}
                    className={`cell b${band(d.count, progress.dailyGoal)}`}
                    title={
                      d.count
                        ? `${d.date}: ${d.count} answered, ${d.correct} correct`
                        : `${d.date}: nothing`
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="tracker-legend muted">
          <span>{monthLabel(days[0].date)}</span>
          <span style={{ marginLeft: 'auto' }}>Less</span>
          <span className="cell b0" />
          <span className="cell b1" />
          <span className="cell b2" />
          <span className="cell b3" />
          <span>More</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="block-head" style={{ marginBottom: '.8rem' }}>
          <strong>Badges</strong>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.84rem' }}>
            {earned.length} of {badges.length}
          </span>
        </div>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.id} className={'badge' + (b.earned ? ' is-earned' : '')}>
              {b.earned ? <Award size={16} /> : <Lock size={14} />}
              <div>
                <strong>{b.name}</strong>
                <div className="muted badge-hint">{b.hint}</div>
                {!b.earned && b.progress !== undefined && b.progress > 0 && (
                  <div className="setbar" style={{ marginTop: '.3rem' }}>
                    <i style={{ width: `${Math.round(b.progress * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
