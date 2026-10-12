import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { artifactFixture } from '../../node/lib/fixtures/artifacts.js';

test('prototype and file creation share the View runtime contract and compile after implementing a view', () => {
  const fixture = artifactFixture();
  try {
    const { root, base, run } = fixture;
    run('src/platform/node/cli/studio.js', 'identify', base, '--yes');
    run('src/platform/modules/prototypes/node/create.js', 'Empty runtime fixture', '--no-system');
    run('src/platform/modules/prototypes/node/create.js', 'Assigned empty runtime fixture');
    const result = JSON.parse(
      run(
        '--input-type=module',
        '--eval',
        String.raw`
      import assert from 'node:assert/strict';
      import fs from 'node:fs'; import path from 'node:path';
      import {runOp} from './src/platform/node/build/files/ops.js';
      import {INSTALLED_FILE_TYPES} from './src/platform/node/lib/file-types.js';
      import * as runtime from './src/platform/modules/view/lib/index.ts';
      const dir=path.resolve('src/prototypes/artifact-fixture/empty-runtime-fixture');
      runOp(dir,{op:'create',name:'review.tsx'});
      const sources=['prototype.tsx','review.tsx'].map(name=>fs.readFileSync(path.join(dir,name),'utf8'));
      const ids=sources.map(source=>INSTALLED_FILE_TYPES.view.identity.read(source));
      assert.ok(ids.every(Boolean)); assert.notEqual(ids[0],ids[1]);
      const template=INSTALLED_FILE_TYPES.view.template('prototype.tsx');
      const body=source=>source.replace(/^\/\*\* @studio-id [^\n]+\n/,'');
      assert.ok(sources.every(source=>body(source)===template));
      assert.ok(template.includes("from '@module/view'"));
      assert.deepEqual(Object.keys(runtime),['emptyView']);
      assert.equal(runtime.emptyView(),null);
      console.log(JSON.stringify({dir,ids}));
    `,
      )
        .trim()
        .split('\n')
        .at(-1),
    );
    const plain = JSON.parse(fs.readFileSync(path.join(result.dir, 'meta.json')));
    const assigned = JSON.parse(
      fs.readFileSync(path.join(root, 'src/prototypes/artifact-fixture/assigned-empty-runtime-fixture/meta.json')),
    );
    assert.equal(plain.systemId, null);
    assert.ok(assigned.systemId);
    assert.equal(fs.existsSync(path.join(root, 'src/lib/emptyView.ts')), false);
    run('src/platform/node/build/build-manifest.js', '--strict', '--deploy');
    run('src/platform/node/check/check-modules.js');
    run('src/platform/node/check/typecheck.js');
    run('node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native');
    const source = path.join(result.dir, 'review.tsx');
    const previous = fs.readFileSync(source, 'utf8');
    const identity = previous.split('\n')[0];
    fs.writeFileSync(
      source,
      identity + '\nexport default function Review(){return <div>__IMPLEMENTED_EMPTY_VIEW__</div>}\n',
    );
    assert.equal(result.ids[1], /@studio-id ([0-9a-z]+)/.exec(fs.readFileSync(source, 'utf8'))[1]);
    run('src/platform/node/build/build-manifest.js', '--strict', '--deploy');
    run('node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native');
    const output = fs
      .readdirSync(path.join(root, 'dist/assets'))
      .filter(name => name.endsWith('.js'))
      .map(name => fs.readFileSync(path.join(root, 'dist/assets', name), 'utf8'))
      .join('');
    assert.ok(output.includes('__IMPLEMENTED_EMPTY_VIEW__'));
    assert.ok(output.includes('This view is empty'));
  } finally {
    fixture.dispose();
  }
});
