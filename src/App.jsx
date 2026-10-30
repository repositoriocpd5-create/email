import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip, IconButton } from './components/Tooltip.jsx';
import RichTextEditor from './components/RichTextEditor.jsx';
import { sanitizeRichHtml, plainTextToHtml, messageHtml, hasRichContent } from './rich-text.js';
import { Inbox, Send, FileText, Archive, Trash2, Star, Search, Plus, ChevronDown, ChevronLeft, ChevronRight, Bell, Settings, RefreshCw, SlidersHorizontal, Paperclip, X, Check, ArrowUpRight, Mail, MailOpen, MoreHorizontal, Menu, ArrowLeft, Download, Reply, Forward, Clock3, CircleHelp, Command, Volume2, ShieldCheck, CheckCheck, Sun, Moon, Info, CircleAlert, CheckCircle2, Keyboard, Undo2, PanelLeftClose, PanelLeftOpen, LayoutGrid, ArrowDown, ArrowUp, FlaskConical, Pencil, CloudOff, Maximize2, Minimize2 } from 'lucide-react';
import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, createInitialMessages, createIncoming } from './data.js';
import { createId } from './id.js';
import { filterMessages, summarize, initials, formatTime, formatSize, validateRecipients, isEmail, downloadAttachment, readAttachments, loadStored } from './mail.js';

const STORAGE_KEY = 'joe-mail-central:v1';
const FOLDERS = { inbox: 'Todas as caixas', starred: 'Favoritos', sent: 'Enviados', drafts: 'Rascunhos', archive: 'Arquivados', trash: 'Lixeira' };
const FOLDER_ICONS = { inbox: Inbox, starred: Star, sent: Send, drafts: FileText, archive: Archive, trash: Trash2 };
const validSaved = v => Array.isArray(v?.messages) && Array.isArray(v?.accounts) && v.accounts.length === 10 && v.messages.every(m => typeof m.id === 'string' && typeof m.body === 'string' && Array.isArray(m.attachments) && FOLDERS[m.folder]);

function Modal({ title, subtitle, icon: Icon, children, onClose, className = '', footer, headerActions }) {
  const ref = useRef(null); const titleId = useId(); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const timer = setTimeout(() => ref.current?.querySelector('button, input, textarea, select, [tabindex="0"]')?.focus(), 40);
    const keydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const focusable = [...(ref.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]') || [])].filter(el => el.getClientRects().length);
      if (!focusable.length) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1).focus(); }
      if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener('keydown', keydown); const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { clearTimeout(timer); document.removeEventListener('keydown', keydown); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return createPortal(<div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
    <header className="modal-header"><div className="modal-heading">{Icon && <span className="modal-icon"><Icon size={21}/></span>}<div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div><div className="modal-window-actions">{headerActions}<IconButton icon={X} label="Fechar janela" onClick={onClose}/></div></header>
    <div className="modal-content">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}
  </section></div>, document.body);
}

function Popover({ children, className = '', onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target) && !e.target.closest('[data-popover-trigger]')) onClose(); };
    const key = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', handler); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', handler); document.removeEventListener('keydown', key); };
  }, [onClose]);
  return <div className={`popover ${className}`} ref={ref}>{children}</div>;
}

function RichMessageBody({ message }) {
  const html = useMemo(() => messageHtml(message), [message.body, message.bodyHtml]);
  return <div className="email-body rich-message-body" dangerouslySetInnerHTML={{ __html: html }}/>;
}

function AccountTag({ account }) {
  if (!account) return null;
  return <span className="account-tag" style={{ '--account-color': account.color, '--account-tone': account.tone }}><i/>{account.name}</span>;
}

function Attachment({ file, onRemove, notify }) {
  return <div className="attachment-card"><span className="file-icon"><FileText size={20}/></span><div className="file-info"><strong title={file.name}>{file.name}</strong><small>{formatSize(file.size || new Blob([file.content || '']).size)} · {file.dataUrl ? 'Arquivo local' : 'Exemplo'}</small></div>{onRemove ? <IconButton icon={X} label={`Remover ${file.name}`} onClick={onRemove}/> : <IconButton icon={Download} label={`Baixar ${file.name}`} onClick={() => { downloadAttachment(file); notify?.('Download iniciado', file.name); }}/>}</div>;
}

function Toast({ item, remove }) {
  useEffect(() => { const timer = setTimeout(() => remove(item.id), item.action ? 10000 : 6500); return () => clearTimeout(timer); }, [item, remove]);
  return <div className={`toast ${item.kind || 'success'}`}><span className="toast-icon">{item.kind === 'mail' ? <Mail size={19}/> : item.kind === 'error' ? <CircleAlert size={19}/> : <CheckCircle2 size={19}/>}</span><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}{item.action && <button className="toast-action" onClick={() => { item.action.onClick(); remove(item.id); }}>{item.action.label === 'Desfazer' && <Undo2 size={13}/>} {item.action.label}</button>}</div><button className="toast-close" aria-label="Dispensar aviso" onClick={() => remove(item.id)}><X size={15}/></button></div>;
}

export default function App() {
  const [saved] = useState(() => loadStored(STORAGE_KEY, () => ({ messages: createInitialMessages(), accounts: DEFAULT_ACCOUNTS, settings: DEFAULT_SETTINGS }), validSaved));
  const [messages, setMessages] = useState(saved.messages);
  const [accounts, setAccounts] = useState(saved.accounts);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...saved.settings });
  const [folder, setFolder] = useState('inbox'); const [account, setAccount] = useState('all');
  const [tab, setTab] = useState('all'); const [search, setSearch] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false); const [sort, setSort] = useState('newest');
  const [selectedId, setSelectedId] = useState('demo-work-0'); const [checked, setChecked] = useState([]); const [retainUnreadId, setRetainUnreadId] = useState(null);
  const [showMore, setShowMore] = useState(false); const [collapsed, setCollapsed] = useState(false); const [mobileNav, setMobileNav] = useState(false); const [mobileReader, setMobileReader] = useState(false);
  const [modal, setModal] = useState(null); const [popover, setPopover] = useState(null); const [compose, setCompose] = useState(null);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [ccVisible, setCcVisible] = useState(false); const [composeError, setComposeError] = useState(''); const [sending, setSending] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({}); const [replyAccount, setReplyAccount] = useState('work'); const [replyFiles, setReplyFiles] = useState({});
  const [notices, setNotices] = useState([]); const [toasts, setToasts] = useState([]); const [syncing, setSyncing] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false); const [lastSync, setLastSync] = useState(null); const [deleteIds, setDeleteIds] = useState(null);
  const [listWidth, setListWidth] = useState(405); const [resizing, setResizing] = useState(false);
  const searchRef = useRef(null); const replyRef = useRef(null); const composeFileRef = useRef(null); const replyFileRef = useRef(null); const syncTimer = useRef(null); const sendTimer = useRef(null); const audioRef = useRef(null);

  const notify = useCallback((title, description = '', kind = 'success', action) => { setToasts(items => [...items.slice(-2), { id: createId(), title, description, kind, action }]); }, []);
  const removeToast = useCallback(id => setToasts(items => items.filter(t => t.id !== id)), []);
  const accountById = id => accounts.find(a => a.id === id) || accounts[0];
  const stats = useMemo(() => summarize(messages, account), [messages, account]);
  const totalStats = useMemo(() => summarize(messages), [messages]);
  const visible = useMemo(() => {
    const filtered = filterMessages(messages, { folder, account, tab, search, attachments: attachmentsOnly, sort }, accounts);
    const retained = tab === 'unread' && retainUnreadId ? filterMessages(messages.filter(m => m.id === retainUnreadId), { folder, account, search, attachments: attachmentsOnly }, accounts)[0] : null;
    if (retained && !filtered.some(m => m.id === retained.id)) return [...filtered, retained].sort((a, b) => sort === 'oldest' ? a.date - b.date : b.date - a.date);
    return filtered;
  }, [messages, folder, account, tab, search, attachmentsOnly, sort, accounts, retainUnreadId]);
  const selected = visible.find(m => m.id === selectedId) || null;
  const currentAccount = selected ? accountById(selected.accountId) : null;
  const unreadByAccount = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, messages.filter(m => m.accountId === a.id && m.folder === 'inbox' && !m.read).length])), [messages, accounts]);
  const allChecked = visible.length > 0 && visible.every(m => checked.includes(m.id));
  const anyDialog = !!(modal || compose || deleteIds);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, accounts, settings })); setStorageWarning(false); }
      catch { setStorageWarning(true); }
    }, 300); return () => clearTimeout(timer);
  }, [messages, accounts, settings]);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);
  useEffect(() => { if (!visible.some(m => m.id === selectedId)) setSelectedId(visible[0]?.id || null); }, [visible, selectedId]);
  useEffect(() => { if (selected) setReplyAccount(selected.accountId); }, [selectedId]);
  useEffect(() => { setChecked([]); setMobileReader(false); setRetainUnreadId(null); }, [folder, account, tab, search, attachmentsOnly]);
  useEffect(() => () => { clearTimeout(syncTimer.current); clearTimeout(sendTimer.current); audioRef.current?.close(); }, []);

  const openMessage = useCallback(m => {
    if (m.folder === 'drafts') { setCompose({ ...m, cc: m.cc || '', bcc: m.bcc || '' }); setComposeError(''); setCcVisible(!!(m.cc || m.bcc)); return; }
    if (tab === 'unread') setRetainUnreadId(m.id);
    setSelectedId(m.id); setMobileReader(true); setMessages(items => items.map(x => x.id === m.id ? { ...x, read: true } : x));
  }, [tab]);

  const newCompose = () => { setCompose({ accountId: account === 'all' ? accounts[0].id : account, to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] }); setCcVisible(false); setComposeError(''); setPopover(null); setMobileNav(false); };
  const navigate = (nextFolder, nextAccount = 'all') => { setFolder(nextFolder); setAccount(nextAccount); setTab('all'); setSearch(''); setAttachmentsOnly(false); setPopover(null); setMobileNav(false); };
  const toggleStar = id => setMessages(items => items.map(m => m.id === id ? { ...m, starred: !m.starred } : m));

  const moveMessages = (ids, destination) => {
    if (!ids.length) return;
    const previous = messages.filter(m => ids.includes(m.id));
    setMessages(items => items.map(m => ids.includes(m.id) ? { ...m, previousFolder: m.folder, folder: destination } : m)); setChecked([]); setPopover(null);
    const word = destination === 'archive' ? 'arquivada' : destination === 'trash' ? 'movida para a lixeira' : 'restaurada';
    notify(ids.length === 1 ? `Mensagem ${word}` : `${ids.length} mensagens ${destination === 'archive' ? 'arquivadas' : destination === 'trash' ? 'na lixeira' : 'restauradas'}`, 'A alteração foi salva neste navegador.', 'success', { label: 'Desfazer', onClick: () => setMessages(items => items.map(m => { const old = previous.find(p => p.id === m.id); return old ? { ...m, folder: old.folder, previousFolder: old.previousFolder } : m; })) });
  };

  const markRead = (ids, read) => {
    const previous = messages.filter(m => ids.includes(m.id));
    setMessages(items => items.map(m => ids.includes(m.id) ? { ...m, read } : m)); setChecked([]);
    notify(read ? 'Marcada como lida' : 'Marcada como não lida', ids.length > 1 ? `${ids.length} mensagens atualizadas.` : '', 'success', { label: 'Desfazer', onClick: () => setMessages(items => items.map(m => { const p = previous.find(p => p.id === m.id); return p ? { ...m, read: p.read } : m; })) });
  };

  const receiveMessage = useCallback(() => {
    const a = accounts.find(a => a.id === account) || accounts[Math.floor(Math.random() * accounts.length)];
    const m = createIncoming(a); setMessages(items => [m, ...items]);
    setNotices(items => [{ id: m.id, title: m.sender, description: m.subject, account: a.name, date: m.date, read: false }, ...items].slice(0, 20));
    if (settings.notifications) notify(`Nova mensagem · ${a.name}`, `${m.sender}: ${m.subject}`, 'mail', { label: 'Abrir mensagem', onClick: () => { navigate('inbox', 'all'); openMessage(m); } });
    if (settings.sound) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = audioRef.current || new AudioContext(); audioRef.current = ctx; ctx.resume();
        const gain = ctx.createGain(); gain.gain.setValueAtTime(0.06, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); gain.connect(ctx.destination);
        const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(660, ctx.currentTime); osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); osc.connect(gain); osc.start(); osc.stop(ctx.currentTime + 0.5);
      } catch { /* Sound is optional and browsers may block playback. */ }
    }
    if (settings.notifications && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { const notice = new Notification(`Demonstração · ${a.name}`, { body: `${m.sender}: ${m.subject}`, icon: '/favicon.svg', tag: m.id }); notice.onclick = () => { window.focus(); navigate('inbox'); openMessage(m); notice.close(); }; } catch { /* In-app notifications remain available. */ }
    }
    return m;
  }, [accounts, account, settings.notifications, settings.sound, notify, openMessage]);

  useEffect(() => { if (!settings.autoReceive) return; const timer = setInterval(receiveMessage, 45000); return () => clearInterval(timer); }, [settings.autoReceive, receiveMessage]);

  const sync = () => {
    if (syncing) return; setSyncing(true);
    syncTimer.current = setTimeout(() => { setSyncing(false); setLastSync(Date.now()); notify('Demonstração atualizada', 'Dados locais conferidos. Nenhum provedor de e-mail está conectado.'); }, 900);
  };

  const saveDraft = () => {
    if (!compose) return;
    if (!(compose.to || compose.subject || hasRichContent(compose.body, compose.bodyHtml) || compose.attachments.length)) { setCompose(null); return; }
    const a = accountById(compose.accountId);
    const draft = { ...compose, bodyHtml: sanitizeRichHtml(compose.bodyHtml || ''), id: compose.id || createId(), sender: a.name, from: a.email, folder: 'drafts', read: true, starred: false, date: Date.now(), subject: compose.subject || '(Sem assunto)' };
    setMessages(items => [draft, ...items.filter(m => m.id !== draft.id)]); setCompose(null); notify('Rascunho salvo', 'Continue quando quiser pela pasta Rascunhos.');
  };

  const sendCompose = e => {
    e.preventDefault(); if (sending) return;
    if (!validateRecipients(compose.to)) { setComposeError('Informe um destinatário válido. Separe vários endereços por vírgula.'); return; }
    if ((compose.cc && !validateRecipients(compose.cc)) || (compose.bcc && !validateRecipients(compose.bcc))) { setComposeError('Verifique os endereços nos campos Cc e Cco.'); return; }
    if (!compose.subject.trim()) { setComposeError('Adicione um assunto para a mensagem.'); return; }
    if (!hasRichContent(compose.body, compose.bodyHtml) && !compose.attachments.length) { setComposeError('Escreva sua mensagem ou adicione um anexo.'); return; }
    setSending(true); setComposeError(''); const a = accountById(compose.accountId);
    const message = { ...compose, bodyHtml: sanitizeRichHtml(compose.bodyHtml || ''), id: compose.id || createId(), sender: a.name, from: a.email, read: true, starred: false, folder: 'sent', date: Date.now() };
    sendTimer.current = setTimeout(() => { setMessages(items => [message, ...items.filter(m => m.id !== message.id)]); setSending(false); setCompose(null); notify('Mensagem salva em Enviados', 'Modo demonstração: nenhum e-mail foi enviado a um provedor.', 'success', { label: 'Ver mensagem', onClick: () => { navigate('sent'); setSelectedId(message.id); setMobileReader(true); } }); }, 550);
  };

  const sendReply = e => {
    e.preventDefault(); if (!selected || sending) return;
    const reply = replyDrafts[selected.id] || { body: '', bodyHtml: '' };
    const body = reply.body || ''; const bodyHtml = sanitizeRichHtml(reply.bodyHtml || ''); const files = replyFiles[selected.id] || [];
    if (!hasRichContent(body, bodyHtml) && !files.length) { notify('Escreva uma resposta', 'Você também pode adicionar um anexo.', 'error'); replyRef.current?.focus(); return; }
    const a = accountById(replyAccount);
    const message = { id: createId(), accountId: a.id, sender: a.name, from: a.email, to: selected.from, subject: `Re: ${selected.subject.replace(/^Re:\s*/i, '')}`, body, bodyHtml, date: Date.now(), folder: 'sent', read: true, starred: false, attachments: files };
    setMessages(items => [message, ...items]); setReplyDrafts(d => ({ ...d, [selected.id]: { body: '', bodyHtml: '' } })); setReplyFiles(f => ({ ...f, [selected.id]: [] }));
    notify('Resposta salva em Enviados', 'Demonstração: a resposta não foi enviada a um provedor.', 'success', { label: 'Ver resposta', onClick: () => { navigate('sent'); setSelectedId(message.id); setMobileReader(true); } });
  };

  const forward = () => {
    if (!selected) return;
    setCompose({ accountId: selected.accountId, to: '', cc: '', bcc: '', subject: `Enc: ${selected.subject}`, body: `\n\n---------- Mensagem encaminhada ----------\nDe: ${selected.sender} <${selected.from}>\nPara: ${selected.to}\nAssunto: ${selected.subject}\n\n${selected.body}`, bodyHtml: plainTextToHtml(`\n\n---------- Mensagem encaminhada ----------\nDe: ${selected.sender} <${selected.from}>\nPara: ${selected.to}\nAssunto: ${selected.subject}`) + messageHtml(selected), attachments: [...selected.attachments] }); setComposeError(''); setCcVisible(false); setPopover(null);
  };

  const addFiles = async (fileList, target) => {
    try {
      const files = await readAttachments(fileList); const existing = target === 'compose' ? compose.attachments : replyFiles[selected.id] || [];
      if (existing.length + files.length > 3 || [...existing, ...files].reduce((sum, f) => sum + (f.size || 0), 0) > 2 * 1024 * 1024) throw new Error('Use até 3 anexos, com no máximo 2 MB no total.');
      if (target === 'compose') setCompose(c => ({ ...c, attachments: [...c.attachments, ...files] }));
      else setReplyFiles(f => ({ ...f, [selected.id]: [...(f[selected.id] || []), ...files] }));
      notify(files.length === 1 ? 'Anexo adicionado' : `${files.length} anexos adicionados`);
    } catch (e) { notify('Não foi possível anexar', e.message, 'error'); }
    if (composeFileRef.current) composeFileRef.current.value = ''; if (replyFileRef.current) replyFileRef.current.value = '';
  };

  const requestNotifications = async () => {
    if (!('Notification' in window) || !window.isSecureContext) { notify('Avisos do navegador indisponíveis', 'Os avisos dentro do aplicativo continuam funcionando.', 'error'); return; }
    try { const result = await Notification.requestPermission(); notify(result === 'granted' ? 'Avisos do navegador ativados' : 'Permissão não concedida', result === 'granted' ? 'Com a aba em segundo plano, você poderá ver os avisos de teste.' : 'Você pode alterar a permissão nas configurações do navegador.', result === 'granted' ? 'success' : 'error'); }
    catch { notify('Não foi possível ativar', 'Use os avisos dentro do aplicativo.', 'error'); }
  };

  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !anyDialog) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (anyDialog || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); newCompose(); }
      if (e.key === '?') setModal('help');
      if (e.key.toLowerCase() === 'r' && selected && !['drafts', 'sent', 'trash'].includes(selected.folder)) { e.preventDefault(); replyRef.current?.focus(); }
      if (e.key.toLowerCase() === 'e' && selected && selected.folder !== 'drafts' && selected.folder !== 'archive') { e.preventDefault(); moveMessages([selected.id], 'archive'); }
      if (e.key === 'Escape') { setPopover(null); setMobileNav(false); setMobileReader(false); setChecked([]); }
      if (['ArrowDown', 'ArrowUp'].includes(e.key) && visible.length) { e.preventDefault(); const index = visible.findIndex(m => m.id === selectedId); const next = visible[Math.max(0, Math.min(visible.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))]; openMessage(next); document.getElementById(`row-${next.id}`)?.scrollIntoView({ block: 'nearest' }); }
    }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });

  const startResize = e => {
    e.preventDefault(); const start = e.clientX; const initial = listWidth; setResizing(true);
    const move = event => setListWidth(Math.max(320, Math.min(540, initial + event.clientX - start)));
    const stop = () => { setResizing(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
  };

  const folderCount = key => key === 'inbox' ? totalStats.unread : key === 'starred' ? totalStats.starred : messages.filter(m => m.folder === key).length;
  const toolbarIds = checked.length ? checked : selected ? [selected.id] : [];
  const replyValue = selected ? replyDrafts[selected.id] || { body: '', bodyHtml: '' } : { body: '', bodyHtml: '' };
  const updateSetting = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  return <>
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNav ? 'nav-open' : ''} ${resizing ? 'resizing' : ''}`}>
      {mobileNav && <button className="nav-backdrop" aria-label="Fechar menu" onClick={() => setMobileNav(false)}/>}
      <aside className="sidebar" aria-label="Contas e pastas">
        <div className="profile"><div className="profile-avatar">JA<span/></div><div className="profile-text"><strong>Joe Amado</strong><span>Seu espaço, organizado.</span></div><IconButton className="collapse-toggle" icon={collapsed ? PanelLeftOpen : PanelLeftClose} label={collapsed ? 'Expandir menu' : 'Recolher menu'} onClick={() => setCollapsed(v => !v)}/></div>
        <Tooltip label="Escrever uma nova mensagem" shortcut="N"><button className="compose-button" onClick={newCompose}><Plus size={20}/><span>Nova mensagem</span><kbd>N</kbd></button></Tooltip>
        <nav className="folder-nav" aria-label="Pastas de e-mail">
          {['inbox', 'starred', 'sent', 'drafts'].map(key => { const Icon = FOLDER_ICONS[key]; const count = folderCount(key); return <Tooltip label={FOLDERS[key]} key={key}><button className={`nav-item ${folder === key && account === 'all' ? 'active' : ''}`} onClick={() => navigate(key)}><Icon size={18} strokeWidth={1.65}/><span>{FOLDERS[key]}</span>{count > 0 && <b>{count}</b>}</button></Tooltip>; })}
          <button className="nav-item more-folders" onClick={() => setShowMore(v => !v)} aria-expanded={showMore}><MoreHorizontal size={18}/><span>{showMore ? 'Menos pastas' : 'Mais pastas'}</span><ChevronDown size={13} className={showMore ? 'rotate' : ''}/></button>
          {showMore && ['archive', 'trash'].map(key => { const Icon = FOLDER_ICONS[key]; return <Tooltip label={FOLDERS[key]} key={key}><button className={`nav-item ${folder === key && account === 'all' ? 'active' : ''}`} onClick={() => navigate(key)}><Icon size={18}/><span>{FOLDERS[key]}</span>{folderCount(key) > 0 && <b>{folderCount(key)}</b>}</button></Tooltip>; })}
        </nav>
        <div className="accounts-heading"><span>MINHAS CONTAS</span><b>10</b><Tooltip label="Personalizar suas contas"><button aria-label="Personalizar suas contas" onClick={() => setModal('accounts')}><Plus size={14}/></button></Tooltip></div>
        <div className="accounts-list" aria-label="Dez contas de demonstração">
          {accounts.map(a => <Tooltip key={a.id} label={`${a.name} · ${a.email}`}><button className={`account-item ${account === a.id ? 'selected' : ''}`} onClick={() => navigate('inbox', a.id)} style={{ '--account-color': a.color, '--account-tone': a.tone }}><span className="account-avatar">{a.initials}</span><span className="account-info"><strong>{a.name}</strong><small>{a.email}</small></span>{unreadByAccount[a.id] > 0 && <b className="account-count">{unreadByAccount[a.id]}</b>}</button></Tooltip>)}
        </div>
        <div className="sidebar-footer"><button className="manage-button" onClick={() => setModal('accounts')}><Settings size={17}/><span>Gerenciar contas</span><ArrowUpRight size={13}/></button><div className="local-status"><span className="status-dot"/><span>Dados salvos neste navegador</span><Tooltip label="Modo de demonstração. Nenhum provedor de e-mail conectado."><span tabIndex={0}><Info size={13}/></span></Tooltip></div></div>
      </aside>

      <main className="main-area">
        <header className="main-header">
          <div className="topbar"><div className="mobile-menu"><IconButton icon={Menu} label="Abrir menu de contas" onClick={() => setMobileNav(true)}/></div><div className="workspace-crumb"><span className="workspace-mark"><Mail size={16}/></span>Meu workspace<ChevronRight size={12}/><span>E-mails</span></div>
            <div className="search-field"><Search size={18}/><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={account === 'all' ? 'Pesquisar em todas as contas' : `Pesquisar em ${accountById(account).name}`} aria-label="Pesquisar e-mails"/>{search ? <button aria-label="Limpar pesquisa" onClick={() => setSearch('')}><X size={15}/></button> : <kbd>Ctrl K</kbd>}</div>
            <div className="topbar-actions"><Tooltip label="Versão interativa com mensagens de exemplo. Sem conexão a provedores."><button className="demo-badge" onClick={() => setModal('about')}><FlaskConical size={12}/><span>Demonstração</span></button></Tooltip><IconButton icon={RefreshCw} label={syncing ? 'Atualizando demonstração' : 'Atualizar demonstração'} className={syncing ? 'spin-icon' : ''} onClick={sync} disabled={syncing}/><div className="popover-anchor"><IconButton icon={Bell} label="Central de notificações" className={notices.some(n => !n.read) ? 'has-notification' : ''} data-popover-trigger aria-expanded={popover === 'notifications'} onClick={() => setPopover(p => p === 'notifications' ? null : 'notifications')}/>{popover === 'notifications' && <Popover className="notifications-popover" onClose={() => setPopover(null)}><div className="popover-header"><h3>Notificações</h3>{notices.length > 0 && <button className="text-button" onClick={() => setNotices(ns => ns.map(n => ({ ...n, read: true })))}>Marcar lidas</button>}</div>{notices.length ? <div className="notices-list">{notices.map(n => <button key={n.id} className={`notice-row ${n.read ? '' : 'unread'}`} onClick={() => { const m = messages.find(m => m.id === n.id); if (m) { navigate('inbox'); openMessage(m); } setNotices(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x)); setPopover(null); }}><span className="notice-symbol"><Mail size={17}/></span><span><strong>{n.title}</strong><p>{n.description}</p><small>{n.account} · {formatTime(n.date)}</small></span>{!n.read && <i/>}</button>)}</div> : <div className="notice-empty"><Bell size={26}/><strong>Tudo em dia por aqui</strong><p>Os próximos recebimentos de teste aparecerão aqui.</p></div>}<button className="notification-test" onClick={() => { receiveMessage(); setPopover(null); }}><Plus size={15}/> Receber e-mail de teste</button></Popover>}</div><IconButton icon={Settings} label="Preferências" onClick={() => setModal('settings')}/></div>
          </div>
          <div className="page-heading"><div><div className="title-line"><h1>{folder === 'inbox' ? account === 'all' ? 'Caixa de entrada' : accountById(account).name : FOLDERS[folder]}</h1><span className="soft-pill">{account === 'all' ? 'Visão unificada' : 'Conta selecionada'}</span></div><p>{folder === 'inbox' ? account === 'all' ? 'Todas as suas contas, em um só lugar.' : accountById(account).email : folder === 'sent' ? 'Suas mensagens enviadas na demonstração.' : folder === 'drafts' ? 'Suas ideias ficam salvas até a hora de continuar.' : folder === 'trash' ? 'Mensagens excluídas. Você pode restaurá-las.' : 'Um pouco mais de organização para o seu dia.'}</p></div><Tooltip label="Simular uma nova mensagem e testar os avisos de recebimento"><button className="receive-button" onClick={receiveMessage}><Plus size={15}/><span>Receber exemplo</span></button></Tooltip></div>
          <div className="stats-grid" aria-label="Resumo dos e-mails"><button className={`stat-card mint ${tab === 'unread' ? 'stat-active' : ''}`} onClick={() => { setFolder('inbox'); setTab(tab === 'unread' ? 'all' : 'unread'); }}><span className="stat-icon"><Mail size={20}/></span><span><small>Não lidas</small><strong>{stats.unread}</strong></span><ArrowUpRight size={15} className="stat-arrow"/></button><button className="stat-card peach" onClick={() => { setFolder('starred'); setTab('all'); }}><span className="stat-icon"><Star size={20}/></span><span><small>Favoritos</small><strong>{stats.starred}</strong></span><ArrowUpRight size={15} className="stat-arrow"/></button><button className={`stat-card blue ${attachmentsOnly ? 'stat-active' : ''}`} onClick={() => { setFolder('inbox'); setAttachmentsOnly(v => !v); }}><span className="stat-icon"><Paperclip size={20}/></span><span><small>Com anexos</small><strong>{stats.attachments}</strong></span><ArrowUpRight size={15} className="stat-arrow"/></button><button className="stat-card lavender" onClick={() => setModal('accounts')}><span className="stat-icon"><LayoutGrid size={20}/></span><span><small>Contas reunidas</small><strong>10<span className="stat-fraction">/10</span></strong></span><span className="tiny-dot"/></button></div>
        </header>

        {storageWarning && <div className="storage-warning" role="alert"><CircleAlert size={15}/> O armazenamento está cheio. As últimas alterações estão apenas nesta sessão. Remova anexos grandes para liberar espaço.</div>}
        <section className={`mail-workspace ${mobileReader ? 'show-reader' : ''} ${settings.density === 'compact' ? 'compact' : ''}`} style={{ '--list-width': `${listWidth}px` }} aria-label="Mensagens e leitura">
          <section className="message-list-panel" aria-label="Lista de mensagens">
            <div className="list-header"><div className="list-title"><h2>{search ? 'Resultados da busca' : account === 'all' ? FOLDERS[folder] : accountById(account).name}</h2><span>{visible.length}</span></div><div className="list-header-actions"><Tooltip label={allChecked ? 'Desmarcar todas' : 'Selecionar todas as mensagens visíveis'}><input type="checkbox" aria-label="Selecionar todas as mensagens" checked={allChecked} onChange={() => setChecked(allChecked ? [] : visible.map(m => m.id))}/></Tooltip><div className="popover-anchor"><IconButton icon={SlidersHorizontal} label="Filtrar e ordenar" data-popover-trigger className={attachmentsOnly || sort === 'oldest' ? 'filter-active' : ''} onClick={() => setPopover(p => p === 'filters' ? null : 'filters')} aria-expanded={popover === 'filters'}/>{popover === 'filters' && <Popover className="filter-popover" onClose={() => setPopover(null)}><h3>Refinar sua caixa</h3><label className="filter-check"><input type="checkbox" checked={attachmentsOnly} onChange={e => setAttachmentsOnly(e.target.checked)}/><Paperclip size={15}/> Somente com anexos</label><label className="field-label">Ordenar por<select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Mais recentes primeiro</option><option value="oldest">Mais antigas primeiro</option></select></label><button className="text-button" onClick={() => { setAttachmentsOnly(false); setSort('newest'); setTab('all'); }}>Limpar filtros</button></Popover>}</div></div></div>
            {checked.length ? <div className="bulk-toolbar"><span><b>{checked.length}</b> selecionada{checked.length > 1 ? 's' : ''}</span><div><IconButton icon={MailOpen} label="Marcar seleção como lida" onClick={() => markRead(checked, true)}/>{folder !== 'archive' && <IconButton icon={Archive} label="Arquivar seleção" onClick={() => moveMessages(checked, 'archive')}/>}<IconButton icon={Trash2} label={folder === 'trash' ? 'Excluir seleção definitivamente' : 'Excluir seleção'} onClick={() => folder === 'trash' ? setDeleteIds(checked) : moveMessages(checked, 'trash')}/><IconButton icon={X} label="Cancelar seleção" onClick={() => setChecked([])}/></div></div> : <div className="list-tabs" role="tablist" aria-label="Exibir mensagens">{[['all', 'Todas'], ['unread', 'Não lidas'], ['starred', 'Favoritas']].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}{key === 'unread' && stats.unread > 0 && <span>{stats.unread}</span>}</button>)}</div>}
            {attachmentsOnly && <div className="active-filter"><Paperclip size={12}/> Com anexos<button aria-label="Remover filtro de anexos" onClick={() => setAttachmentsOnly(false)}><X size={12}/></button></div>}
            <div className="messages-scroll" role="list">
              {visible.length ? visible.map(m => { const a = accountById(m.accountId); return <div key={m.id} id={`row-${m.id}`} role="listitem" className={`email-row ${selectedId === m.id ? 'selected' : ''} ${!m.read ? 'unread' : ''} ${checked.includes(m.id) ? 'checked' : ''}`}>
                <div className="row-selector"><span className={`unread-dot ${m.read ? 'read-dot' : ''}`}/><input type="checkbox" checked={checked.includes(m.id)} aria-label={`Selecionar ${m.subject}`} onChange={e => setChecked(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))}/></div>
                <button className="message-open" onClick={() => openMessage(m)} aria-label={`${m.read ? '' : 'Não lida. '}${m.sender}: ${m.subject}. Conta ${a.name}`} aria-current={selectedId === m.id ? 'true' : undefined}><span className="sender-avatar" style={{ '--avatar-color': a.tone, '--avatar-ink': a.color }}>{initials(m.sender)}</span><span className="message-summary"><span className="message-top"><strong>{m.folder === 'sent' ? `Para: ${m.to}` : m.sender}</strong><time dateTime={new Date(m.date).toISOString()}>{formatTime(m.date)}</time></span><span className="message-subject">{m.subject}</span><span className="message-preview">{m.body.replace(/\n+/g, ' ')}</span><span className="message-bottom"><AccountTag account={a}/><span className="message-indicators">{m.folder === 'drafts' && <span className="draft-label">Rascunho</span>}{m.attachments.length > 0 && <Paperclip size={12}/>}</span></span></span></button>
                <Tooltip label={m.starred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><button className={`row-star ${m.starred ? 'starred' : ''}`} aria-label={m.starred ? `Remover ${m.subject} dos favoritos` : `Favoritar ${m.subject}`} aria-pressed={m.starred} onClick={() => toggleStar(m.id)}><Star size={15} fill={m.starred ? 'currentColor' : 'none'}/></button></Tooltip>
              </div>; }) : <div className="empty-state"><span className="empty-illustration">{search ? <Search size={33}/> : folder === 'trash' ? <Trash2 size={33}/> : <Inbox size={33}/>}</span><h3>{search ? 'Nenhuma mensagem encontrada' : folder === 'drafts' ? 'Nenhum rascunho por aqui' : folder === 'trash' ? 'Sua lixeira está vazia' : 'Tudo tranquilo por aqui'}</h3><p>{search ? `Não encontramos resultados para “${search}”. Tente outro termo ou outra conta.` : attachmentsOnly || tab !== 'all' ? 'Nenhuma mensagem corresponde aos filtros selecionados.' : 'As mensagens desta pasta aparecerão aqui.'}</p>{(search || attachmentsOnly || tab !== 'all') && <button className="secondary-button" onClick={() => { setSearch(''); setAttachmentsOnly(false); setTab('all'); }}>Limpar busca e filtros</button>}</div>}
            </div>
            <footer className="list-footer"><span><i/> {visible.length} {visible.length === 1 ? 'mensagem' : 'mensagens'}</span><Tooltip label="Use as setas do teclado para navegar"><span tabIndex={0}><ArrowUp size={11}/><ArrowDown size={11}/> para navegar</span></Tooltip></footer>
          </section>

          <div className="pane-resizer" role="separator" aria-label="Ajustar largura da lista" aria-orientation="vertical" aria-valuenow={listWidth} aria-valuemin={320} aria-valuemax={540} tabIndex={0} onPointerDown={startResize} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); setListWidth(v => Math.max(320, Math.min(540, v + (e.key === 'ArrowRight' ? 20 : -20)))); } }}><span/></div>

          <section className="reader-panel" aria-label="Leitura da mensagem">
            {selected ? <>
              <div className="reader-toolbar"><div className="reader-back"><IconButton icon={ArrowLeft} label="Voltar à lista" onClick={() => setMobileReader(false)}/></div><div className="reader-primary-actions">{selected.folder === 'trash' ? <button className="toolbar-action" onClick={() => moveMessages([selected.id], selected.previousFolder || 'inbox')}><Undo2 size={17}/><span>Restaurar</span></button> : selected.folder === 'drafts' ? <button className="toolbar-action" onClick={() => openMessage(selected)}><Pencil size={17}/><span>Editar rascunho</span></button> : <Tooltip label="Arquivar a mensagem" shortcut="E"><button className="toolbar-action" onClick={() => moveMessages([selected.id], selected.folder === 'archive' ? 'inbox' : 'archive')}><Archive size={17}/><span>{selected.folder === 'archive' ? 'Desarquivar' : 'Arquivar'}</span></button></Tooltip>}<span className="toolbar-divider"/><IconButton icon={Trash2} label={selected.folder === 'trash' ? 'Excluir definitivamente' : 'Mover para a lixeira'} onClick={() => selected.folder === 'trash' ? setDeleteIds([selected.id]) : moveMessages([selected.id], 'trash')}/><IconButton icon={selected.read ? Mail : MailOpen} label={selected.read ? 'Marcar como não lida' : 'Marcar como lida'} onClick={() => markRead([selected.id], !selected.read)}/><IconButton icon={Star} label={selected.starred ? 'Remover dos favoritos' : 'Favoritar mensagem'} className={selected.starred ? 'starred' : ''} onClick={() => toggleStar(selected.id)}/></div><div className="reader-navigation"><span>{visible.findIndex(m => m.id === selected.id) + 1} de {visible.length}</span><IconButton icon={ChevronLeft} label="Mensagem anterior" disabled={visible.findIndex(m => m.id === selected.id) === 0} onClick={() => openMessage(visible[visible.findIndex(m => m.id === selected.id) - 1])}/><IconButton icon={ChevronRight} label="Próxima mensagem" disabled={visible.findIndex(m => m.id === selected.id) === visible.length - 1} onClick={() => openMessage(visible[visible.findIndex(m => m.id === selected.id) + 1])}/></div></div>
              <div className="reader-scroll"><div className="message-meta-path"><AccountTag account={currentAccount}/><ChevronRight size={11}/><span>{selected.folder === 'inbox' ? 'Caixa de entrada' : FOLDERS[selected.folder]}</span>{selected.starred && <span className="favorite-note"><Star size={11} fill="currentColor"/> Favorita</span>}</div>
                <h2 className="reader-subject">{selected.subject}</h2>
                <div className="sender-details"><div className="sender-avatar large" style={{ '--avatar-color': currentAccount.tone, '--avatar-ink': currentAccount.color }}>{initials(selected.sender)}</div><div className="sender-identity"><strong>{selected.sender}</strong><span>{selected.from}</span></div><div className="sender-actions"><div>{!['sent', 'drafts', 'trash'].includes(selected.folder) && <IconButton icon={Reply} label="Responder" shortcut="R" onClick={() => replyRef.current?.focus()}/>}<IconButton icon={Forward} label="Encaminhar mensagem" onClick={forward}/></div><time dateTime={new Date(selected.date).toISOString()} title={new Date(selected.date).toLocaleString('pt-BR')}>{formatTime(selected.date)}<span> · {new Date(selected.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span></time></div></div>
                <div className="recipient-line"><span>Para:</span> {selected.to}{selected.cc && <span className="cc-line"> · Cc: {selected.cc}</span>}<Tooltip label={`Recebida pela identidade ${currentAccount.name}: ${currentAccount.email}`}><Info size={12}/></Tooltip></div>
                <RichMessageBody message={selected}/>
                {selected.attachments.length > 0 && <div className="attachments-section"><div className="attachment-heading"><Paperclip size={13}/>{selected.attachments.length} anexo{selected.attachments.length > 1 ? 's' : ''}</div><div className="attachments-grid">{selected.attachments.map(file => <Attachment file={file} key={file.id} notify={notify}/>)}</div></div>}
                {!['trash', 'drafts', 'sent'].includes(selected.folder) ? <form className="reply-box" onSubmit={sendReply} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); e.currentTarget.requestSubmit(); } }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, 'reply'); }}><div className="reply-top"><span><Reply size={15}/> Resposta rápida</span><label><span>Responder como</span><select aria-label="Conta para responder" value={replyAccount} onChange={e => setReplyAccount(e.target.value)}>{accounts.map(a => <option value={a.id} key={a.id}>{a.name} · {a.email}</option>)}</select></label></div>{replyAccount !== selected.accountId && <p className="identity-warning"><Info size={13}/> Você escolheu uma conta diferente da que recebeu este e-mail.</p>}<RichTextEditor key={selected.id} compact ref={replyRef} label="Texto da resposta" placeholder="Escreva sua resposta..." value={replyValue} onChange={next => setReplyDrafts(d => ({ ...d, [selected.id]: next }))} onAttach={() => replyFileRef.current?.click()} notify={notify} footerStart={<button className="primary-button" type="submit"><Send size={15}/> Enviar</button>}>{(replyFiles[selected.id] || []).map(file => <Attachment file={file} key={file.id} onRemove={() => setReplyFiles(f => ({ ...f, [selected.id]: f[selected.id].filter(x => x.id !== file.id) }))}/>)}</RichTextEditor><input hidden type="file" multiple ref={replyFileRef} onChange={e => addFiles(e.target.files, 'reply')}/><div className="reply-demo"><FlaskConical size={10}/> Modo demonstração · a resposta será salva localmente.</div></form> : selected.folder === 'drafts' && <button className="primary-button edit-draft" onClick={() => openMessage(selected)}><Pencil size={15}/> Continuar escrevendo</button>}
              </div>
            </> : <div className="reader-empty"><div className="empty-orbit"><Mail size={39}/><span><Check size={12}/></span></div><h2>Um espaço para cada conversa.</h2><p>Selecione uma mensagem para ler,<br/>responder ou organizar por aqui.</p><span className="empty-shortcut"><kbd>N</kbd> para escrever algo novo</span></div>}
          </section>
        </section>
        <footer className="workspace-footer"><span><ShieldCheck size={12}/> {lastSync ? `Atualizado às ${formatTime(lastSync)}` : 'Seus dados ficam neste navegador'}<span className="footer-separator">·</span><span className="footer-demo">Nenhum provedor conectado</span></span><button onClick={() => setModal('help')}><Keyboard size={13}/> Atalhos e ajuda <kbd>?</kbd></button></footer>
      </main>
    </div>

    {modal === 'settings' && <Modal title="Do seu jeito" subtitle="Pequenos ajustes, uma experiência mais sua." icon={Settings} onClose={() => setModal(null)} className="settings-modal"><section className="settings-section"><h3>Aparência</h3><div className="theme-options">{[['light', Sun, 'Claro', 'Leve e espaçoso'], ['dark', Moon, 'Escuro', 'Conforto para os olhos']].map(([value, Icon, title, sub]) => <button className={`theme-option ${settings.theme === value ? 'selected' : ''}`} key={value} onClick={() => updateSetting('theme', value)}><span className={`theme-preview ${value}`}><i/><i/><i/></span><span><Icon size={15}/><strong>{title}</strong>{settings.theme === value && <CheckCircle2 size={15}/>}</span><small>{sub}</small></button>)}</div><label className="setting-select"><span><strong>Densidade da lista</strong><small>Escolha quanto quer ver em cada linha.</small></span><select value={settings.density} onChange={e => updateSetting('density', e.target.value)}><option value="comfortable">Confortável</option><option value="compact">Compacta</option></select></label></section><section className="settings-section"><h3>Notificações</h3><Toggle title="Avisos dentro do aplicativo" description="Mostre um aviso quando uma mensagem de teste chegar." checked={settings.notifications} onChange={v => updateSetting('notifications', v)} icon={Bell}/><Toggle title="Som de recebimento" description="Um toque discreto para acompanhar as novidades." checked={settings.sound} onChange={v => updateSetting('sound', v)} icon={Volume2}/><Toggle title="Recebimentos automáticos de teste" description="Receba uma mensagem de exemplo a cada 45 segundos, com a página aberta." checked={settings.autoReceive} onChange={v => updateSetting('autoReceive', v)} icon={Clock3}/><button className="secondary-button browser-notification" onClick={requestNotifications}><Bell size={15}/> Ativar avisos do navegador<ArrowUpRight size={14}/></button></section><div className="settings-note"><Info size={15}/><p>Estas preferências são salvas neste navegador. As dez contas e todas as mensagens são demonstrativas.</p></div></Modal>}

    {modal === 'accounts' && <AccountsModal accounts={accounts} messages={messages} onClose={() => setModal(null)} onSave={next => { setAccounts(next); setModal(null); notify('Identidades atualizadas', 'A personalização foi salva. Isso não conecta contas reais.'); }} onAbout={() => setModal('about')}/>}

    {modal === 'about' && <Modal title="Sua central de e-mails" subtitle="Uma interface pronta para evoluir com seu projeto." icon={Mail} onClose={() => setModal(null)} className="about-modal"><div className="about-hero"><span><FlaskConical size={28}/></span><h3>Experimente sem conectar suas contas.</h3><p>Esta versão usa mensagens de exemplo para você testar os fluxos, os avisos e a organização das dez identidades.</p></div><div className="about-grid"><div><CheckCircle2 size={17}/><span><strong>Funciona agora</strong><p>Busca, filtros, favoritos, anexos locais, rascunhos, respostas de teste, lixeira e notificações.</p></span></div><div><CloudOff size={17}/><span><strong>Para receber e enviar e-mails reais</strong><p>É preciso um servidor com autenticação dos provedores, como Google e Microsoft, ou integração IMAP/SMTP. Esta tela não solicita senhas.</p></span></div><div><ShieldCheck size={17}/><span><strong>Persistência local</strong><p>As alterações ficam apenas neste navegador. Elas não são sincronizadas entre dispositivos e são perdidas se os dados do site forem apagados.</p></span></div></div><button className="primary-button wide" onClick={() => { setModal(null); receiveMessage(); }}><Plus size={16}/> Testar um recebimento</button></Modal>}

    {modal === 'help' && <Modal title="Menos cliques, mais fluidez" subtitle="Atalhos para organizar seu dia com facilidade." icon={Keyboard} onClose={() => setModal(null)} className="help-modal"><div className="shortcut-list">{[['Pesquisar e-mails', 'Ctrl / ⌘ + K'], ['Nova mensagem', 'N'], ['Responder à mensagem aberta', 'R'], ['Arquivar mensagem', 'E'], ['Navegar entre mensagens', '↑ / ↓'], ['Enviar resposta de teste', 'Ctrl / ⌘ + Enter'], ['Fechar janela ou voltar à lista', 'Esc'], ['Abrir esta ajuda', '?']].map(([label, shortcut]) => <div key={label}><span>{label}</span><kbd>{shortcut}</kbd></div>)}</div><div className="help-tip"><Info size={18}/><p>Arraste a divisória entre a lista e a leitura para ajustar o espaço. Passe o mouse sobre os ícones para descobrir cada ação.</p></div><button className="secondary-button wide" onClick={() => setModal('about')}>Entender o modo demonstração<ArrowUpRight size={14}/></button></Modal>}

    {compose && <Modal title={compose.id ? 'Continuar rascunho' : 'Nova mensagem'} subtitle="Uma boa conversa começa por aqui." icon={Pencil} onClose={() => { if (!sending) saveDraft(); }} className={`compose-modal ${composeExpanded ? 'is-expanded' : ''}`} headerActions={<IconButton icon={composeExpanded ? Minimize2 : Maximize2} label={composeExpanded ? 'Restaurar tamanho da janela' : 'Expandir janela de mensagem'} onClick={() => setComposeExpanded(v => !v)}/>}><form onSubmit={sendCompose} className="compose-form" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); e.currentTarget.requestSubmit(); } }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, 'compose'); }}><div className="compose-demo"><FlaskConical size={14}/><span>Modo demonstração. Nenhum e-mail será enviado.</span></div><label className="compose-field"><span>De</span><select aria-label="Conta remetente" value={compose.accountId} disabled={sending} onChange={e => setCompose(c => ({ ...c, accountId: e.target.value }))}>{accounts.map(a => <option value={a.id} key={a.id}>{a.name} · {a.email}</option>)}</select></label><div className="compose-field"><label htmlFor="compose-to">Para</label><input id="compose-to" value={compose.to} onChange={e => setCompose(c => ({ ...c, to: e.target.value }))} placeholder="nome@exemplo.com" disabled={sending}/><button className="text-button" type="button" onClick={() => setCcVisible(v => !v)} aria-expanded={ccVisible}>Cc / Cco</button></div>{ccVisible && <>{[['cc', 'Cc'], ['bcc', 'Cco']].map(([key, label]) => <label key={key} className="compose-field"><span>{label}</span><input value={compose[key]} onChange={e => setCompose(c => ({ ...c, [key]: e.target.value }))} placeholder="Separe os endereços por vírgula" disabled={sending}/></label>)}</>}<label className="compose-field"><span>Assunto</span><input value={compose.subject} onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))} placeholder="Sobre o que vamos conversar?" disabled={sending}/></label><RichTextEditor value={compose} onChange={next => setCompose(c => ({ ...c, ...next }))} disabled={sending} onAttach={() => composeFileRef.current?.click()} notify={notify} footerStart={<button className="primary-button" type="submit" disabled={sending}>{sending ? <RefreshCw size={15} className="spin"/> : <Send size={15}/>} {sending ? 'Salvando...' : 'Enviar'}<kbd>Ctrl ↵</kbd></button>} footerEnd={<><button className="text-button rich-save-draft" type="button" onClick={saveDraft} disabled={sending}><FileText size={14}/><span>Salvar rascunho</span></button><IconButton icon={Trash2} label="Descartar esta composição" disabled={sending} onClick={() => { const id = compose.id; if (id) moveMessages([id], 'trash'); setCompose(null); if (!id) notify('Composição descartada'); }}/></>}>{compose.attachments.length > 0 && <div className="compose-attachments">{compose.attachments.map(file => <Attachment file={file} key={file.id} onRemove={() => setCompose(c => ({ ...c, attachments: c.attachments.filter(f => f.id !== file.id) }))}/>)}</div>}{composeError && <p className="form-error" role="alert"><CircleAlert size={15}/>{composeError}</p>}</RichTextEditor><input hidden type="file" multiple ref={composeFileRef} onChange={e => addFiles(e.target.files, 'compose')}/></form></Modal>}

    {deleteIds && <Modal title="Excluir definitivamente?" subtitle="Esta ação remove as mensagens desta demonstração." icon={Trash2} onClose={() => setDeleteIds(null)} className="confirm-modal"><p className="confirm-text">{deleteIds.length === 1 ? 'A mensagem será removida' : `As ${deleteIds.length} mensagens serão removidas`} do armazenamento local. Não será possível desfazer esta ação.</p><div className="confirm-actions"><button className="secondary-button" onClick={() => setDeleteIds(null)}>Cancelar</button><button className="danger-button" onClick={() => { setMessages(items => items.filter(m => !deleteIds.includes(m.id))); setChecked([]); setDeleteIds(null); notify('Exclusão concluída', 'As mensagens de demonstração foram removidas.'); }}>Excluir definitivamente</button></div></Modal>}

    <div className="toast-container" role="status" aria-live="polite" aria-atomic="false">{toasts.map(item => <Toast key={item.id} item={item} remove={removeToast}/>)}</div>
  </>;
}

function Toggle({ title, description, checked, onChange, icon: Icon }) {
  return <label className="toggle-row"><span className="toggle-row-icon"><Icon size={17}/></span><span className="toggle-copy"><strong>{title}</strong><small>{description}</small></span><input className="toggle-input" type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/><span className="toggle-switch" aria-hidden="true"/></label>;
}

function AccountsModal({ accounts, messages, onClose, onSave, onAbout }) {
  const [draft, setDraft] = useState(accounts.map(a => ({ ...a }))); const [error, setError] = useState('');
  const save = e => { e.preventDefault(); if (draft.some(a => !a.name.trim() || !isEmail(a.email))) { setError('Confira os nomes e os endereços. Todas as dez identidades precisam de um e-mail válido.'); return; } if (new Set(draft.map(a => a.email.trim().toLowerCase())).size !== draft.length) { setError('Use um endereço diferente para cada identidade.'); return; } onSave(draft.map(a => ({ ...a, name: a.name.trim(), email: a.email.trim(), initials: a.name.trim()[0].toUpperCase() }))); };
  const update = (id, key, value) => setDraft(as => as.map(a => a.id === id ? { ...a, [key]: value } : a));
  return <Modal title="Suas dez contas" subtitle="Uma cor e uma identidade para cada parte do seu dia." icon={LayoutGrid} onClose={onClose} className="accounts-modal"><div className="account-mode-note"><FlaskConical size={16}/><span>Identidades de demonstração. Editar um endereço não conecta sua caixa de e-mail.</span></div><form onSubmit={save}><div className="account-edit-header"><span>Identidade</span><span>Endereço de e-mail</span><span>Cor</span></div><div className="account-edit-list">{draft.map(a => <div className="account-edit-row" key={a.id}><span className="account-avatar" style={{ background: a.color }}>{a.name[0] || '?'}</span><input aria-label={`Nome da conta ${a.id}`} value={a.name} maxLength={24} onChange={e => update(a.id, 'name', e.target.value)}/><input aria-label={`Endereço da conta ${a.id}`} value={a.email} onChange={e => update(a.id, 'email', e.target.value)}/><Tooltip label={`Escolher cor de ${a.name}`}><input type="color" aria-label={`Cor de ${a.name}`} value={a.color} onChange={e => update(a.id, 'color', e.target.value)}/></Tooltip></div>)}</div>{error && <p className="form-error" role="alert"><CircleAlert size={15}/>{error}</p>}<div className="account-edit-footer"><button type="button" className="text-button" onClick={onAbout}><CircleHelp size={15}/> Como conectar contas reais?</button><button className="primary-button" type="submit"><Check size={15}/> Salvar alterações</button></div></form></Modal>;
}
