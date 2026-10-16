import { describe, expect, it } from 'vitest';
import { toWorkItemAreaPath } from '../catalog.js';

describe('toWorkItemAreaPath', () => {
  it('drops the Area segment Azure DevOps adds to classification nodes', () => {
    expect(toWorkItemAreaPath('\\TDG HRMS\\Area\\Ganges\\COB', 'TDG HRMS')).toBe('TDG HRMS\\Ganges\\COB');
    expect(toWorkItemAreaPath('\\TDG HRMS\\Area', 'TDG HRMS')).toBe('TDG HRMS');
  });
});
