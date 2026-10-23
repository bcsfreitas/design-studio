// Seam 2: copied app components rendered with Vue's server renderer through createStudiosApp, the same factory
// VueScreen and VueInline use. Modules load through a Vite server with the Studio Vue systems plugin, so the .vue
// files compile, auto-import and resolve as they do in the dev server.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const SYSTEM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = path.resolve(SYSTEM, '../../..');
const PLUGIN = path.join(ROOT, 'src/platform/node/build/vite-vue-systems-plugin.js');
const posix = file => file.split(path.sep).join('/');

let server;
let render;
let renderHtml;
const warnings = [];
const warn = console.warn;

before(async () => {
  // The Studio build integration is loaded by path: it is under test here, not a runtime dependency.
  const { default: vueSystems } = await import(pathToFileURL(PLUGIN).href);
  server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: await vueSystems({ root: ROOT }),
    resolve: { alias: [{ find: /^@\//, replacement: `${posix(path.join(ROOT, 'src'))}/` }] },
    ssr: { noExternal: ['@nuxt/ui'] },
  });
  const { createStudiosApp } = await server.ssrLoadModule(posix(path.join(SYSTEM, 'libraries/vue-app.ts')));
  const { renderToString } = await server.ssrLoadModule('vue/server-renderer');
  renderHtml = async (file, options = {}) => {
    const { default: component } = await server.ssrLoadModule(posix(path.join(SYSTEM, file)));
    return renderToString(createStudiosApp({ ...options, component, ssr: true }));
  };
  render = async (file, options = {}) => {
    const html = await renderHtml(file, options);
    return html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  };
  console.warn = (...args) => warnings.push(args.join(' '));
});

after(async () => {
  console.warn = warn;
  await server?.close();
});

describe('Endless Studios Vue app factory', () => {
  test('the dashboard hero shows the English locale titles', async () => {
    const text = await render('studios/components/Dashboard/Hero.vue', { props: { loggedIn: true } });
    assert.match(text, /Embark on a Game-Making/);
    assert.match(text, /Enter the World of Threadbare/);
  });

  test('signed out, the hero shows the signed-out slide instead of the signed-in one', async () => {
    const text = await render('studios/components/Dashboard/Hero.vue', { props: { loggedIn: false }, user: null });
    assert.match(text, /A shared space to learn game making/);
    assert.doesNotMatch(text, /Enter the World of Threadbare/);
  });

  test('the onboarding card shows its title and both actions', async () => {
    const text = await render('studios/components/Dashboard/OnboardingCard.vue');
    assert.match(text, /Welcome to the Endless Studios Platform!/);
    assert.match(text, /Explore programs/);
    assert.match(text, /I have an access code/);
  });

  test('the program tile renders', async () => {
    assert.match(await render('studios/components/Dashboard/ProgramTileEmpty.vue'), /Intro unity/);
  });

  test('another locale changes the copy', async () => {
    const english = await render('studios/components/Dashboard/OnboardingCard.vue');
    const spanish = await render('studios/components/Dashboard/OnboardingCard.vue', { locale: 'es' });
    assert.notEqual(spanish, english);
    assert.doesNotMatch(spanish, /Explore programs/);
  });

  test('the profile card shows the sample user, and signed out shows login instead', async () => {
    assert.match(await render('runtime/test/ProfileScreen.vue'), /ana\.learner/);
    assert.match(await render('runtime/test/ProfileScreen.vue', { user: 'mentor' }), /marco\.mentor/);
    const signedOut = await render('runtime/test/ProfileScreen.vue', { user: null });
    assert.doesNotMatch(signedOut, /ana\.learner|Edit profile/);
    assert.match(signedOut, /Log ?in/i);
  });

  test('upcoming events renders from a sample query response', async () => {
    const sample = {
      queries: {
        UpcomingEventInstances: {
          upcomingEventInstances: [{ id: 1, title: 'Game jam kickoff', start: '2026-11-04T15:00:00Z', event: { id: 9 } }],
        },
      },
    };
    const text = await render('studios/components/Dashboard/UpcomingEvents.vue', { sample });
    assert.match(text, /Upcoming Events/);
    assert.match(text, /Game jam kickoff/);
    assert.match(await render('studios/components/Dashboard/UpcomingEvents.vue'), /No Upcoming Events/);
  });

  test('seeded store state renders; unknown actions, unmocked queries and missing keys fail softly, once', async () => {
    warnings.length = 0;
    const options = { sample: { state: { systemNotificationCount: 7, user: { completedOnboarding: false } } } };
    const text = await render('runtime/test/StoreScreen.vue', options);
    await render('runtime/test/StoreScreen.vue', options);
    assert.match(text, /Notifications: 7/);
    assert.match(text, /Onboarding done: no/);
    assert.match(text, /Unmocked: 0/);
    assert.match(text, /no_such\.key/);
    for (const gap of ['triggerSystemNotifications', 'OPEN_MODAL', 'Unmocked', 'no_such.key'])
      assert.equal(warnings.filter(line => line.includes(gap)).length, 1, `${gap} is reported once`);
  });

  test('a copied component importing an app image renders it, from a script import or a template URL', async () => {
    const program = { id: 1, name: 'Intro to Godot', short_description: null, image_url: null, program_kind_id: 'regular', program_status_id: 'inprogress', tasks_count: 4 };
    const tile = await renderHtml('studios/components/Program/ProgramTile.vue', { props: { testAttrData: '', program } });
    assert.match(tile, /<img[^>]+src="[^"]*studios\/assets\/images\/default-bg\.png"/);
    const sidebar = await renderHtml('studios/components/App/StudioSidebar.vue');
    assert.match(sidebar, /<img[^>]+src="[^"]*studios\/assets\/images\/logo-endless-navbar\.svg"/);
  });

  test('a screen wrapped in the app shell shows the sidebar and top bar around it', async () => {
    const text = await render('studios/components/Dashboard/OnboardingCard.vue', { shell: true });
    assert.match(text, /Welcome to the Endless Studios Platform!/);
    for (const item of [/Home/, /Explore Games/, /My Programs/, /Notifications/, /ana\.learner/]) assert.match(text, item);
    const html = await renderHtml('studios/components/Dashboard/OnboardingCard.vue', { shell: true });
    assert.match(html, /id="layout-main-content"/);
    // The sidebar's, top bar's and footer's logos; Vite inlines the top bar's small one as a data URL.
    assert.equal(html.match(/<img src="(data:image\/svg|[^"]*\/logo-endless[\w-]*\.svg)[^>]*alt="Endless Studios"/g)?.length, 3);
    const signedOut = await render('studios/components/Dashboard/OnboardingCard.vue', { shell: true, user: null });
    assert.match(signedOut, /Sign ?up/i);
    assert.doesNotMatch(signedOut, /ana\.learner/);
    assert.doesNotMatch(await render('studios/components/Dashboard/OnboardingCard.vue'), /Explore Games/);
  });
});
