import createDOMPurify from 'dompurify';

export const MAIL_FONTS = [
  ['Arial', 'Sans Serif'], ['Georgia', 'Georgia'], ['Times New Roman', 'Times New Roman'],
  ['Verdana', 'Verdana'], ['Trebuchet MS', 'Trebuchet'], ['Courier New', 'Monoespaçada'],
];
export const MAIL_FONT_SIZES = [10, 12, 14, 16, 18, 24, 32, 48];
const purifiers = new WeakMap();
const raster = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\r\n]+$/i;

export function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function plainTextToHtml(text = '') {
  if (!text) return '<p></p>';
  return String(text).split(/\n\n/).map(part => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('');
}

export function normalizeLink(value = '') {
  const input = String(value).trim();
  if (!input || /[\s\u0000-\u001f\u007f]/.test(input)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`);
    if (['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password) return url.href;
    if (url.protocol === 'mailto:' && /^[^@/?]+@[^@/?]+\.[^@/?]+$/.test(url.pathname)) return url.href;
  } catch { /* Invalid destinations are never inserted. */ }
  return null;
}

function allowedStyle(node) {
  const result = [];
  const style = node.style;
  if (!style) return '';
  const font = style.fontFamily.replace(/["']/g, '').trim();
  if (MAIL_FONTS.some(([name]) => name.toLowerCase() === font.toLowerCase())) result.push(`font-family: ${font}`);
  if (/^\d+(?:\.\d+)?px$/.test(style.fontSize) && parseFloat(style.fontSize) >= 8 && parseFloat(style.fontSize) <= 72) result.push(`font-size: ${style.fontSize}`);
  for (const property of ['color', 'background-color']) {
    const value = style.getPropertyValue(property);
    if (/^(?:#[a-f\d]{3,8}|rgba?\([\d\s,./%]+\)|[a-z]{1,24})$/i.test(value)) result.push(`${property}: ${value}`);
  }
  if (['left', 'center', 'right', 'justify'].includes(style.textAlign)) result.push(`text-align: ${style.textAlign}`);
  if (/^\d+px$/.test(style.marginLeft) && parseInt(style.marginLeft) <= 144) result.push(`margin-left: ${style.marginLeft}`);
  return result.join('; ');
}

export function sanitizeRichHtml(html = '', win = globalThis.window) {
  if (!html || !win?.document) return '';
  let purifier = purifiers.get(win);
  if (!purifier) {
    purifier = createDOMPurify(win);
    purifier.addHook('uponSanitizeElement', node => {
      if (node.nodeName === 'IMG') {
        const src = node.getAttribute('src') || '';
        if (!raster.test(src) || src.length > 1500000) node.remove();
      }
    });
    purifier.addHook('uponSanitizeAttribute', (node, data) => {
      if (data.attrName === 'style') {
        data.attrValue = allowedStyle(node);
        if (!data.attrValue) data.keepAttr = false;
      }
      if (data.attrName === 'href') {
        const href = normalizeLink(data.attrValue);
        if (!href) data.keepAttr = false;
        else data.attrValue = href;
      }
    });
    purifier.addHook('afterSanitizeAttributes', node => {
      if (node.nodeName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    purifiers.set(win, purifier);
  }
  return purifier.sanitize(String(html), {
    ALLOWED_TAGS: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr'],
    ALLOWED_ATTR: ['style', 'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|data:image\/(?:png|jpeg|gif|webp);base64,)/i,
  });
}

export function hasRichContent(text = '', html = '', win = globalThis.window) {
  return !!String(text).trim() || /<img\b/i.test(sanitizeRichHtml(html, win));
}

export function messageHtml(message, win = globalThis.window) {
  return sanitizeRichHtml(message.bodyHtml || plainTextToHtml(message.body), win);
}
