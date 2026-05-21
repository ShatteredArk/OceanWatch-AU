import { describe, it, expect } from 'vitest';
import {
  assignConfidenceTier,
  isFresh,
  isExperimental,
  CONFIDENCE_THRESHOLDS,
} from '../detections';

describe('assignConfidenceTier', () => {
  it('returns anomaly for heuristic-v0 regardless of confidence', () => {
    expect(assignConfidenceTier(0.99, 'heuristic-v0')).toBe('anomaly');
    expect(assignConfidenceTier(0.5, 'heuristic-v0')).toBe('anomaly');
    expect(assignConfidenceTier(0, 'heuristic-v0')).toBe('anomaly');
  });

  it('returns verified at or above the verified threshold', () => {
    expect(assignConfidenceTier(CONFIDENCE_THRESHOLDS.verified, 'cdse-derived')).toBe('verified');
    expect(assignConfidenceTier(1.0, 'cdse-derived')).toBe('verified');
    expect(assignConfidenceTier(0.9, 'cmems-derived')).toBe('verified');
  });

  it('returns probable in the probable range', () => {
    expect(assignConfidenceTier(CONFIDENCE_THRESHOLDS.probable, 'cdse-derived')).toBe('probable');
    expect(assignConfidenceTier(0.7, 'cdse-derived')).toBe('probable');
    expect(assignConfidenceTier(CONFIDENCE_THRESHOLDS.verified - 0.01, 'cdse-derived')).toBe(
      'probable'
    );
  });

  it('returns possible in the possible range', () => {
    expect(assignConfidenceTier(CONFIDENCE_THRESHOLDS.possible, 'cdse-derived')).toBe('possible');
    expect(assignConfidenceTier(0.45, 'cdse-derived')).toBe('possible');
    expect(assignConfidenceTier(CONFIDENCE_THRESHOLDS.probable - 0.01, 'cdse-derived')).toBe(
      'possible'
    );
  });

  it('returns anomaly below the possible threshold', () => {
    expect(assignConfidenceTier(0, 'cdse-derived')).toBe('anomaly');
    expect(assignConfidenceTier(0.1, 'cdse-derived')).toBe('anomaly');
    expect(assignConfidenceTier(CONFIDENCE_THRESHOLDS.possible - 0.01, 'cdse-derived')).toBe(
      'anomaly'
    );
  });
});

describe('isFresh', () => {
  it('returns true for a detection less than 24 hours old', () => {
    const recentIso = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(isFresh(recentIso)).toBe(true);
  });

  it('returns true for a detection exactly 23h59m old', () => {
    const ts = new Date(Date.now() - (24 * 60 * 60 * 1000 - 60_000)).toISOString();
    expect(isFresh(ts)).toBe(true);
  });

  it('returns false for a detection older than 24 hours', () => {
    const oldIso = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(isFresh(oldIso)).toBe(false);
  });

  it('accepts a Date object', () => {
    expect(isFresh(new Date(Date.now() - 1000))).toBe(true);
    expect(isFresh(new Date(Date.now() - 48 * 60 * 60 * 1000))).toBe(false);
  });
});

describe('isExperimental', () => {
  it('returns true only for heuristic-v0 provenance', () => {
    expect(isExperimental('heuristic-v0')).toBe(true);
  });

  it('returns false for validated provenances', () => {
    expect(isExperimental('cdse-derived')).toBe(false);
    expect(isExperimental('cmems-derived')).toBe(false);
    expect(isExperimental('seed-historical')).toBe(false);
  });
});
