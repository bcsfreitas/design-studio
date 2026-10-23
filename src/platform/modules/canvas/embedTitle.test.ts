import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedTitle } from './embedTitle.ts';

test("an embed of a view state is titled with its view and state; other embeds keep the artifact's title", () => {
  assert.equal(embedTitle('Home', { title: 'Membro com programas' }), 'Home · Membro com programas');
  assert.equal(embedTitle('Home'), 'Home');
});
