/**
 * Lightweight, offline-safe Markdown parser for parsing AI responses
 */
export function parseMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Escape HTML to prevent XSS
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // Horizontal rules (---)
    html = html.replace(/^---$/gm, '<hr style="border:0; border-top:1px solid var(--border); margin:1rem 0;"/>');
    
    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3 style="margin-top:1rem; margin-bottom:0.5rem; color:var(--text-main); font-weight:600;">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="margin-top:1.25rem; margin-bottom:0.6rem; color:var(--text-main); font-weight:700;">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 style="margin-top:1.5rem; margin-bottom:0.75rem; color:var(--text-main); font-weight:800;">$1</h1>');
    
    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Inline code (`code`)
    html = html.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-family:monospace;">$1</code>');
    
    // List items (* item or - item)
    html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li style="margin-left:1.5rem; margin-bottom:0.25rem; list-style-type:disc;">$1</li>');
    
    // Wrap consecutive <li> items in <ul>
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/gs, '<ul style="margin: 0.5rem 0; padding-left: 0;">$1</ul>');
    
    // Clean up newlines after block tags to avoid extra spacing
    html = html.replace(/<\/li>\n/g, '</li>');
    html = html.replace(/<\/ul>\n/g, '</ul>');
    html = html.replace(/<\/h3>\n/g, '</h3>');
    html = html.replace(/<\/h2>\n/g, '</h2>');
    html = html.replace(/<\/h1>\n/g, '</h1>');
    html = html.replace(/<hr\s*[^>]*>\n/g, (match) => match.trim());
    
    // Convert newlines to br
    html = html.replace(/\n/g, '<br>');
    
    // Clean up duplicate br
    html = html.replace(/(<br>){2,}/g, '<br><br>');
    
    return html;
}
