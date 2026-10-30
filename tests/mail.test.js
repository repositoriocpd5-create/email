import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ACCOUNTS, createInitialMessages, createIncoming } from '../src/data.js';
import { summarize, filterMessages, validateRecipients, normalize } from '../src/mail.js';

const messages = createInitialMessages(1793325600000);

test('As dez contas têm contagens coerentes com as mensagens reais', () => {
  assert.equal(DEFAULT_ACCOUNTS.length, 10);
  assert.equal(new Set(messages.map(m => m.id)).size, messages.length);
  assert.deepEqual(summarize(messages), { total: 99, unread: 69, starred: 8, attachments: 12 });
  assert.deepEqual(DEFAULT_ACCOUNTS.map(a => summarize(messages, a.id).unread), [12, 8, 6, 9, 5, 11, 4, 3, 2, 9]);
});

test('Busca sem acentos encontra assunto, corpo, endereço, conta e anexo', () => {
  assert.equal(normalize('REUNIÃO'), 'reuniao');
  assert.ok(filterMessages(messages, { search: 'reuniao' }, DEFAULT_ACCOUNTS).some(m => m.id === 'demo-work-0'));
  assert.ok(filterMessages(messages, { search: 'pauta-da-reuniao.txt' }, DEFAULT_ACCOUNTS).some(m => m.id === 'demo-work-0'));
  assert.ok(filterMessages(messages, { search: 'trabalho@exemplo.com' }, DEFAULT_ACCOUNTS).every(m => m.accountId === 'work'));
  assert.equal(filterMessages(messages, { search: 'termo inexistente' }, DEFAULT_ACCOUNTS).length, 0);
});

test('Conta, não lidas e anexo são filtros combináveis, sem vazamento entre contas', () => {
  const result = filterMessages(messages, { account: 'finance', tab: 'unread', attachments: true }, DEFAULT_ACCOUNTS);
  assert.ok(result.length > 0);
  assert.ok(result.every(m => m.accountId === 'finance' && !m.read && m.attachments.length > 0));
});

test('Lixeira e rascunhos ficam fora dos favoritos e dos totais de entrada', () => {
  const next = messages.map(m => m.id === 'demo-personal-0' ? { ...m, folder: 'trash' } : m);
  assert.equal(summarize(next).unread, 68);
  assert.equal(summarize(next).starred, 7);
  assert.ok(!filterMessages(next, { folder: 'starred' }).some(m => m.id === 'demo-personal-0'));
  assert.equal(filterMessages(next, { folder: 'trash' }).length, 1);
  assert.equal(filterMessages(next, { folder: 'drafts' }).length, 1);
});

test('Ordenação antiga ou recente e marcação de leitura produzem o resultado esperado', () => {
  const recent = filterMessages(messages); const old = filterMessages(messages, { sort: 'oldest' });
  assert.ok(recent[0].date > recent.at(-1).date);
  assert.equal(recent[0].id, old.at(-1).id);
  const next = messages.map(m => m.id === 'demo-finance-0' ? { ...m, read: true } : m);
  assert.equal(summarize(next, 'finance').unread, 10);
  assert.ok(!filterMessages(next, { tab: 'unread' }).some(m => m.id === 'demo-finance-0'));
});

test('Destinatários aceitam uma lista válida e rejeitam entradas inválidas', () => {
  for (const value of ['joe@exemplo.com', 'joe@exemplo.com, equipe@exemplo.org', 'joe@exemplo.com; outra@exemplo.com.br']) assert.equal(validateRecipients(value), true);
  for (const value of ['', 'joe', 'joe@', 'joe@exemplo', 'a@b.c, inválido', 'a b@exemplo.com', 'a@b..com']) assert.equal(validateRecipients(value), false);
});

test('Uma mensagem de teste pertence à conta escolhida e aumenta só seu contador', () => {
  const account = DEFAULT_ACCOUNTS[2]; const incoming = createIncoming(account, 1793325600001);
  const next = [incoming, ...messages];
  assert.equal(incoming.accountId, account.id);
  assert.equal(incoming.to, account.email);
  assert.equal(summarize(next).unread, 70);
  assert.equal(summarize(next, 'study').unread, 7);
  assert.equal(summarize(next, 'work').unread, 12);
});
