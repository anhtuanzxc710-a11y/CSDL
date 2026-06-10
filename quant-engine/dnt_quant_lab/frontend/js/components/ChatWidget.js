// ─── components/ChatWidget.js ─── Global Floating Chatbox ───
import { AppState }      from '../state.js';
import { ChatService } from '../services/chatService.js';

let _chatOpen = false;

export async function initChatWidget() {
    // Remove any existing widget
    const existing = document.getElementById('chat-widget-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'chat-widget-root';
    root.innerHTML = `
        <button class="chat-fab" id="chat-fab-btn" aria-label="Open AI Chat">
            <span class="chat-fab-icon">🤖</span>
            <span class="chat-fab-pulse"></span>
        </button>

        <div class="chat-panel" id="chat-panel" aria-hidden="true">
            <div class="chat-panel-header">
                <div class="chat-header-info">
                    <div class="chat-avatar">✦</div>
                    <div>
                        <div class="chat-name">DNT AI Advisor</div>
                        <div class="chat-status-line" id="chat-status-line">
                            <span class="chat-online-dot"></span> Online · Portfolio-Aware
                        </div>
                    </div>
                </div>
                <button class="chat-close-btn" id="chat-close-btn" aria-label="Close">✕</button>
            </div>

            <div class="chat-messages" id="chat-messages">
                <!-- Messages injected here -->
            </div>

            <div class="chat-input-area">
                <input type="text" class="chat-input" id="chat-input"
                    placeholder="Hỏi về rủi ro, phân bổ..." autocomplete="off"/>
                <button class="chat-send-btn" id="chat-send-btn">➤</button>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // Bindings
    document.getElementById('chat-fab-btn').addEventListener('click', toggleChat);
    document.getElementById('chat-close-btn').addEventListener('click', () => setOpen(false));

    const inputEl  = document.getElementById('chat-input');
    const sendBtn  = document.getElementById('chat-send-btn');

    const handleSend = () => {
        const msg = inputEl.value.trim();
        if (!msg) return;
        inputEl.value = '';
        sendMessage(msg);
    };

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });
}

async function loadChatThread() {
    const msgsBox = document.getElementById('chat-messages');
    msgsBox.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted)">Đang tải...</div>';
    try {
        let threads = await ChatService.getThreads();
        if (threads.length === 0) {
            const nt = await ChatService.createThread("Khởi đầu tư vấn");
            threads.push(nt);
        }
        if (!AppState.activeChatThreadId || !threads.find(t=>t.id===AppState.activeChatThreadId)) {
            AppState.activeChatThreadId = threads[0].id;
        }

        const msgs = await ChatService.getMessages(AppState.activeChatThreadId);
        if (msgs.length === 0) {
            const intro = `👋 Tôi là **AI Advisor** của DNT Quant Lab. Nhập câu hỏi để bắt đầu.`;
            await ChatService.addMessage(AppState.activeChatThreadId, 'assistant', intro);
            msgs.push({role: 'assistant', content: intro});
        }

        msgsBox.innerHTML = msgs.map(m => formatMsgHTML(m.role, m.content)).join('');
        scrollToBottom();

    } catch (e) {
        msgsBox.innerHTML = '<div style="text-align:center;color:red;padding:1rem;">Phiên đăng nhập hết hạn hoặc lỗi kết nối.</div>';
    }
}

function toggleChat() {
    setOpen(!_chatOpen);
}

function setOpen(val) {
    _chatOpen = val;
    const panel = document.getElementById('chat-panel');
    const fab   = document.getElementById('chat-fab-btn');
    if (!panel || !fab) return;
    panel.classList.toggle('open', val);
    panel.setAttribute('aria-hidden', String(!val));
    fab.classList.toggle('active', val);
    if (val) {
        loadChatThread(); // load fresh each open if modified in full-page
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 300);
    }
}

const formatMsgHTML = (role, text) => {
    const formatted = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
    return `<div class="chat-msg ${role==='user'?'user':'bot'}">
        ${role === 'assistant' || role === 'bot' ? '<div class="msg-avatar">✦</div>' : ''}
        <div class="msg-bubble">${formatted}</div>
    </div>`;
};

async function sendMessage(text) {
    const msgsBox = document.getElementById('chat-messages');
    msgsBox.insertAdjacentHTML('beforeend', formatMsgHTML('user', text));
    scrollToBottom();

    await ChatService.addMessage(AppState.activeChatThreadId, 'user', text);

    const typingId = 'cw-typing-' + Date.now();
    msgsBox.insertAdjacentHTML('beforeend', `
        <div class="chat-msg bot" id="${typingId}"><div class="msg-bubble typing"><span></span><span></span><span></span></div></div>
    `);
    scrollToBottom();

    try {
        const ptfData = AppState.portfolioHoldings || [];
        const res = await ChatService.fetchAIAdviceStream({
            prompt: text,
            portfolio_data: { holdings: ptfData, has_portfolio: ptfData.length > 0 }
        });

        document.getElementById(typingId).remove();
        if (!res.ok) throw new Error();

        let replyText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        const botId = 'cw-bot-' + Date.now();

        msgsBox.insertAdjacentHTML('beforeend', `
            <div class="chat-msg bot">
                <div class="msg-avatar">✦</div>
                <div class="msg-bubble" id="${botId}"></div>
            </div>
        `);
        const botEl = document.getElementById(botId);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            replyText += decoder.decode(value, {stream: true});
            botEl.innerHTML = replyText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
            msgsBox.scrollTop = msgsBox.scrollHeight;
        }

        await ChatService.addMessage(AppState.activeChatThreadId, 'assistant', replyText);

    } catch (e) {
        document.getElementById(typingId)?.remove();
        const err = "Xin lỗi tôi đang bận chưa kết nối được hệ thống backend.";
        msgsBox.insertAdjacentHTML('beforeend', formatMsgHTML('bot', err));
        await ChatService.addMessage(AppState.activeChatThreadId, 'assistant', err);
    }
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}
