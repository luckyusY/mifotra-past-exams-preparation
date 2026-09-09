/**
 * A line on the study page.
 *
 * Deliberately about the work rather than about winning: someone opening this
 * at 5am before a shift does not need to be told to hustle. Each is attributed
 * honestly, and where a saying is proverbial it says so rather than inventing
 * an author.
 */
export const QUOTES: { text: string; who: string }[] = [
  { text: 'It always seems impossible until it is done.', who: 'Nelson Mandela' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', who: 'Nelson Mandela' },
  { text: 'The expert in anything was once a beginner.', who: 'Helen Hayes' },
  { text: 'Little by little, a little becomes a lot.', who: 'Tanzanian proverb' },
  { text: 'However far the stream flows, it never forgets its source.', who: 'African proverb' },
  { text: 'Knowledge is like a garden: if it is not cultivated, it cannot be harvested.', who: 'African proverb' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', who: 'Robert Collier' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', who: 'James Clear' },
  { text: 'The beautiful thing about learning is that nobody can take it away from you.', who: 'B. B. King' },
  { text: 'Practice is not the thing you do once you are good. It is the thing that makes you good.', who: 'Malcolm Gladwell' },
  { text: 'A river cuts through rock not because of its power, but its persistence.', who: 'Jim Watkins' },
  { text: 'If you want to go fast, go alone. If you want to go far, go together.', who: 'African proverb' },
  { text: 'Do not wait for the perfect moment. Take the moment and make it perfect.', who: 'Proverbial' },
  { text: 'Smooth seas never made a skilled sailor.', who: 'Proverbial' },
  { text: 'Learning never exhausts the mind.', who: 'Leonardo da Vinci' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', who: 'Chinese proverb' },
  { text: 'Fall seven times, stand up eight.', who: 'Japanese proverb' },
  { text: 'An investment in knowledge pays the best interest.', who: 'Benjamin Franklin' },
];

/** Stable for a given day, so the page does not reshuffle on every render. */
export function quoteOfDay(seed = new Date().toISOString().slice(0, 10)) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}
