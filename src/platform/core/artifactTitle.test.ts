// Titles derived from file names (artifactTitle.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artifactTitle } from './artifactTitle.ts';

test('names without separators keep their title', () => {
  assert.equal(artifactTitle('main'), 'Main');
  assert.equal(artifactTitle('Novo agendamento'), 'Novo agendamento');
  assert.equal(artifactTitle('Início'), 'Início');
});

test('hyphens and underscores become spaces and start a word', () => {
  assert.equal(artifactTitle('session-done'), 'Session Done');
  assert.equal(artifactTitle('home_screen'), 'Home Screen');
  assert.equal(artifactTitle('a__b'), 'A B');
  assert.equal(artifactTitle('lofi-main'), 'Lo-fi Main');
});

test('a spaced dash stays a single dash', () => {
  assert.equal(artifactTitle('Home - new user'), 'Home - New user');
  assert.equal(artifactTitle('Início - sem_conta'), 'Início - Sem Conta');
  assert.equal(artifactTitle('ética-visão'), 'Ética Visão');
});
