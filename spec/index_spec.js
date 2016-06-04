import {childProcess} from 'node-promise-es6';
import Directory from 'directory-helpers';
import {path as phantomJsPath} from 'phantomjs-prebuilt';
import PhantomJS from 'phantomjs-promise-es6';

async function phantomPids() {
  try {
    const {stdout: pids} = await childProcess.exec(`pgrep -f '${phantomJsPath}'`);
    return pids.split('\n').filter(Boolean).map(Number);
  } catch (error) {
    return null;
  }
}

function withHtml(html, test) {
  return async () => {
    const directory = new Directory('temp');
    const browser = new PhantomJS();
    try {
      await directory.write({'index.html': html});
      await browser.open(`file://${directory.path('index.html')}`);
      await test(browser, directory);
    } finally {
      await browser.exit();
      await directory.remove();
    }
  };
}

describe('phantomjs-promise-es6', () => {
  it('can kill the phantomjs process', async () => {
    const browser = new PhantomJS();
    expect(await phantomPids()).toContain(browser.process.pid);
    await browser.exit();
    expect(await phantomPids()).not.toContain(browser.process.pid);
  });

  it('can open a URL', withHtml(
    `
    <!doctype html>
    <meta charset="utf-8">
    <title>Hello World!</title>
    `,
    async (browser) => {
      expect(await browser.title()).toContain('Hello World!');
    }
  ));

  it('can read information about a DOM element', withHtml(
    `
    <!doctype html>
    <meta charset="utf-8">
    <div
      id="root"
      class="container"
      style="position: absolute; top: 0; left: 0; width: 200px; height: 100px;"
    >
      Hello World!
    </div>
    <input value="text">
    `,
    async (browser) => {
      const div = await browser.find('div');
      expect(div.textContent.trim()).toBe('Hello World!');
      expect(div.attributes.id).toBe('root');
      expect(div.attributes.class).toBe('container');
      expect(div.boundingClientRect).toEqual({
        top: 0,
        right: 200,
        bottom: 100,
        left: 0,
        width: 200,
        height: 100
      });

      const input = await browser.find('input');
      expect(input.value).toBe('text');
    }
  ));

  it('can find a DOM element by text', withHtml(
    `
    <!doctype html>
    <meta charset="utf-8">
    <span>Hello</span>
    <span>World!</span>
    `,
    async (browser) => {
      const span = await browser.find('span', {text: 'World!'});
      expect(span.textContent).toBe('World!');
    }
  ));

  it('returns null if a DOM element does not exist', withHtml(
    `
    <!doctype html>
    <meta charset="utf-8">
    `,
    async (browser) => {
      const missing = await browser.find('div');
      expect(missing).toBe(null);
    }
  ));

  it('can click on a DOM element', withHtml(
    `
    <!doctype html>
    <meta charset="utf-8">
    <button onClick="root.textContent = 'Hello World!';">
      Button
    </button>
    <div id="root"></div>
    `,
    async (browser) => {
      const button = await browser.find('button');
      await button.click();

      const root = await browser.find('#root');
      expect(root.textContent).toBe('Hello World!');
    }
  ));

  it('can fill in a DOM element', withHtml(
    `
    <!doctype html>
    <meta charset="utf-8">
    <input>
    `,
    async (browser) => {
      let input = await browser.find('input');
      await input.fillIn('Hello World!');

      input = await browser.find('input');
      expect(input.value).toBe('Hello World!');
    }
  ));
});
