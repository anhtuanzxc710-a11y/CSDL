import { AppState } from '../state.js';
import { ChatService } from '../services/chatService.js';
import { t } from '../i18n.js';

export async function renderAIAssistant() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const SUGGESTED = [
        t('ai_suggest_1'),
        t('ai_suggest_2'),
        t('ai_suggest_3'),
        t('ai_suggest_4'),
        t('ai_suggest_5')
    ];

    main.innerHTML = `
        <div class="ai-assistant-page" style="display:flex;">
            <!-- Threads Sidebar -->
            <div style="width:250px; background:var(--card-bg); border-right:1px solid var(--border); padding:1rem; display:flex; flex-direction:column;">
                <button class="btn-primary" id="btn-new-thread" style="margin-bottom:1rem; width:100%;">${t('ai_thread_new')}</button>
                <div id="thread-list" style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:0.5rem;">
                    <!-- injected -->
                    <div style="color:var(--text-muted); font-size:0.9rem; text-align:center; padding:1rem;">${t('ai_loading_thread')}</div>
                </div>
            </div>

            <!-- Chat Area -->
            <div style="flex:1; display:flex; flex-direction:column; background:rgba(0,0,0,0.2);">
                <div class="ai-assistant-header" style="border-radius:0; border-right:none; border-left:none; border-top:none;">
                    <div class="ai-assistant-avatar">✦</div>
                    <div>
                        <h1 class="page-title" style="margin:0" id="chat-title">AI Investment Advisor</h1>
                        <div class="page-subtitle" style="margin:0">Powered by Gemini AI · Portfolio-Context Aware</div>
                    </div>
                    <div style="margin-left:auto">
                        <span class="badge-success">${t('ai_badge_active')}</span>
                    </div>
                </div>

                <div class="ai-full-chat" style="border:none; background:transparent; flex:1; display:flex; flex-direction:column; padding:0;">
                    <div class="chat-messages-full" id="ai-chat-messages" style="flex:1; border:none; padding:1.5rem; display:flex; flex-direction:column;">
                        <!-- messages -->
                    </div>

                    <!-- Suggested questions -->
                    <div class="suggested-questions" id="suggested-qs" style="margin:0 1.5rem;">
                        ${SUGGESTED.map(q => `<button class="suggested-q-btn">${q}</button>`).join('')}
                    </div>

                    <div class="chat-input-bar" style="border:none; border-top:1px solid var(--border); background:var(--card-bg); margin:0; border-radius:0;">
                        <input type="text" id="ai-chat-input" class="form-input chat-input-full"
                            placeholder="${t('ai_placeholder')}" disabled/>
                        <button class="btn-primary" id="ai-chat-send" style="white-space:nowrap;" disabled>${t('ai_send')}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load Threads
    try {
        const threads = await ChatService.getThreads();
        const tList = document.getElementById('thread-list');

        if (threads.length === 0) {
            const nt = await ChatService.createThread(AppState.currentLang === 'vi' ? "Khởi đầu tư vấn" : "Initial Consulting");
            threads.push(nt);
        }

        if (!AppState.activeChatThreadId || !threads.find(t => t.id === AppState.activeChatThreadId)) {
            AppState.activeChatThreadId = threads[0].id;
        }

        const renderThreadList = () => {
            tList.innerHTML = threads.map(t => `
                <div class="thread-item ${t.id === AppState.activeChatThreadId ? 'active' : ''}" data-id="${t.id}"
                     style="padding:0.75rem; border-radius:0.5rem; cursor:pointer; 
                            background:${t.id === AppState.activeChatThreadId ? 'var(--neon-purple-dark)' : 'transparent'};
                            border:1px solid ${t.id === AppState.activeChatThreadId ? 'var(--neon-purple)' : 'var(--border)'};">
                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">${t.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${new Date(t.created_at).toLocaleDateString()}</div>
                </div>
            `).join('');

            // Bind clicks
            tList.querySelectorAll('.thread-item').forEach(el => {
                el.addEventListener('click', () => {
                    AppState.activeChatThreadId = parseInt(el.getAttribute('data-id'));
                    renderThreadList();
                    loadMessages();
                });
            });
        };
        renderThreadList();

        // Bind New Thread
        document.getElementById('btn-new-thread').addEventListener('click', async () => {
            const title = prompt(t('ai_thread_prompt'));
            if (title) {
                const nt = await ChatService.createThread(title);
                threads.unshift(nt);
                AppState.activeChatThreadId = nt.id;
                renderThreadList();
                loadMessages();
            }
        });

        // Load Messages
        const loadMessages = async () => {
            const input = document.getElementById('ai-chat-input');
            const btn = document.getElementById('ai-chat-send');
            input.disabled = true;
            btn.disabled = true;

            const msgsBox = document.getElementById('ai-chat-messages');
            msgsBox.innerHTML = `<div style="text-align:center; color:var(--text-muted);">${t('ai_loading_msg')}</div>`;

            try {
                const msgs = await ChatService.getMessages(AppState.activeChatThreadId);
                if (msgs.length === 0) {
                    // Add intro
                    const intro = t('ai_intro');
                    await ChatService.addMessage(AppState.activeChatThreadId, 'assistant', intro);
                    msgs.push({ role: 'assistant', content: intro });
                }

                msgsBox.innerHTML = msgs.map(m => formatMsgHTML(m.role, m.content)).join('');
                document.getElementById('suggested-qs').style.display = msgs.length <= 1 ? 'flex' : 'none';

                setTimeout(() => msgsBox.scrollTop = msgsBox.scrollHeight, 100);
            } catch (e) {
                msgsBox.innerHTML = `<div class="auth-error">${t('ai_err_msgs')}</div>`;
            } finally {
                input.disabled = false;
                btn.disabled = false;
                input.focus();
            }
        };

        const formatMsgHTML = (role, text) => {

            const formatted = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
            if (role === 'user') {
                return `<div class="chat-msg user"><div class="msg-bubble-full user-bubble">${formatted}</div></div>`;
            }
            return `<div class="chat-msg bot">
                <div class="msg-avatar-full">✦</div>
                <div class="msg-bubble-full bot-bubble">${formatted}</div>
            </div>`;
        };

        const sendMessage = async (text) => {
            const msgsBox = document.getElementById('ai-chat-messages');
            msgsBox.insertAdjacentHTML('beforeend', formatMsgHTML('user', text));
            document.getElementById('suggested-qs').style.display = 'none';
            setTimeout(() => msgsBox.scrollTop = msgsBox.scrollHeight, 50);

            // Persist User Message
            await ChatService.addMessage(AppState.activeChatThreadId, 'user', text);

            // Mock Typing
            const typingId = 'typing-' + Date.now();
            msgsBox.insertAdjacentHTML('beforeend', `
                <div class="chat-msg bot" id="${typingId}">
                    <div class="msg-avatar-full">✦</div>
                    <div class="msg-bubble-full typing"><span></span><span></span><span></span></div>
                    <div style="font-size:0.7rem; color:var(--text-muted); padding:0 1rem;">${t('ai_typing')}</div>
                </div>

            `);
            setTimeout(() => msgsBox.scrollTop = msgsBox.scrollHeight, 50);

            // Fetch AI Response (Stream via POST)
            try {
                const ptfData = AppState.portfolioHoldings || [];
                const res = await ChatService.fetchAIAdviceStream({
                    prompt: text,
                    portfolio_data: { holdings: ptfData, has_portfolio: ptfData.length > 0 }
                });

                document.getElementById(typingId).remove();

                if (!res.ok) throw new Error("API Error");
                let replyText = "";

                // Read stream
                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");

                const botId = 'bot-' + Date.now();
                msgsBox.insertAdjacentHTML('beforeend', `
                    <div class="chat-msg bot">
                        <div class="msg-avatar-full">✦</div>
                        <div class="msg-bubble-full bot-bubble" id="${botId}"></div>
                    </div>
                `);

                const botEl = document.getElementById(botId);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    replyText += decoder.decode(value, { stream: true });
                    botEl.innerHTML = replyText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
                    msgsBox.scrollTop = msgsBox.scrollHeight;
                }

                // Persist AI Message
                await ChatService.addMessage(AppState.activeChatThreadId, 'assistant', replyText);

            } catch (e) {
                document.getElementById(typingId)?.remove();
                const errText = t('ai_err_conn');
                msgsBox.insertAdjacentHTML('beforeend', formatMsgHTML('assistant', errText));
                await ChatService.addMessage(AppState.activeChatThreadId, 'assistant', errText);
            }

        };

        // Attach Handlers
        const sendBtn = document.getElementById('ai-chat-send');
        const inputEl = document.getElementById('ai-chat-input');

        const handleSend = () => {
            const msg = inputEl.value.trim();
            if (!msg) return;
            inputEl.value = '';
            sendMessage(msg);
        };

        sendBtn.addEventListener('click', handleSend);
        inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

        document.querySelectorAll('.suggested-q-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                inputEl.value = btn.textContent;
                handleSend();
            });
        });

        // Initial Load
        loadMessages();

    } catch (e) {
        console.error("AI Init Error", e);
        main.innerHTML += `<div class="auth-error glass-card" style="margin:2rem auto; max-width:500px;">Lỗi tải lịch sử trò chuyện. Vui lòng thử lại.</div>`;
    }
}
