import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sanitizeRichHtml, plainTextToHtml, normalizeLink, messageHtml, hasRichContent } from '../src/rich-text.js';

const win = new JSDOM('').window;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cN1cAAAAASUVORK5CYII=';
const parse = html => { const el = win.document.createElement('div'); el.innerHTML = html; return el; };

test('Texto antigo continua legível e caracteres HTML são escapados', () => {
  const html = messageHtml({ body: 'Olá, Joe,\n\nCompare <A> & "B".\nAté amanhã.' }, win);
  const el = parse(html);
  assert.equal(el.querySelectorAll('p').length, 2);
  assert.equal(el.querySelectorAll('br').length, 1);
  assert.ok(el.textContent.includes('Compare <A> & "B".'));
  assert.equal(el.querySelector('a'), null);
  assert.ok(plainTextToHtml('<script>alert(1)</script>').includes('&lt;script&gt;'));
});

test('Fontes, tamanhos, cores, marcas, alinhamento e listas sobrevivem ao salvamento', () => {
  const draft = { body: 'Reunião confirmada', bodyHtml: '<p style="text-align:center;margin-left:48px"><span style="font-family:Georgia;font-size:24px;color:#2563eb;background-color:#fde68a"><strong><em><u>Reunião confirmada</u></em></strong></span></p><ol><li><p>Pauta</p></li></ol>' };
  const roundTrip = JSON.parse(JSON.stringify({ ...draft, bodyHtml: sanitizeRichHtml(draft.bodyHtml, win) }));
  const el = parse(messageHtml(roundTrip, win));
  const span = el.querySelector('span');
  assert.equal(span.style.fontFamily, 'Georgia');
  assert.equal(span.style.fontSize, '24px');
  assert.equal(span.style.color, 'rgb(37, 99, 235)');
  assert.equal(span.style.backgroundColor, 'rgb(253, 230, 138)');
  assert.equal(el.querySelector('p').style.textAlign, 'center');
  assert.equal(el.querySelector('p').style.marginLeft, '48px');
  assert.ok(el.querySelector('strong em u'));
  assert.ok(el.querySelector('ol li'));
});

test('Conteúdo ativo, atributos de evento, CSS indevido e imagens remotas são removidos', () => {
  const html = '<script>alert(1)</script><iframe src="https://example.com"></iframe><svg onload="alert(1)"></svg><p onclick="alert(1)" style="position:fixed;z-index:999999;background-image:url(https://example.com/track);font-size:900px;color:red">Texto</p><img src="https://example.com/tracker.png" onerror="alert(1)"><a href="javascript:alert(1)">Perigoso</a>';
  const el = parse(sanitizeRichHtml(html, win));
  assert.equal(el.querySelector('script,iframe,svg,img'), null);
  assert.equal(el.querySelector('[onclick],[onerror]'), null);
  assert.equal(el.querySelector('p').style.position, '');
  assert.equal(el.querySelector('p').style.backgroundImage, '');
  assert.equal(el.querySelector('p').style.fontSize, '');
  assert.equal(el.querySelector('a').getAttribute('href'), null);
  assert.equal(el.querySelector('p').textContent, 'Texto');
});

test('Links seguros abrem isolados e destinos de script ou dados são rejeitados', () => {
  assert.equal(normalizeLink('example.com/pauta'), 'https://example.com/pauta');
  assert.equal(normalizeLink('mailto:joe@example.com'), 'mailto:joe@example.com');
  for (const input of ['javascript:alert(1)', 'data:text/html,hi', 'vbscript:alert(1)', 'https://user:password@example.com', 'https://example.com\n/abc', '']) assert.equal(normalizeLink(input), null);
  const a = parse(sanitizeRichHtml('<a href="https://example.com">Pauta</a>', win)).querySelector('a');
  assert.equal(a.target, '_blank'); assert.equal(a.rel, 'noopener noreferrer');
});

test('Imagens incorporadas permitidas contam como conteúdo; imagens SVG não entram', () => {
  const safe = sanitizeRichHtml(`<p><img src="${png}" alt="exemplo"></p>`, win);
  assert.ok(parse(safe).querySelector('img'));
  assert.equal(hasRichContent('', safe, win), true);
  assert.equal(hasRichContent('', '<p><strong></strong></p>', win), false);
  assert.equal(hasRichContent('', '<img src="data:image/svg+xml;base64,PHN2Zz4=">', win), false);
});

test('Formatação malformada não injeta estilos nem apaga o texto útil', () => {
  const html = sanitizeRichHtml('<span style="font-family:evil;font-size:48px;color:#3478f5;position:absolute" onmouseover="bad()">Texto de revisão</span>', win);
  const span = parse(html).querySelector('span');
  assert.equal(span.textContent, 'Texto de revisão');
  assert.equal(span.style.fontFamily, '');
  assert.equal(span.style.fontSize, '48px');
  assert.equal(span.style.position, '');
  assert.equal(span.getAttribute('onmouseover'), null);
});
