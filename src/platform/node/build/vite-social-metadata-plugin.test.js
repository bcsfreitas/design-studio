import assert from 'node:assert/strict';
import test from 'node:test';
import socialMetadata from './vite-social-metadata-plugin.js';

function tags(options, base = '/') {
  const plugin = socialMetadata(options);
  plugin.configResolved({ base });
  return plugin.transformIndexHtml.handler().map(tag => tag.attrs);
}

test('local previews resolve sharing images below the configured base', () => {
  const metadata = tags({ publicUrl: '' }, '/studio/');
  assert.equal(metadata.find(tag => tag.property === 'og:image').content, '/studio/images/design-studio-social.png');
  assert.equal(metadata.find(tag => tag.name === 'twitter:image').content, '/studio/images/design-studio-social.png');
});

test('published images use the complete public URL, including its subpath', () => {
  for (const publicUrl of ['https://example.com/studio', 'https://example.com/studio/']) {
    const metadata = tags({ publicUrl });
    assert.equal(
      metadata.find(tag => tag.property === 'og:image').content,
      'https://example.com/studio/images/design-studio-social.png',
    );
    assert.equal(metadata.find(tag => tag.name === 'twitter:card').content, 'summary_large_image');
    assert.ok(metadata.find(tag => tag.property === 'og:image:alt').content);
    // Do not collapse every prototype's identity to the studio home URL.
    assert.ok(!metadata.some(tag => tag.property === 'og:url'));
  }
});

test('invalid or ambiguous public URLs fail instead of producing broken cards', () => {
  for (const publicUrl of [
    'example.com',
    'file:///studio',
    'https://user:secret@example.com',
    'https://example.com/?token=x',
    'https://example.com/#studio',
  ]) {
    assert.throws(() => socialMetadata({ publicUrl }));
  }
});
