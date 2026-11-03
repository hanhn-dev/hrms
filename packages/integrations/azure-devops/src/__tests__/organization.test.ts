import { describe, expect, it } from 'vitest';
import { getOrganizationIdentity } from '../organization.js';

describe('getOrganizationIdentity', () => {
  it('parses a dev.azure.com org URL', () => {
    expect(getOrganizationIdentity('https://dev.azure.com/example')).toBe('example');
  });
});
