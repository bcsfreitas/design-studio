import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeProfiles } from './contributors.js';
import { linkSystemDependencies } from './workspace-dependencies.js';

// Disposable mixed-artifact studios exercise the public extension boundary.
// Never register test modules or content in the person's checkout.
export function artifactFixture(original = process.cwd()) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-artifacts-')));
  const write = (file, source) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
    return target;
  };
  fs.cpSync(original, root, {
    recursive: true,
    filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
  });
  fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
  linkSystemDependencies(original, root);
  writeProfiles(root, { 'artifact-fixture': { name: 'Artifact Fixture', email: 'artifact@example.test' } });
  const configFile = path.join(root, 'studio.config.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const contributor = JSON.parse(fs.readFileSync(path.join(root, 'contributors/artifact-fixture.json')));
  config.usage = 'personal';
  config.admins = [contributor.studioId];
  config.modules.fixture = true;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  write(
    'src/modules/fixture/module.ts',
    `export default {id:'fixture',label:'Fixture',version:'0.1.0',requires:'0.4.0',optional:true,lib:false};\n`,
  );
  write(
    'src/modules/fixture/type.ts',
    `
import { defineFileType, type ResourceId } from '#studio/files';
export default defineFileType({
  label: 'Fixture', extensions: ['.fixture'], language: 'json',
  systemUsage: 'independent', inPrototype: true, inSystemContent: false, fallback: false,
  capabilities: {source:true,create:true,fidelity:false,embeds:['document','canvas'],actions:[]},
  identity: {
    read(source) { return (JSON.parse(source).studioId ?? null) as ResourceId | null; },
    write(source, id) { return JSON.stringify({...JSON.parse(source), studioId:id}, null, 2)+'\\n'; },
  },
  template: () => JSON.stringify({title:'Fixture', links:[]}),
});
`,
  );
  write(
    'src/modules/fixture/loader.ts',
    `export const files = import.meta.glob<string>(['/__studio_globs__/*'], {query:'?raw',import:'default'});\nif(import.meta.hot) import.meta.hot.accept();\n`,
  );
  write(
    'src/modules/fixture/references.ts',
    `
import { defineReferenceAdapter } from '#studio/references';
function rewrite(source: string, target: (value:string)=>string) {
  const data=JSON.parse(source);
  const links=(data.links ?? []).map(target);
  return JSON.stringify(links)===JSON.stringify(data.links ?? []) ? source : JSON.stringify({...data,links},null,2)+'\\n';
}
export default [defineReferenceAdapter({
  extensions:['.fixture'],
  move:(source,_path,context)=>rewrite(source,context.link),
  copy:(source,_path,context)=>rewrite(source,context.target),
})];
`,
  );
  write(
    'src/modules/fixture/open.tsx',
    `
import { CodeIcon } from '@hugeicons/core-free-icons';
import { readSource, type FileTypeModule } from '#studio/data';
import { useEffect, useState } from 'react';
import { createArtifactLifecycle, initialLifecycle, lifecycleAttributes, digestText } from '#studio/lifecycle';
import { files } from './loader';
function Page({source}: {source:string}) {
  const [state,setState]=useState(initialLifecycle);
  useEffect(()=>{
    const controller=createArtifactLifecycle(setState);
    let live=true;
    void digestText(source).then(hash=>{
      if(!live)return;
      const ticket=controller.prepare({source:hash,inputs:hash});
      if(ticket)controller.commit(ticket);
    });
    return ()=>{live=false;controller.dispose();};
  },[source]);
  return <pre data-fixture-preview {...lifecycleAttributes(state)}>{source}</pre>;
}
export default {
  icon:CodeIcon,
  async load({proto,item}) {
    const source=import.meta.env.DEV ? (await readSource(proto,item.path)).content
      : await files['/prototypes/'+proto.contributorKey+'/'+proto.id+'/'+item.path]?.();
    return source===undefined ? undefined : {source};
  },
  Page,
  Embed: () => <div data-fixture-embed>Fixture preview</div>,
} satisfies FileTypeModule<{source:string}>;
`,
  );
  const base = 'src/prototypes/artifact-fixture/mixed';
  write(base + '/meta.json', JSON.stringify({ formatVersion: 1, title: 'Mixed artifact fixture', systemId: null }));
  write(base + '/main.tsx', 'export default function View() {return <div>__ARTIFACT_VIEW_PROOF__</div>}\n');
  write(base + '/notes.md', '# Mixed artifacts\n\n![View](./main.tsx)\n\n![Fixture](./model.fixture)\n');
  write(base + '/flow.mermaid', 'graph LR\n A-->B\n');
  write(base + '/board.excalidraw', JSON.stringify({ elements: [], appState: {}, files: {} }));
  write(base + '/model.fixture', JSON.stringify({ title: '__ARTIFACT_EXTERNAL_PROOF__', links: [] }));
  const env = {
    ...process.env,
    MISE_TRUSTED_CONFIG_PATHS: root,
    STUDIO_BASE_PATH: '/artifact-fixture/',
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'user.name',
    GIT_CONFIG_VALUE_0: 'Artifact Fixture',
    GIT_CONFIG_KEY_1: 'user.email',
    GIT_CONFIG_VALUE_1: 'artifact@example.test',
  };
  const run = (file, ...args) =>
    execFileSync(process.execPath, [file, ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000,
      maxBuffer: 32 * 1024 * 1024,
    });
  return { root, base, write, run, env, dispose: () => fs.rmSync(root, { recursive: true, force: true }) };
}
