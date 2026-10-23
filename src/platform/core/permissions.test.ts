// Who may change what (permissions.ts). Run with `pnpm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canChange,
  canMaintain,
  canOwn,
  canPerform,
  parseMaintainers,
  pathResource,
  permissionRefusal,
  policyFor,
  refusalMessage,
  whyNot,
  type Resource,
  type ResourceAction,
} from './permissions.ts';
import type { StudioConfig } from './config.ts';
import type { ModuleSpec } from './modules/index.ts';

const modules: ModuleSpec[] = [
  {
    optional: false,
    lib: false,
    id: 'examples',
    label: 'Examples',
    version: '0.1.0',
    requires: '0.2.0',
    section: { key: 'examples', folder: 'src/examples', items: 'prototypes', policy: 'maintainers' },
  },
  {
    optional: false,
    lib: false,
    id: 'documentation',
    label: 'Manual',
    version: '0.1.0',
    requires: '0.2.0',
    section: { key: 'documentation', folder: 'src/platform/modules/documentation/pages' },
  },
  { optional: false, lib: false, id: 'extra', label: 'Extra', version: '0.1.0', requires: '0.2.0' },
];

test('maintainers are a list of at least one contributor key', () => {
  assert.deepEqual(parseMaintainers(['samples']), ['samples']);
  assert.deepEqual(parseMaintainers(['samples', 'abigail', 'samples']), ['samples', 'abigail']);
  assert.equal(parseMaintainers([]), null);
  assert.equal(parseMaintainers('samples'), null);
  assert.equal(parseMaintainers(undefined), null);
  assert.equal(parseMaintainers([3]), null);
});

test('a key that could climb out of a folder is not a maintainer', () => {
  assert.equal(parseMaintainers(['../samples']), null);
  assert.equal(parseMaintainers(['a/b']), null);
  assert.equal(parseMaintainers(['']), null);
});

test('only a listed maintainer may maintain', () => {
  assert.equal(canMaintain(['samples', 'abigail'], 'abigail'), true);
  assert.equal(canMaintain(['samples'], 'abigail'), false);
  assert.equal(canMaintain(['samples'], null), false);
  assert.equal(canMaintain(undefined, 'samples'), false);
});

test('a key no module claims is a contributor, and a section says its own policy', () => {
  assert.equal(policyFor('samples', modules), 'owner');
  assert.equal(policyFor('examples', modules), 'maintainers');
  assert.equal(policyFor('system-content', modules), 'open');
  assert.equal(policyFor('documentation', modules), 'none');
});

test("you own your own prototypes and nobody else's", () => {
  assert.equal(canOwn('owner', { me: 'samples', key: 'samples' }), true);
  assert.equal(canOwn('owner', { me: 'abigail', key: 'samples' }), false);
  assert.equal(canOwn('owner', { me: null, key: 'samples' }), false);
});

test('a maintained section item is owned by its maintainers, whoever started it', () => {
  assert.equal(canOwn('maintainers', { me: 'abigail', key: 'examples', maintainers: ['samples', 'abigail'] }), true);
  assert.equal(canOwn('maintainers', { me: 'sam', key: 'examples', maintainers: ['samples'] }), false);
  assert.equal(canOwn('maintainers', { me: 'samples', key: 'examples' }), false);
});

test('open section files require resource authority and have no artifact owner', () => {
  assert.equal(canChange('open', { me: null, key: 'system-content' }), false);
  assert.equal(canOwn('open', { me: 'samples', key: 'system-content' }), false);
});

test('nobody changes a section with no policy', () => {
  assert.equal(canChange('none', { me: 'samples', key: 'documentation' }), false);
});

test('section-level changing needs ownership', () => {
  assert.equal(canChange('owner', { me: 'samples', key: 'samples' }), true);
  assert.equal(canChange('owner', { me: 'abigail', key: 'samples' }), false);
  assert.equal(canChange('maintainers', { me: 'sam', key: 'examples', maintainers: ['samples'] }), false);
});

test('the reason says what to do', () => {
  assert.match(whyNot('owner', null), /not set up/);
  assert.match(whyNot('maintainers', null), /not set up/);
  assert.match(whyNot('owner', 'abigail'), /belongs to someone else/);
  assert.match(whyNot('maintainers', 'abigail'), /maintainers/);
  assert.match(whyNot('none', 'abigail'), /can't be changed/);
});

test('resource grants separate prototype ownership, assigned systems, and platform administration', async () => {
  const { canPerform } = await import('./permissions.ts');
  const config = {
    usage: 'team' as const,
    admins: ['admin'],
    systems: ['studio', 'product', 'marketing'],
    systemMaintainers: { product: ['sam'], marketing: [] },
  };
  const roster = ['admin', 'sam', 'alex'];
  const product = { kind: 'system' as const, id: 'product', role: 'prototype' as const, status: 'active' as const };
  for (const action of ['edit', 'rename'] as const) {
    assert.equal(canPerform(config, 'sam', roster, product, action), true);
    assert.equal(canPerform(config, 'alex', roster, product, action), false);
    assert.equal(canPerform(config, 'sam', roster, { ...product, id: 'marketing' }, action), false);
    assert.equal(canPerform(config, 'sam', roster, { ...product, status: 'archived' }, action), false);
    assert.equal(canPerform(config, 'admin', roster, { ...product, status: 'archived' }, action), false);
  }
  assert.equal(canPerform(config, 'sam', roster, product, 'manage'), false);
  assert.equal(canPerform(config, 'admin', roster, product, 'manage'), true);
  assert.equal(canPerform(config, 'sam', roster, { kind: 'prototype', owner: 'sam' }, 'manage'), true);
  assert.equal(canPerform(config, 'sam', roster, { kind: 'prototype', owner: 'alex' }, 'edit'), false);
  assert.equal(canPerform(config, 'admin', roster, { kind: 'prototype', owner: 'alex' }, 'edit'), true);
  assert.equal(canPerform(config, 'sam', roster, { ...product, id: 'studio', role: 'platform' }, 'edit'), false);
  assert.equal(canPerform(config, 'admin', roster, { ...product, id: 'studio', role: 'platform' }, 'edit'), true);
  assert.equal(canPerform(config, 'admin', roster, { ...product, id: 'studio', role: 'platform' }, 'manage'), false);
  assert.equal(canPerform(config, 'sam', roster, { kind: 'module' }, 'edit'), false);
  assert.equal(canPerform(config, 'admin', [], product, 'edit'), false);
  assert.equal(canPerform(config, null, roster, product, 'read'), true);
  assert.equal(canPerform({ ...config, usage: 'personal' }, 'sam', roster, { kind: 'platform' }, 'edit'), true);
});

test('a file belongs to the system whose folder holds it, in either system root', () => {
  const systems = {
    studio: { role: 'platform', status: 'active' },
    product: { role: 'prototype', status: 'active' },
  } as const;
  assert.deepEqual(pathResource('src/systems/product/components/button.tsx', systems), {
    kind: 'system',
    id: 'product',
    role: 'prototype',
    status: 'active',
  });
  assert.deepEqual(pathResource('src/platform/systems/studio/components/button/button.tsx', systems), {
    kind: 'system',
    id: 'studio',
    role: 'platform',
    status: 'active',
  });
  // Neither root's folder name is a system until it is installed; the rest of src/platform is the platform's.
  assert.deepEqual(pathResource('src/systems/unknown/system.ts', systems), { kind: 'platform' });
  assert.deepEqual(pathResource('src/platform/systems/unknown/system.ts', systems), { kind: 'platform' });
  assert.deepEqual(pathResource('src/platform/app/styles.css', systems), { kind: 'platform' });
  // Module code is a module's in either module root, even though the supplied root is under src/platform.
  assert.deepEqual(pathResource('src/platform/modules/systems/spec.ts', systems), { kind: 'module' });
  assert.deepEqual(pathResource('src/modules/research/app.tsx', systems), { kind: 'module' });
  assert.deepEqual(pathResource('/src/platform/modules/canvas/Canvas.tsx', systems), { kind: 'module' });
  assert.deepEqual(pathResource('src/platform/modulesque/x.ts', systems), { kind: 'platform' });
});

test('a refusal names its cause: identity, Admin role, or system maintainer', () => {
  const team = { usage: 'team', admins: ['ada'], systems: ['acme'], systemMaintainers: { acme: ['max'] } } as const;
  const people = ['ada', 'max', 'sam'];
  const acme: Resource = { kind: 'system', id: 'acme', role: 'prototype', status: 'active' };
  const config = team as unknown as Partial<StudioConfig>;
  assert.equal(permissionRefusal(config, null, people, acme, 'manage'), 'identity');
  assert.equal(permissionRefusal(config, 'stranger', people, acme, 'manage'), 'identity');
  assert.equal(permissionRefusal(config, 'sam', people, acme, 'manage'), 'admin');
  assert.equal(permissionRefusal(config, 'sam', people, acme, 'rename'), 'maintainer');
  assert.equal(permissionRefusal(config, 'max', people, acme, 'rename'), null);
  assert.equal(permissionRefusal(config, 'ada', people, acme, 'manage'), null);
  // Personal studios make every contributor an Admin, so only identity can be the cause.
  const personal = { usage: 'personal', systems: ['acme'] } as unknown as Partial<StudioConfig>;
  assert.equal(permissionRefusal(personal, null, people, acme, 'manage'), 'identity');
  assert.equal(permissionRefusal(personal, 'sam', people, acme, 'manage'), null);
  assert.match(
    refusalMessage('identity', { email: 'new@example.test' }),
    /Your Git identity \(new@example\.test\) doesn't match a contributor profile.*pnpm join/,
  );
  assert.match(refusalMessage('admin'), /Only an Admin/);
  assert.match(refusalMessage('maintainer', { system: 'acme' }), /maintainer of the acme system/);
});

test('naming the cause widens no permission', () => {
  // The decision rule before refusals had causes; canPerform must agree with it everywhere.
  const before = (
    config: Partial<StudioConfig>,
    actor: string | null,
    contributors: readonly string[],
    resource: Resource,
    action: ResourceAction,
  ) => {
    if (action === 'read') return true;
    const role =
      !actor || !contributors.includes(actor)
        ? null
        : config.usage === 'personal' || config.admins?.includes(actor)
          ? 'admin'
          : 'contributor';
    if (!role) return false;
    if (resource.kind === 'prototype') return role === 'admin' || resource.owner === actor;
    if (resource.kind !== 'system') return role === 'admin';
    const registered = resource.role === 'platform' || Boolean(config.systems?.includes(resource.id));
    if (!registered) return false;
    if (resource.role === 'platform') return role === 'admin' && action === 'edit';
    if (action === 'manage') return role === 'admin';
    if (resource.status !== 'active') return false;
    return role === 'admin' || Boolean(actor && config.systemMaintainers?.[resource.id]?.includes(actor));
  };
  const configs = [
    { usage: 'personal', systems: ['acme'] },
    { usage: 'team', admins: ['ada'], systems: ['acme'], systemMaintainers: { acme: ['max'] } },
    { usage: 'team', admins: [], systems: [] },
  ] as unknown as Partial<StudioConfig>[];
  const resources: Resource[] = [
    { kind: 'prototype', owner: 'sam' },
    { kind: 'prototype', owner: 'max' },
    { kind: 'platform' },
    { kind: 'module' },
    { kind: 'system', id: 'acme', role: 'prototype', status: 'active' },
    { kind: 'system', id: 'acme', role: 'prototype', status: 'archived' },
    { kind: 'system', id: 'other', role: 'prototype', status: 'active' },
    { kind: 'system', id: 'studio', role: 'platform', status: 'active' },
  ];
  for (const config of configs)
    for (const actor of [null, 'ada', 'max', 'sam', 'stranger'])
      for (const resource of resources)
        for (const action of ['read', 'edit', 'rename', 'manage'] as ResourceAction[])
          assert.equal(
            canPerform(config, actor, ['ada', 'max', 'sam'], resource, action),
            before(config, actor, ['ada', 'max', 'sam'], resource, action),
            JSON.stringify({ config, actor, resource, action }),
          );
});
