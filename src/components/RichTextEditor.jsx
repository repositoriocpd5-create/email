import React, { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Baseline, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, IndentDecrease, IndentIncrease, Eraser, ChevronDown, CaseSensitive, Paperclip, Link2, Smile, ImagePlus, PenLine, X, Check, ExternalLink, Quote } from 'lucide-react';
import { Tooltip } from './Tooltip.jsx';
import { MAIL_FONTS, MAIL_FONT_SIZES, sanitizeRichHtml, plainTextToHtml, normalizeLink } from '../rich-text.js';

const COLORS = ['#202939', '#64748b', '#94a3b8', '#ffffff', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#c026d3', '#e11d48', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe'];
const EMOJIS = ['😊', '🙂', '😀', '😉', '😍', '🤔', '👏', '👍', '🙌', '🤝', '🙏', '💪', '❤️', '💙', '✨', '🎉', '✅', '📌', '📅', '📎', '📚', '💻', '☕', '🌟'];

const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',
  addGlobalAttributes() {
    return [{ types: ['paragraph'], attributes: { indent: {
      default: 0,
      parseHTML: element => Math.min(6, Math.max(0, Math.round((parseInt(element.style.marginLeft) || 0) / 24))),
      renderHTML: attributes => attributes.indent ? { style: `margin-left: ${Math.min(6, Math.max(0, attributes.indent)) * 24}px` } : {},
    } } }];
  },
});

function Tool({ icon: Icon, label, shortcut, active = false, disabled = false, onClick, children, ...props }) {
  return <Tooltip label={label} shortcut={shortcut}><button type="button" className={`rich-tool ${active ? 'active' : ''}`} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onClick} {...props}>{Icon && <Icon size={16} strokeWidth={1.8}/>} {children}</button></Tooltip>;
}

const RichTextEditor = forwardRef(function RichTextEditor({ value, onChange, label = 'Corpo da mensagem', placeholder = 'Escreva sua mensagem...', compact = false, disabled = false, onAttach, footerStart, footerEnd, children, notify }, ref) {
  const [formatVisible, setFormatVisible] = useState(true);
  const [panel, setPanel] = useState(null);
  const [linkUrl, setLinkUrl] = useState(''); const [linkText, setLinkText] = useState(''); const [linkError, setLinkError] = useState('');
  const [signature, setSignature] = useState('Atenciosamente,\nJoe Amado');
  const areaRef = useRef(null); const imageRef = useRef(null); const urlRef = useRef(null); const changeRef = useRef(onChange); const lastEmitted = useRef(null);
  changeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false, link: { openOnClick: false, autolink: false, defaultProtocol: 'https', isAllowedUri: url => !!normalizeLink(url) } }),
      TextStyleKit, TextAlign.configure({ types: ['paragraph'] }), ParagraphIndent,
      Image.configure({ allowBase64: true, HTMLAttributes: { class: 'inline-mail-image' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: sanitizeRichHtml(value?.bodyHtml || plainTextToHtml(value?.body || '')),
    editable: !disabled,
    editorProps: {
      attributes: { class: 'rich-prose', role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', spellcheck: 'true', tabindex: '0' },
      transformPastedHTML: html => sanitizeRichHtml(html),
    },
    onUpdate: ({ editor }) => {
      const next = { body: editor.getText({ blockSeparator: '\n\n' }), bodyHtml: editor.getHTML() };
      lastEmitted.current = next; changeRef.current(next);
    },
  });

  const state = useEditorState({ editor, selector: ({ editor: e }) => e ? ({
    bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
    bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), quote: e.isActive('blockquote'), link: e.isActive('link'),
    family: e.getAttributes('textStyle').fontFamily || 'Arial', size: parseInt(e.getAttributes('textStyle').fontSize) || 14,
    color: e.getAttributes('textStyle').color || '#202939', background: e.getAttributes('textStyle').backgroundColor || '#fde68a',
    align: e.getAttributes('paragraph').textAlign || 'left', indent: e.getAttributes('paragraph').indent || 0,
    undo: e.can().undo(), redo: e.can().redo(), count: e.getText().length,
  }) : null });

  useImperativeHandle(ref, () => ({ focus: () => editor?.commands.focus(), getHtml: () => editor?.getHTML() || '', getText: () => editor?.getText() || '' }), [editor]);

  useEffect(() => {
    if (!editor || (lastEmitted.current?.body === value?.body && lastEmitted.current?.bodyHtml === value?.bodyHtml)) return;
    const html = sanitizeRichHtml(value?.bodyHtml || plainTextToHtml(value?.body || ''));
    if (editor.getHTML() !== html) editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, value?.body, value?.bodyHtml]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (!panel) return;
    const close = event => { if (!areaRef.current?.contains(event.target)) setPanel(null); };
    document.addEventListener('pointerdown', close);
    if (panel === 'link') urlRef.current?.focus();
    return () => document.removeEventListener('pointerdown', close);
  }, [panel]);

  if (!editor || !state) return <div className="rich-loading">Preparando sua mensagem...</div>;
  const run = command => { if (!disabled) command(editor.chain().focus()).run(); };
  const togglePanel = name => {
    if (name === 'link') {
      setLinkUrl(editor.getAttributes('link').href || '');
      const { from, to } = editor.state.selection;
      setLinkText(editor.state.doc.textBetween(from, to, ' ')); setLinkError('');
    }
    setPanel(p => p === name ? null : name);
  };
  const applyLink = () => {
    const href = normalizeLink(linkUrl);
    if (!href) { setLinkError('Informe um endereço https://, http:// ou mailto: válido.'); return; }
    const { from, to } = editor.state.selection;
    const currentText = editor.state.doc.textBetween(from, to, ' ');
    if ((from === to && !editor.isActive('link')) || (linkText && linkText !== currentText)) {
      editor.chain().focus().insertContent({ type: 'text', text: linkText || href, marks: [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }] }).run();
    } else editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setPanel(null);
  };
  const indent = delta => {
    if (editor.isActive('listItem')) run(chain => delta > 0 ? chain.sinkListItem('listItem') : chain.liftListItem('listItem'));
    else run(chain => chain.updateAttributes('paragraph', { indent: Math.max(0, Math.min(6, state.indent + delta)) }));
  };
  const insertImage = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 700 * 1024) {
      notify?.('Escolha outra imagem', 'Use PNG, JPG, WebP ou GIF de até 700 KB.', 'error'); return;
    }
    if (editor.getHTML().length + file.size * 1.4 > 2 * 1024 * 1024) { notify?.('A mensagem está muito grande', 'Reduza as imagens antes de adicionar outra.', 'error'); return; }
    try {
      const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      editor.chain().focus().setImage({ src, alt: file.name }).run(); notify?.('Imagem inserida', 'Ela faz parte do corpo da mensagem.');
    } catch { notify?.('Não foi possível inserir a imagem', 'Tente escolher o arquivo novamente.', 'error'); }
  };
  const alignIcons = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify };
  const AlignIcon = alignIcons[state.align] || AlignLeft;

  return <div className={`rich-editor ${compact ? 'rich-compact' : ''} ${disabled ? 'rich-disabled' : ''}`} ref={areaRef} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); togglePanel('link'); } }}>
    <div className="rich-writing-area"><EditorContent editor={editor}/></div>
    {children}
    <div className="rich-format-area">
      {formatVisible && <div className="rich-toolbar" role="toolbar" aria-label="Formatação da mensagem">
        <span className="rich-tool-group"><Tool icon={Undo2} label="Desfazer edição" shortcut="Ctrl Z" disabled={disabled || !state.undo} onClick={() => run(c => c.undo())}/><Tool icon={Redo2} label="Refazer edição" shortcut="Ctrl Shift Z" disabled={disabled || !state.redo} onClick={() => run(c => c.redo())}/></span>
        <span className="rich-divider"/>
        <label className="rich-font-picker"><span className="sr-only">Fonte do texto</span><select aria-label="Fonte do texto" value={state.family.replace(/["']/g, '')} disabled={disabled} onChange={e => run(c => c.setFontFamily(e.target.value))}>{MAIL_FONTS.map(([font, name]) => <option key={font} value={font} style={{ fontFamily: font }}>{name}</option>)}</select><ChevronDown size={10}/></label>
        <label className="rich-size-picker"><CaseSensitive size={16}/><select aria-label="Tamanho da fonte" value={state.size} disabled={disabled} onChange={e => run(c => c.setFontSize(`${e.target.value}px`))}>{MAIL_FONT_SIZES.map(size => <option value={size} key={size}>{size}</option>)}</select></label>
        <span className="rich-divider"/>
        <span className="rich-tool-group"><Tool icon={Bold} label="Negrito" shortcut="Ctrl B" active={state.bold} disabled={disabled} onClick={() => run(c => c.toggleBold())}/><Tool icon={Italic} label="Itálico" shortcut="Ctrl I" active={state.italic} disabled={disabled} onClick={() => run(c => c.toggleItalic())}/><Tool icon={Underline} label="Sublinhado" shortcut="Ctrl U" active={state.underline} disabled={disabled} onClick={() => run(c => c.toggleUnderline())}/><Tool icon={Strikethrough} label="Tachado" active={state.strike} disabled={disabled} onClick={() => run(c => c.toggleStrike())}/><Tool icon={Baseline} label="Cor do texto" active={panel === 'color'} disabled={disabled} onClick={() => togglePanel('color')}><i className="rich-color-line" style={{ background: state.color }}/></Tool><Tool icon={Highlighter} label="Realçar texto" active={panel === 'highlight'} disabled={disabled} onClick={() => togglePanel('highlight')}/></span>
        <span className="rich-divider"/>
        <span className="rich-tool-group"><Tool icon={AlignIcon} label="Alinhamento do texto" active={panel === 'align'} disabled={disabled} onClick={() => togglePanel('align')}><ChevronDown size={9}/></Tool><Tool icon={ListOrdered} label="Lista numerada" active={state.ordered} disabled={disabled} onClick={() => run(c => c.toggleOrderedList())}/><Tool icon={List} label="Lista com marcadores" active={state.bullet} disabled={disabled} onClick={() => run(c => c.toggleBulletList())}/><Tool icon={IndentDecrease} label="Diminuir recuo" disabled={disabled} onClick={() => indent(-1)}/><Tool icon={IndentIncrease} label="Aumentar recuo" disabled={disabled} onClick={() => indent(1)}/></span>
        <span className="rich-divider"/><Tool icon={Eraser} label="Remover formatação" disabled={disabled} onClick={() => run(c => c.unsetAllMarks().clearNodes().resetAttributes('paragraph', ['textAlign', 'indent']))}/>
      </div>}
      <div className="rich-footer"><div className="rich-footer-primary">{footerStart}<div className="rich-insert-tools" role="toolbar" aria-label="Inserir na mensagem"><Tool icon={CaseSensitive} label={formatVisible ? 'Ocultar opções de formatação' : 'Mostrar opções de formatação'} active={formatVisible} disabled={disabled} onClick={() => { setFormatVisible(v => !v); setPanel(null); }}/>{onAttach && <Tool icon={Paperclip} label="Anexar arquivo" disabled={disabled} onClick={onAttach}/>}<Tool icon={Link2} label="Inserir link" shortcut="Ctrl K" active={state.link || panel === 'link'} disabled={disabled} onClick={() => togglePanel('link')}/><Tool icon={Smile} label="Inserir emoji" active={panel === 'emoji'} disabled={disabled} onClick={() => togglePanel('emoji')}/><Tool icon={ImagePlus} label="Inserir imagem no texto" disabled={disabled} onClick={() => imageRef.current?.click()}/><Tool icon={PenLine} label="Inserir assinatura" active={panel === 'signature'} disabled={disabled} onClick={() => togglePanel('signature')}/></div></div><div className="rich-footer-secondary">{footerEnd}</div></div>
      <div className="rich-editor-caption"><span>Selecione um trecho para formatar</span><span>{state.count.toLocaleString('pt-BR')} caracteres</span></div>
    </div>
    {panel && <div className={`rich-panel rich-panel-${panel}`} role="dialog" aria-label={panel === 'link' ? 'Inserir ou editar link' : panel === 'emoji' ? 'Escolher emoji' : panel === 'align' ? 'Escolher alinhamento' : panel === 'signature' ? 'Sua assinatura' : panel === 'color' ? 'Escolher cor do texto' : 'Escolher cor de realce'} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setPanel(null); editor.commands.focus(); } }}>
      <div className="rich-panel-heading"><strong>{({ link: 'Inserir link', emoji: 'Um toque na conversa', align: 'Alinhamento', signature: 'Sua assinatura', color: 'Cor do texto', highlight: 'Cor de realce' })[panel]}</strong><button type="button" aria-label="Fechar opções de edição" onClick={() => setPanel(null)}><X size={14}/></button></div>
      {['color', 'highlight'].includes(panel) && <><div className="rich-color-grid">{COLORS.map(color => <button type="button" key={color} aria-label={`${panel === 'color' ? 'Cor' : 'Realce'} ${color}`} style={{ background: color }} onMouseDown={e => e.preventDefault()} onClick={() => { run(c => panel === 'color' ? c.setColor(color) : c.setBackgroundColor(color)); setPanel(null); }}>{(panel === 'color' ? state.color : state.background) === color && <Check size={12} style={{ color: ['#ffffff', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe'].includes(color) ? '#263449' : '#fff' }}/>}</button>)}</div><button type="button" className="rich-panel-reset" onClick={() => { run(c => panel === 'color' ? c.unsetColor() : c.unsetBackgroundColor()); setPanel(null); }}>Restaurar padrão</button></>}
      {panel === 'align' && <div className="rich-alignment-options">{[['left', AlignLeft, 'Alinhar à esquerda'], ['center', AlignCenter, 'Centralizar'], ['right', AlignRight, 'Alinhar à direita'], ['justify', AlignJustify, 'Justificar']].map(([value, Icon, name]) => <button type="button" key={value} aria-label={name} aria-pressed={state.align === value} className={state.align === value ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => { run(c => c.setTextAlign(value)); setPanel(null); }}><Icon size={17}/><span>{name}</span>{state.align === value && <Check size={13}/>}</button>)}<button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { run(c => c.toggleBlockquote()); setPanel(null); }}><Quote size={17}/><span>{state.quote ? 'Remover citação' : 'Inserir citação'}</span></button></div>}
      {panel === 'emoji' && <div className="rich-emoji-grid">{EMOJIS.map(emoji => <button type="button" aria-label={`Inserir emoji ${emoji}`} key={emoji} onMouseDown={e => e.preventDefault()} onClick={() => { run(c => c.insertContent({ type: 'text', text: emoji })); setPanel(null); }}>{emoji}</button>)}</div>}
      {panel === 'link' && <div className="rich-link-fields"><label>Texto exibido<input aria-label="Texto exibido no link" value={linkText} placeholder="Ex.: Acessar documento" onChange={e => setLinkText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}/></label><label>Endereço do link<div><Link2 size={14}/><input aria-label="Endereço do link" ref={urlRef} value={linkUrl} placeholder="https://exemplo.com" onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}/></div></label>{linkError && <p className="rich-field-error" role="alert">{linkError}</p>}<div className="rich-panel-actions">{state.link && <button type="button" className="text-button" onClick={() => { run(c => c.extendMarkRange('link').unsetLink()); setPanel(null); }}>Remover link</button>}<button type="button" className="primary-button" onClick={applyLink}><Check size={13}/> Aplicar link</button></div></div>}
      {panel === 'signature' && <div className="rich-signature-fields"><label>Personalize sua assinatura<textarea aria-label="Texto da assinatura" value={signature} onChange={e => setSignature(e.target.value)} rows={3}/></label><button type="button" className="primary-button wide" disabled={!signature.trim()} onClick={() => { run(c => c.insertContent(plainTextToHtml(`\n\n${signature}`))); setPanel(null); }}><PenLine size={14}/> Adicionar à mensagem</button></div>}
    </div>}
    <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" ref={imageRef} onChange={insertImage}/>
  </div>;
});

export default RichTextEditor;
