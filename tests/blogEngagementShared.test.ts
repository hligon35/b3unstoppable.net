import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCommentTree,
  isValidEmail,
  sanitizeOptionalUrl,
  sanitizePlainText,
  sanitizeSingleLineText,
} from '../src/lib/blogEngagementShared';

test('sanitizePlainText normalizes whitespace and strips null bytes', () => {
  const value = sanitizePlainText(' hello\t\u0000world\n\n\nnext ');
  assert.equal(value, 'hello world\n\nnext');
});

test('sanitizeSingleLineText collapses line breaks into spaces', () => {
  const value = sanitizeSingleLineText('one\n\ntwo\r\nthree');
  assert.equal(value, 'one two three');
});

test('sanitizeOptionalUrl only accepts http and https URLs', () => {
  assert.equal(sanitizeOptionalUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(sanitizeOptionalUrl('http://example.com'), 'http://example.com/');
  assert.equal(sanitizeOptionalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeOptionalUrl('/relative/path'), null);
});

test('isValidEmail enforces a simple but safe email pattern', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('bad@'), false);
  assert.equal(isValidEmail('bad space@example.com'), false);
});

test('buildCommentTree supports single-level replies and flattens deeper replies', () => {
  const tree = buildCommentTree([
    {
      id: 1,
      postId: 1,
      parentCommentId: null,
      authorName: 'A',
      authorWebsite: null,
      body: 'Parent',
      createdAt: '2026-01-01T00:00:00.000Z',
      reactions: { support: 0, insight: 0, fire: 0 },
      replies: [],
    },
    {
      id: 2,
      postId: 1,
      parentCommentId: 1,
      authorName: 'B',
      authorWebsite: null,
      body: 'Reply',
      createdAt: '2026-01-01T01:00:00.000Z',
      reactions: { support: 0, insight: 0, fire: 0 },
      replies: [],
    },
    {
      id: 3,
      postId: 1,
      parentCommentId: 2,
      authorName: 'C',
      authorWebsite: null,
      body: 'Too deep',
      createdAt: '2026-01-01T02:00:00.000Z',
      reactions: { support: 0, insight: 0, fire: 0 },
      replies: [],
    },
  ]);

  assert.equal(tree.length, 2);
  assert.equal(tree[0]?.id, 1);
  assert.equal(tree[0]?.replies.length, 1);
  assert.equal(tree[0]?.replies[0]?.id, 2);
  assert.equal(tree[1]?.id, 3);
  assert.equal(tree[1]?.parentCommentId, null);
});
