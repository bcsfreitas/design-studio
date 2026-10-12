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
  writeProfiles(root, {
    'artifact-fixture': {
      name: 'Artifact Fixture',
      email: 'artifact@example.test',
      preferences: { onboarding: { welcomeDismissed: true }, fixture: { ready: false } },
    },
  });
  const configFile = path.join(root, 'studio.config.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const contributor = JSON.parse(fs.readFileSync(path.join(root, 'contributors/artifact-fixture.json')));
  config.usage = 'personal';
  config.admins = [contributor.studioId];
  config.modules.fixture = true;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  write(
    'src/modules/fixture/module.ts',
    `export default {id:'fixture',label:'Fixture',version:'0.1.0',requires:'0.4.0',optional:true,lib:false,dependencies:{cn:'^0.4.0'},optimizeDependencies:['cn'],preferences:{defaults:{ready:false},fields:{ready:'boolean'}},hosts:[{id:'fixture/storyboard',scopes:['prototype'],references:'same-prototype'}]};\n`,
  );
  write(
    'src/modules/fixture/build.ts',
    `import type {ModuleBuild} from '#studio/module';
import fs from 'node:fs'; import path from 'node:path';
export default {assets:{report:{watch:['src/modules/fixture/data.json'],load:({root})=>JSON.parse(fs.readFileSync(path.join(root,'src/modules/fixture/data.json'),'utf8'))}}} satisfies ModuleBuild;\n`,
  );
  write('src/modules/fixture/data.json', JSON.stringify({ message: '__PUBLIC_ASSET_PROOF__' }));
  write(
    'src/modules/fixture/type.ts',
    `
    import { defineFileType } from '#studio/files';
    import { fixtureIdentity } from './identity.ts';
export default defineFileType({
  label: 'Fixture', extensions: ['.fixture'], language: 'json',
  systemUsage: 'independent', inPrototype: true, inSystemContent: false, fallback: false,
  capabilities: {source:true,create:true,fidelity:false,embeds:['document','canvas','fixture/storyboard'],actions:[]},
  identity: fixtureIdentity,
  template: () => JSON.stringify({title:'Fixture', links:[]}),
});
`,
  );
  write(
    'src/modules/fixture/identity.ts',
    "import { jsonIdentityMetadata } from '#studio/files';\nexport const fixtureIdentity = jsonIdentityMetadata;\n",
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
    'src/modules/fixture/app.tsx',
    `
import { CodeIcon } from '@hugeicons/core-free-icons';
import { type ModuleApp, MermaidDiagram, useStudioSettings } from '#studio/ui';
import { adminProblems, type StudioConfig } from '#studio/module';
import { compiledLifecycle, createPrototype, duplicatePrototype, renamePrototype, deletePrototype, fileOp, useManifest, type PrototypeInfo, loadModuleAsset, subscribeModuleAsset } from '#studio/data';
import { initialLifecycle, lifecycleAttributes } from '#studio/lifecycle';
import { useEffect, useState } from 'react';
import {getSystems,getSystem,defaultSystemKey,systemPath,ThemeScope} from '#studio/systems';
function PublicSystems(){const key=defaultSystemKey(),system=getSystem(key);return <ThemeScope themeClass={system?.themeClass ?? 'prototype-unstyled'}><p data-public-system>{system?.label ?? 'Missing system'}: {Object.keys(getSystems({role:'prototype'})).length} systems <a href={import.meta.env.BASE_URL.slice(0,-1)+systemPath(key)}>Open system</a></p></ThemeScope>;}
function PublicAsset(){const [value,setValue]=useState('Pending asset');useEffect(()=>{let live=true;const load=()=>{loadModuleAsset<{message:string}>('fixture','report').then(data=>{if(live)setValue(data.message);}).catch(error=>{if(live)setValue(error.message);});};load();const unsubscribe=subscribeModuleAsset('fixture','report',load);return()=>{live=false;unsubscribe();};},[]);return <p data-public-asset>{value}</p>;}
function LocalSettings(){const settings=useStudioSettings(['name']);return <p data-public-settings>{settings.snapshot ? settings.snapshot.role : settings.error || 'Loading settings'}</p>;}
function Mutations(){
  const inventory=useManifest();
  const [proto,setProto]=useState<PrototypeInfo|null>(inventory.prototypes.find(p=>p.title==='Public renamed fixture') ?? null),[status,setStatus]=useState('Ready');
  const run=async(action:string)=>{try{
    if(action==='create'){const r=await createPrototype('Public mutation fixture',null);setProto(r.manifest.prototypes.find(p=>p.studioId===r.prototypeId)!);setStatus('Created '+r.prototypeId);return;}
    if(!proto)return;
    if(action==='rename'){const r=await renamePrototype(proto,{title:'Public renamed fixture'});setProto(r.manifest.prototypes.find(p=>p.studioId===r.prototypeId)!);setStatus('Renamed '+r.prototypeId);return;}
    if(action==='duplicate'){const r=await duplicatePrototype(proto,{title:'Public copied fixture',system:null});setStatus('Copied '+r.prototypeId);return;}
    if(action==='relocate'){await fileOp(proto,{op:'create',path:'',name:'nested',dir:true});const r=await fileOp(proto,{op:'move',path:'moved.md',to:'nested'});setStatus('relocated '+r.path+' '+r.artifactId);return;}
    if(action==='delete'){await deletePrototype(proto);setProto(null);setStatus('Deleted');return;}
    const r=await fileOp(proto,action==='file'?{op:'create',path:'',name:'public.md'}:action==='move'?{op:'rename',path:'public.md',name:'moved.md'}:{op:'reorder',path:'nested/moved.md',to:'',before:'prototype.tsx'});
    setStatus(action+' '+r.path+' '+r.artifactId);
  }catch(e){setStatus(e instanceof Error?e.message:String(e));}};
  return <section><p data-public-mutation-status>{status}</p>{['create','rename','duplicate','file','move','relocate','reorder','delete'].map(action=><button key={action} onClick={()=>void run(action)}>Public {action}</button>)}</section>;
}
function Probe(){
  const [state,setState]=useState(initialLifecycle);
  useEffect(()=>{const tracker=compiledLifecycle({contributor:'artifact-fixture',prototype:'mixed',path:'main.tsx'},setState);tracker.ready();return ()=>tracker.dispose();},[]);
  return <section data-public-api-probe {...lifecycleAttributes(state)}><h2>Public API fixture</h2>
    <MermaidDiagram source={'graph LR\\n A-->B'} />
    <PublicSystems /><PublicAsset />{import.meta.env.DEV && <><LocalSettings /><Mutations /></>}
  </section>;
}
export const validAdmins = (config: Partial<StudioConfig>, people: string[]) => adminProblems(config,people);
export default {icon:CodeIcon,rail:'none',order:1000,overview:Probe} satisfies ModuleApp;
`,
  );
  write(
    'src/modules/fixture/node/public-api.js',
    `
import assert from 'node:assert/strict';
import {resourceId, prototypeAddress, artifactAddress, systemAddress, parsePrototypeAddress} from '#studio/files';
import {adminProblems} from '#studio/module';
import {readContributorPreferences,updateContributorPreferences} from '#studio/preferences';
const preferences=readContributorPreferences(process.cwd(),{actor:'artifact-fixture',module:'fixture'});
assert.equal(preferences.value.ready,false);
updateContributorPreferences(process.cwd(),{actor:'artifact-fixture',module:'fixture',base:preferences.version,value:{ready:true}});
assert.equal(readContributorPreferences(process.cwd(),{actor:'artifact-fixture',module:'fixture'}).value.ready,true);
const id=resourceId('0123456789abcdef'), child=resourceId('fedcba9876543210');
assert.equal(prototypeAddress(id),'/prototypes/'+id);
assert.equal(systemAddress(id),'/systems/'+id);
assert.deepEqual(parsePrototypeAddress(artifactAddress(id,child)),{prototypeId:id,artifactId:child});
assert.equal(parsePrototypeAddress('/prototypes/sam/renamed'),null);
assert.deepEqual(adminProblems({usage:'team',admins:['sam']},['sam']),[]);
console.log('Public identity and settings validators passed.');
`,
  );
  write(
    'src/modules/fixture/open.tsx',
    `
import { CodeIcon } from '@hugeicons/core-free-icons';
import { readSource, inspectArtifact, useManifest, type Prototype, type Artifact, type FileTypeModule } from '#studio/data';
import { ArtifactHost, FileTree, type FileTreePolicy } from '#studio/ui';
const readOnlyTree: FileTreePolicy = {scope:'prototype',noun:'artifacts',reorder:false,canChange:()=>false,newOptions:()=>[]};
import { artifactAddress, resourceId } from '#studio/files';
import { useEffect, useState } from 'react';
import { createArtifactLifecycle, initialLifecycle, lifecycleAttributes, digestText } from '#studio/lifecycle';
import { files } from './loader';
function SourcePage({source}: {source:string}) {
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
function Page({source,proto,item}: {source:string;proto:Prototype;item:Artifact}) {
 const request={reference:artifactAddress(resourceId(proto.studioId),resourceId(item.studioId)),origin:{proto,item},surface:'fixture/storyboard' as const};
 const result=inspectArtifact(request,useManifest());
 return <><aside aria-label="Public file tree"><FileTree proto={proto} current={item} policy={readOnlyTree} embedded /></aside><SourcePage source={source}/><p data-public-inspection>{result.state}</p><ArtifactHost request={request} width={480} height={240}/></>;
}
export default {
  icon:CodeIcon,
  async load({proto,item}) {
    const source=import.meta.env.DEV ? (await readSource(proto,item.path)).content
      : await files['/prototypes/'+proto.contributorKey+'/'+proto.id+'/'+item.path]?.();
    return source===undefined ? undefined : {source,proto,item};
  },
  Page,
  Embed: () => <div data-fixture-embed>Fixture preview</div>,
} satisfies FileTypeModule<{source:string;proto:Prototype;item:Artifact}>;
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
  const preferencePlan = path.join(root, '.fixture-preferences.json');
  run('src/platform/node/cli/studio.js', 'preferences', '--module', 'fixture', '--plan', preferencePlan);
  run('src/platform/node/cli/studio.js', 'preferences', '--apply', preferencePlan);
  fs.rmSync(preferencePlan);
  return { root, base, write, run, env, dispose: () => fs.rmSync(root, { recursive: true, force: true }) };
}
