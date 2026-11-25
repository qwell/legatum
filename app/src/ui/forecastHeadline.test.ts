import { describe, expect, it } from 'vitest';
import { forecastHeadline } from './ForecastCard';

const base = { win: 0, loss: 0, winLabel: 'destroy it', unitLabel: 'Spearman', defName: 'Spearman', cityName: null, youLose: 37, theyLose: 23, ranged: false };

describe('forecastHeadline: the outcome in words (user, 2026-11-25)', () => {
  it('says both units survive and who takes more damage, never a bare verdict over 0% / 0%', () => {
    const h = forecastHeadline(base);
    expect(h).toMatchObject({ kind: 'survive', tone: 'bad', title: 'Both units survive' });
    expect(h.detail).toBe('You take more damage: about 37 HP to you, 23 to the Spearman.');
    expect(forecastHeadline({ ...base, youLose: 10, theyLose: 30 })).toMatchObject({ tone: 'good', detail: 'You deal more damage: about 30 HP to the Spearman, 10 to you.' });
    expect(forecastHeadline({ ...base, youLose: 20, theyLose: 20 }).detail).toBe('An even trade: about 20 HP each.');
  });

  it('leads with the kill when it is likely, and with the loss when that is the bigger risk', () => {
    expect(forecastHeadline({ ...base, win: 100 }).title).toBe('You will destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 85 }).title).toBe('You will likely destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 50 }).title).toBe('Good chance to destroy the Spearman');
    expect(forecastHeadline({ ...base, win: 10 }).title).toBe('Small chance to destroy the Spearman');
    expect(forecastHeadline({ ...base, loss: 45, win: 10 })).toMatchObject({ kind: 'loss', tone: 'bad', title: 'Your Spearman could be destroyed' });
    expect(forecastHeadline({ ...base, loss: 90 }).title).toBe('Your Spearman will likely be destroyed');
    expect(forecastHeadline({ ...base, loss: 5 }).title).toBe('Both units will likely survive');
  });

  it('names the city when the attack is on one, and a shot that takes no damage says so', () => {
    const city = { ...base, cityName: 'Lugano', defName: 'Lugano', winLabel: 'capture the city' };
    expect(forecastHeadline({ ...city, win: 90 }).title).toBe('You will likely capture Lugano');
    expect(forecastHeadline(city).title).toBe('Lugano holds this turn');
    expect(forecastHeadline({ ...city, youLose: 50, theyLose: 20 }).detail).toBe('You take more damage: about 50 HP to you, 20 to Lugano.');
    expect(forecastHeadline({ ...base, ranged: true, youLose: 0, theyLose: 31 }).detail).toBe('You deal about 31 HP of damage and take none.');
  });
});
