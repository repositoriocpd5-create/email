import { createId } from './id.js';

export function normalize(text = '') {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function filterMessages(messages, { folder = 'inbox', account = 'all', tab = 'all', search = '', attachments = false, sort = 'newest' } = {}, accounts = []) {
  const query = normalize(search).trim();
  return messages.filter(m => {
    const correctFolder = folder === 'starred' ? m.starred && !['trash', 'drafts'].includes(m.folder) : m.folder === folder;
    if (!correctFolder || (account !== 'all' && m.accountId !== account)) return false;
    if (tab === 'unread' && m.read) return false;
    if (tab === 'starred' && !m.starred) return false;
    if (attachments && !m.attachments?.length) return false;
    if (query) {
      const a = accounts.find(a => a.id === m.accountId);
      const text = normalize([m.sender, m.from, m.to, m.subject, m.body, a?.name, a?.email, ...(m.attachments || []).map(f => f.name)].join(' '));
      if (!text.includes(query)) return false;
    }
    return true;
  }).sort((a, b) => sort === 'oldest' ? a.date - b.date : b.date - a.date);
}

export function summarize(messages, account = 'all') {
  const active = messages.filter(m => m.folder === 'inbox' && (account === 'all' || m.accountId === account));
  return { unread: active.filter(m => !m.read).length, starred: messages.filter(m => m.starred && !['trash', 'drafts'].includes(m.folder) && (account === 'all' || m.accountId === account)).length, attachments: active.filter(m => m.attachments?.length).length, total: active.length };
}

export function isEmail(value) {
  return /^[^\s@,;]+@[^\s@,;.]+(?:\.[^\s@,;.]+)+$/.test(value.trim());
}

export function validateRecipients(value) {
  const parts = value.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(isEmail);
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export function formatTime(date) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function formatSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function downloadAttachment(file) {
  const objectURL = file.dataUrl ? null : URL.createObjectURL(new Blob([file.content || 'Documento de demonstração.'], { type: file.type || 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = file.dataUrl || objectURL; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  if (objectURL) setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
}

export async function readAttachments(files) {
  const chosen = [...files];
  if (chosen.length > 3) throw new Error('Adicione até 3 arquivos por vez.');
  if (chosen.some(f => f.size > 1024 * 1024)) throw new Error('Neste modo local, cada anexo pode ter até 1 MB.');
  return Promise.all(chosen.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: createId(), name: file.name, size: file.size, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  })));
}

export function loadStored(key, fallback, validate = () => true) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value != null && validate(value) ? value : typeof fallback === 'function' ? fallback() : fallback; }
  catch { return typeof fallback === 'function' ? fallback() : fallback; }
}
