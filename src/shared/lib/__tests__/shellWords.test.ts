import { describe, expect, it } from '@rstest/core';

import { splitShellWords } from '../shellWords.ts';

describe('splitShellWords', () => {
    it.each([
        { name: 'plain words', command: 'curl  -X POST', words: ['curl', '-X', 'POST'] },
        { name: 'single quotes as they are', command: `curl 'a "b" \\n'`, words: ['curl', 'a "b" \\n'] },
        { name: 'double quotes with escapes', command: 'curl "a \\"b\\" \\\\ \\$x"', words: ['curl', 'a "b" \\ $x'] },
        {
            name: 'a backslash before another character in double quotes',
            command: 'curl "a\\nb"',
            words: ['curl', 'a\\nb'],
        },
        { name: 'an escaped space outside quotes', command: 'curl a\\ b', words: ['curl', 'a b'] },
        {
            name: 'quoted parts glued into one word',
            command: `curl -H'Accept: '"text/html"`,
            words: ['curl', '-HAccept: text/html'],
        },
        { name: 'line continuations', command: 'curl \\\n  -X POST \\\r\n  url', words: ['curl', '-X', 'POST', 'url'] },
        { name: 'an empty quoted word', command: `curl ''`, words: ['curl', ''] },
        { name: 'ANSI-C quotes from Chrome', command: `curl $'{"a":"it\\'s\\n"}'`, words: ['curl', `{"a":"it's\n"}`] },
        { name: 'ANSI-C hex and unicode escapes', command: `curl $'\\x41\\u00e9'`, words: ['curl', 'Aé'] },
    ])('splits $name', ({ command, words }) => {
        expect(splitShellWords(command)).toEqual(words);
    });

    it.each([
        { name: 'single', command: `curl 'open` },
        { name: 'double', command: 'curl "open' },
        { name: 'ANSI-C', command: `curl $'open` },
    ])('gives nothing for an open $name quote', ({ command }) => {
        expect(splitShellWords(command)).toBeUndefined();
    });
});
