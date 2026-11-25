import { describe, expect, it } from 'vitest';
import { forecastHeadline } from './ForecastCard';

const base = { win: 0, loss: 0, winLabel: 'destroy it', unitLabel: 'Spearman', defName: 'Spearman', cityName: null, youLose: 37, theyLose: 23, ranged: false };

describe('forecastHeadline: the outcome in words (user, 2026-11-25)', () => {
  it('says both units survive and who takes more damage, never a bare verdict over 0% / 0%', () => {
    const h = forecastHeadline(base);
    expect(h).toMatchObject({ kind: 'survive', tone: 'even', tradeTone: 'bad', title: 'Both units survive' });
    expect(h.detail).toBe('You take more damage: you lose about 37 health, the Spearman about 23.');
    expect(forecastHeadline({ ...base, youLose: 10, theyLose: 30 })).toMatchObject({ tradeTone: 'good', detail: 'You deal more damage: the Spearman loses about 30 health, you about 10.' });
    expect(forecastHeadline({ ...base, youLose: 20, theyLose: 20 }).detail).toBe('An even trade: you each lose about 20 health.');
  });

  it('leads with the kill when it is likely, and with the loss when that is the bigger risk', () => {
    expect(forecastHeadline({ ...base, win: 100 }).title).toBe('You will destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 65 }).title).toBe('You will likely destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 36 }).title).toBe('Some chance to destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 50 }).title).toBe('Good chance to destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 10 }).title).toBe('Small chance to destroy the Spearman');
    expect(forecastHeadline({ ...base, loss: 45, win: 10 })).toMatchObject({ kind: 'loss', tone: 'bad', title: 'Your Spearman could be destroyed' });
    expect(forecastHeadline({ ...base, loss: 75 }).title).toBe('Your Spearman will likely be destroyed');
    expect(forecastHeadline({ ...base, loss: 100, youLose: 99, theyLose: 6 })).toMatchObject({ title: 'Your Spearman will be destroyed', detail: 'The Spearman loses only about 6 health.' });
    expect(forecastHeadline({ ...base, loss: 5 }).title).toBe('Both units will likely survive');
  });

  it('names the city when the attack is on one, and a shot that takes no damage says so', () => {
    const city = { ...base, cityName: 'Lugano', defName: 'Lugano', winLabel: 'capture the city' };
    expect(forecastHeadline({ ...city, win: 90 }).title).toBe('You will likely capture Lugano');
    expect(forecastHeadline(city).title).toBe('Lugano holds this turn');
    expect(forecastHeadline({ ...city, youLose: 50, theyLose: 20 }).detail).toBe('You take more damage: you lose about 50 health, Lugano about 20.');
    expect(forecastHeadline({ ...base, ranged: true, youLose: 0, theyLose: 31 }).detail).toBe('You deal more damage: the Spearman loses about 31 health, you none.');
  });
});
