'use client';

import { useState } from 'react';
import type { Question } from '@/lib/questions';
import ExamRunner from '../ExamRunner';

export default function UnlockForm() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [bankId, setBankId] = useState<number | null>(null);

  async function loadBank() {
    const res = await fetch('/api/questions');
    if (!res.ok) {
      setError('No active access on this device. Enter your code above.');
      return;
    }
    const data = await res.json();
    setBankId(data.bankId);
    setQuestions(data.questions);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not redeem that code.');
        return;
      }
      await loadBank();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (questions && bankId !== null) {
    return (
      <>
        <div className="notice good" style={{ marginBottom: '1rem' }}>
          Bank {bankId} unlocked &mdash; {questions.length} questions.
        </div>
        <ExamRunner
          questions={questions}
          title={`Question bank ${bankId}`}
          durationMinutes={180}
          mode="study"
        />
      </>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 460 }}>
      <label htmlFor="code" style={{ display: 'block', marginBottom: '.4rem', fontWeight: 600 }}>
        Access code
      </label>
      <input
        id="code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="XXXX-XXXX-XXXX"
        autoComplete="off"
        spellCheck={false}
      />
      {error && (
        <div className="notice bad" style={{ marginTop: '.7rem' }}>
          {error}
        </div>
      )}
      <div className="navrow">
        <button className="btn" disabled={busy || code.trim().length < 8}>
          {busy ? 'Checking...' : 'Unlock'}
        </button>
        <button type="button" className="btn ghost" onClick={loadBank}>
          Already unlocked here
        </button>
      </div>
    </form>
  );
}
