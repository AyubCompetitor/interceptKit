import { describe, expect, it } from '@rstest/core';

import { MAX_IMPORT_LENGTH, parseImportFile } from '../importFile.ts';

const NAMES = {
    unnamed: 'Untitled',
    variablesSuffix: ': variables',
};

const getIssueText = (text: string): string => {
    const result = parseImportFile(text, NAMES);

    if (result.ok) {
        throw new Error('expected the file to be refused');
    }

    return result.issues.map(issue => `${issue.path}: ${issue.message}`).join('; ');
};

describe('parseImportFile', () => {
    it.each([
        { name: 'text that is not JSON', text: '{', error: 'not JSON' },
        { name: 'YAML of OpenAPI', text: 'openapi: 3.1.0\ninfo:\n  title: Shop', error: 'convert the file to JSON' },
        { name: 'a list', text: '[]', error: 'neither a Postman collection' },
        { name: 'JSON of something else', text: '{"rules":[]}', error: 'neither a Postman collection' },
        { name: 'Swagger 2.0', text: '{"swagger":"2.0","paths":{}}', error: 'convert the file to OpenAPI 3' },
    ])('refuses $name', ({ text, error }) => {
        expect(getIssueText(text)).toContain(error);
    });

    it('refuses a file over 10 MB before reading it', () => {
        expect(getIssueText(' '.repeat(MAX_IMPORT_LENGTH + 1))).toContain('larger than 10 MB');
    });
});
