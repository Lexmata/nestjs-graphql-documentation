import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Browser, Page, chromium } from 'playwright';
import { buildTestAppModule } from '../integration/fixtures/test-app.module.js';

let app: INestApplication;
let baseUrl: string;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  const AppModule = buildTestAppModule({
    driver: 'apollo',
    docs: { path: '/graphql/docs', title: 'E2E API' },
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0); // bind an ephemeral port
  const server = app.getHttpServer();
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Could not resolve test server port');
  baseUrl = `http://127.0.0.1:${addr.port}`;

  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  // Surface client-side errors in the test log instead of silently passing.
  page.on('pageerror', (err) => {
    throw new Error(`Client-side error in browser: ${err.message}`);
  });
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe('docs UI in a real browser', () => {
  it('loads the shell, fetches schema.json, and renders the nav', async () => {
    await page.goto(`${baseUrl}/graphql/docs`);
    // The nav is populated asynchronously after the schema.json fetch resolves,
    // so wait for at least one entity link before asserting.
    await page.waitForSelector('[data-ngd-nav] a[data-kind]');
    const userLink = await page.locator('[data-ngd-nav] a[data-name="user"]').first();
    expect(await userLink.isVisible()).toBe(true);
    const createUserLink = await page.locator('[data-ngd-nav] a[data-name="createUser"]').first();
    expect(await createUserLink.isVisible()).toBe(true);
  });

  it('navigates to an entity via pushState on click', async () => {
    await page.goto(`${baseUrl}/graphql/docs`);
    await page.waitForSelector('[data-ngd-nav] a[data-name="createUser"]');
    await page.locator('[data-ngd-nav] a[data-name="createUser"]').first().click();
    await page.waitForURL(`${baseUrl}/graphql/docs/mutations/createUser`);
    const main = page.locator('[data-ngd-main]');
    await main.locator('h2').first().waitFor();
    expect(await main.locator('h2').first().textContent()).toContain('createUser');
  });

  it('renders the correct entity on a deep-link cold load', async () => {
    await page.goto(`${baseUrl}/graphql/docs/queries/user`);
    await page.waitForSelector('[data-ngd-main] h2');
    const heading = await page.locator('[data-ngd-main] h2').first().textContent();
    expect(heading).toContain('user');
    // The auth and since tags should surface in the entity pane.
    expect(await page.locator('[data-ngd-main]').textContent()).toContain('user');
  });

  it('filters the sidebar when the search input changes', async () => {
    await page.goto(`${baseUrl}/graphql/docs`);
    await page.waitForSelector('[data-ngd-nav] a[data-name="user"]');
    // Pre-filter: both entries visible.
    expect(await page.locator('[data-ngd-nav] a[data-name="user"]').first().isVisible()).toBe(true);
    expect(await page.locator('[data-ngd-nav] a[data-name="createUser"]').first().isVisible()).toBe(
      true,
    );
    await page.locator('[data-ngd-search]').fill('createUser');
    // After the input handler runs (synchronous), the `user` entry should be
    // hidden but `createUser` visible.
    expect(
      await page
        .locator('[data-ngd-nav] li:has(a[data-name="user"])')
        .first()
        .evaluate((el) => el.classList.contains('ngd-hidden')),
    ).toBe(true);
    expect(
      await page
        .locator('[data-ngd-nav] li:has(a[data-name="createUser"])')
        .first()
        .evaluate((el) => el.classList.contains('ngd-hidden')),
    ).toBe(false);
  });

  it('supports browser back/forward via popstate', async () => {
    await page.goto(`${baseUrl}/graphql/docs`);
    await page.waitForSelector('[data-ngd-nav] a[data-name="user"]');
    await page.locator('[data-ngd-nav] a[data-name="user"]').first().click();
    await page.waitForURL(`${baseUrl}/graphql/docs/queries/user`);
    await page.locator('[data-ngd-nav] a[data-name="createUser"]').first().click();
    await page.waitForURL(`${baseUrl}/graphql/docs/mutations/createUser`);
    await page.goBack();
    await page.waitForURL(`${baseUrl}/graphql/docs/queries/user`);
    expect(await page.locator('[data-ngd-main] h2').first().textContent()).toContain('user');
  });

  it('surfaces a failure banner when schema.json is unreachable', async () => {
    // Route the schema.json request to a 500 on this page only, then load.
    await page.route('**/graphql/docs/schema.json', (route) =>
      route.fulfill({ status: 500, body: 'broken' }),
    );
    await page.goto(`${baseUrl}/graphql/docs`);
    await page.waitForSelector('[data-ngd-main] .ngd-banner');
    expect(await page.locator('[data-ngd-main] .ngd-banner').first().textContent()).toContain(
      'Failed to load schema',
    );
    await page.unroute('**/graphql/docs/schema.json');
  });
});
