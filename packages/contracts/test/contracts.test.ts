import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ProjectDto } from '../src/types';

describe('@trillo/contracts public contract', () => {
  it('keeps ProjectDto aligned with the serialized project payload', () => {
    const project = {
      id: 'project-alpha',
      name: 'Project Alpha',
      description: 'Primary board for product planning and delivery.',
      notes: 'Release notes draft.',
      contextIds: ['context-default'],
      createdAt: '2026-02-19T10:00:00.000Z',
      updatedAt: '2026-02-19T10:00:00.000Z'
    } satisfies ProjectDto;

    expect(Object.keys(project)).toEqual([
      'id',
      'name',
      'description',
      'notes',
      'contextIds',
      'createdAt',
      'updatedAt'
    ]);
  });

  it('keeps the Context OpenAPI schema aligned with implemented routes', () => {
    const openapi = readFileSync(resolve(__dirname, '../openapi/trillo.v1.yaml'), 'utf8');
    const contextSchema = readSchemaBlock(openapi, 'Context', 'Project');

    expect(contextSchema).toContain('required:');
    expect(contextSchema).toContain('- id');
    expect(contextSchema).toContain('- name');
    expect(contextSchema).toContain('- description');
    expect(contextSchema).toContain('- createdAt');
    expect(contextSchema).toContain('- updatedAt');
    expect(contextSchema).toContain('minLength: 2');
    expect(contextSchema).toContain('maxLength: 64');
    expect(contextSchema).toContain('maxLength: 120');
    expect(contextSchema).toContain('maxLength: 4000');
    expect(contextSchema).not.toContain('ownerUserId');
    expect(contextSchema).not.toContain('format: uuid');
  });
});

function readSchemaBlock(openapi: string, schemaName: string, nextSchemaName: string) {
  const startMarker = `    ${schemaName}:`;
  const endMarker = `    ${nextSchemaName}:`;
  const start = openapi.indexOf(startMarker);
  const end = openapi.indexOf(endMarker, start);

  if (start === -1 || end === -1) {
    throw new Error(`Schema block ${schemaName} was not found.`);
  }

  return openapi.slice(start, end);
}
