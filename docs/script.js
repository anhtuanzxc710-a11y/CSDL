/**
 * 1. REVEAL EFFECT (FADE-IN & SLIDE-UP)
 */
const initReveal = () => {
    const reveals = document.querySelectorAll('.reveal');
    const observerOptions = { root: null, threshold: 0.15 };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, observerOptions);

    reveals.forEach(reveal => revealObserver.observe(reveal));
};

/**
 * 2. TYPING EFFECT (HERO SECTION) - NÂNG CẤP SONG NGỮ
 */
const typingTexts = {
    en: ["Financial Data.", "Quant Analysis.", "Algorithmic Tools.", "Risk Modeling."],
    vi: ["Dữ liệu Tài chính.", "Phân tích Định lượng.", "Công cụ Thuật toán.", "Mô hình Rủi ro."]
};

// Khởi tạo ngôn ngữ từ bộ nhớ trình duyệt
let currentLang = localStorage.getItem('nvt_lang') || 'en';
let textArray = typingTexts[currentLang];

const typingDelay = 100;
const erasingDelay = 50;
const newTextDelay = 2000;
let textArrayIndex = 0;
let charIndex = 0;

const typedTextSpan = document.querySelector(".typed-text");
const cursorSpan = document.querySelector(".cursor");

const type = () => {
    if (!typedTextSpan) return;
    if (charIndex < textArray[textArrayIndex].length) {
        if (cursorSpan && !cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
        typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
        charIndex++;
        setTimeout(type, typingDelay);
    } else {
        if (cursorSpan) cursorSpan.classList.remove("typing");
        setTimeout(erase, newTextDelay);
    }
};

const erase = () => {
    if (charIndex > 0) {
        if (cursorSpan && !cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
        typedTextSpan.textContent = textArray[textArrayIndex].substring(0, charIndex - 1);
        charIndex--;
        setTimeout(erase, erasingDelay);
    } else {
        if (cursorSpan) cursorSpan.classList.remove("typing");
        textArrayIndex = (textArrayIndex + 1) % textArray.length;
        setTimeout(type, typingDelay + 500);
    }
};

/**
 * 3. SCROLL LOGIC (PROGRESS BAR, SCROLLSPY, VIDEO)
 */
const video = document.getElementById("scrollVideo");
const scrollProgress = document.querySelector('.scroll-progress');
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

const handleScrollEffects = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollFraction = docHeight > 0 ? scrollTop / docHeight : 0;

    if (scrollProgress) scrollProgress.style.width = `${scrollFraction * 100}%`;

    let currentSectionId = "";
    sections.forEach(section => {
        if (scrollTop >= section.offsetTop - section.clientHeight / 3) {
            currentSectionId = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(currentSectionId)) link.classList.add('active');
    });

    if (video && !isNaN(video.duration)) {
        requestAnimationFrame(() => { video.currentTime = video.duration * scrollFraction; });
    }
};

/**
 * 4. KHỞI TẠO CHUNG
 */
document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0); // Ép trình duyệt luôn ở trên cùng khi load

    initReveal();

    // Chạy dịch thuật ngay khi load để khớp UI
    updateLanguage(currentLang);

    if (typedTextSpan) setTimeout(type, 1000);

    if (video) {
        const setupVideo = () => {
            video.play().then(() => {
                setTimeout(() => { video.pause(); handleScrollEffects(); }, 150);
            }).catch(e => console.log("Video playback error:", e));
        };
        if (video.readyState >= 1) setupVideo();
        else video.addEventListener('loadedmetadata', setupVideo);
    }

    window.addEventListener('scroll', handleScrollEffects, { passive: true });
});

/**
 * 5. SIRI-STYLE AI CHATBOT LOGIC
 */
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const chatWindow    = document.getElementById('chat-window');
const closeChatBtn  = document.getElementById('close-chat-btn');
const chatMessages  = document.getElementById('chat-messages');
const chatInput     = document.getElementById('chat-input');
const sendChatBtn   = document.getElementById('send-chat-btn');
const siriSphere    = document.querySelector('.siri-sphere');

// FIX: Lưu lịch sử hội thoại để gửi kèm theo schema backend mới
let conversationHistory = [];

const API_URL = 'https://dnt-portfolio-backend.onrender.com/chat';

let siriAnimation;

// Khởi tạo các vòng sóng Siri
if (siriSphere) {
    for (let i = 0; i < 4; i++) {
        const ring = document.createElement('div');
        ring.className = 'siri-ring';
        ring.style.cssText = 'position:absolute;width:100%;height:100%;border-radius:50%;border:1px solid var(--accent);opacity:0;filter:blur(1px);';
        siriSphere.appendChild(ring);
    }
}

function startSiriAnimation() {
    if (typeof anime === 'undefined') return;
    siriAnimation = anime.timeline({ loop: true, autoplay: true })
        .add({ targets: '.siri-sphere', scale: [1, 1.05], opacity: [0.8, 1], easing: 'linear', duration: 200 })
        .add({ targets: '.siri-ring', scale: [1, 2.5], opacity: [0.6, 0], easing: 'linear', duration: anime.random(1200, 1800), delay: anime.stagger(200) });
}

function stopSiriAnimation() {
    if (siriAnimation) {
        siriAnimation.pause();
        anime({ targets: '.siri-sphere', scale: 1, opacity: 0.8, duration: 300 });
        anime({ targets: '.siri-ring', scale: 1, opacity: 0, duration: 300 });
    }
}

chatToggleBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden');
    siriSphere.classList.toggle('hidden');
    chatToggleBtn.classList.toggle('active');
    chatToggleBtn.classList.contains('active') ? startSiriAnimation() : stopSiriAnimation();
});

closeChatBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
    siriSphere.classList.add('hidden');
    chatToggleBtn.classList.remove('active');
    stopSiriAnimation();
});

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// FIX: Gửi history cùng message, cập nhật history sau mỗi lượt
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    chatInput.value = '';

    // Hiển thị trạng thái "đang suy nghĩ" dựa trên ngôn ngữ hiện tại
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot', 'typing-indicator');
    typingDiv.textContent = currentLang === 'en' ? "I'm thinking..." : "Đang suy nghĩ...";
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: conversationHistory  // FIX: Gửi kèm lịch sử
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        typingDiv.remove();
        const reply = data.reply || (currentLang === 'en' ? "Sorry, I didn't get a response." : "Xin lỗi, mình không nhận được phản hồi.");
        addMessage(reply, 'bot');

        // FIX: Cập nhật history sau mỗi lượt hội thoại (giữ tối đa 10 lượt = 20 entries)
        conversationHistory.push({ role: "user",      text: message });
        conversationHistory.push({ role: "assistant", text: reply   });
        if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);

    } catch (error) {
        console.error("Chat error:", error);
        typingDiv.remove();
        let errorMsg = currentLang === 'en' ? "Server under maintenance, please try again later!" : "Server đang bảo trì, vui lòng thử lại sau!";
        if (error.name === 'AbortError' || error.message.includes('fetch')) {
            errorMsg = currentLang === 'en' ? "My AI brain is waking up from sleep. Please wait 30s and try again!" : "Cỗ máy AI của mình đang ngủ đông và cần 30 giây để thức giấc. Bạn thử lại xíu nữa nhé!";
        }
        addMessage(errorMsg, 'bot');
    }
}

sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

/**
 * 6. AI AGENT CTA (ABOUT ME)
 */
const aboutAiCtaBtn = document.getElementById('about-ai-cta-btn');
if (aboutAiCtaBtn) {
    aboutAiCtaBtn.addEventListener('click', () => {
        // Mở chat nếu đang đóng
        if (chatWindow?.classList.contains('hidden')) {
            chatWindow.classList.remove('hidden');
            siriSphere?.classList.remove('hidden');
            chatToggleBtn?.classList.add('active');
            startSiriAnimation();
        }
        // focus input
        chatInput?.focus();
    });
}

/**
 * 7. THÊM MỚI: HỆ THỐNG ĐA NGÔN NGỮ (i18n)
 */
const translations = {
    en: {
        nav_home: "Home", nav_about: "About", nav_live: "Live App", nav_research: "Research", nav_contact: "Contact", nav_cv: "CV coming soon",
        hero_greeting: "Hi, This is <span class='accent'>NGUYỄN VĂN TUẤN</span> 👋",
        hero_role: "Fintech student <br> specializing in ",
        hero_btn_live: "Try live dashboard", scroll_down: "Scroll Down",
        about_title: "About Me",
        about_desc: "I am a final-year Data Science student at the <strong>University of Economics and Finance (UEF)</strong>, where I've developed a deep-rooted passion for <strong>Financial Data Analysis</strong>. My journey is driven by an insatiable curiosity for how data intersects with global markets.<br><br>Beyond the numbers, I love exploring the 'creative' side of tech. I've taught myself <strong>Web Programming and Design</strong> to ensure my analytical models aren't just accurate, but also beautifully presented and user-friendly. I'm a firm believer in being a lifelong learner, always eager to pick up new tools—from complex algorithmic trading strategies to the latest web animations—bridging the gap between rigorous finance and modern technology.",
        ai_cta_text: "Curious about my secret skills or want to chat with my virtual bot?",
        ai_cta_btn: "More about me with my AI Agent",
        featured_title_quantlab: "Featured: NVT Quant Lab API", 
        featured_sub_quantlab: "This project is an AI-driven investment advisory assistant. The system fetches real-time historical stock prices, calculates quantitative metrics, runs backtests, and generates 10,000 Monte Carlo simulations. Leveraging this rich dataset, Gemini AI analyzes and extracts the most optimal investment strategies. Additionally, the portfolio evaluation feature allows investors to assess the quality of their current holdings. The core objective is to democratize stock investing, empowering users with limited market knowledge to confidently reference insights and make effective investment decisions.",
        iframe_title_quantlab: "NVT Quant Lab - Live Server",
        featured_title_vn30: "Featured: VN STOCKS Quant", 
        featured_sub_vn30: "This quantitative research project serves as the foundational prerequisite for the NVT Quant Lab. Specifically, the comprehensive dataset along with the data collection and processing methods established here power the analytical engine of NVT Lab. The application focuses on analyzing the top 30 largest capitalized stocks in Vietnam (VN30) and benchmarking their correlation against the market index (VNINDEX). It provides visualization tools for volatility and risk-return distribution through interactive charts, serving as a robust environment for dissecting historical data, comparing systematic risks, and exploring the micro-behavior of individual equities within the VN30 basket.",
        iframe_title_vn30: "Live Trading Environment",
        projects_title: "Other Analytical Projects",
        proj_1_desc: "Coming soon",
        proj_2_desc: "Coming soon",
        proj_3_desc: "Coming soon",
        github_cta_text: "Hungry for more? Explore all my repositories and experimental scripts.",
        github_cta_btn: "View more on GitHub",
        contact_title: "Get In Touch", contact_sub: "Currently seeking Quantitative Analyst / Data Analyst internship opportunities.",
        footer_rights: "© 2026 <strong>NGUYỄN VĂN TUẤN</strong>. All Rights Reserved.",
        footer_sub: "Designed & Developed by NGUYỄN VĂN TUẤN | Built for Quantitative Finance",
        
        // Dịch thuật cho Chatbot
        chat_welcome: "Hello! I'm NGUYỄN VĂN TUẤN's AI assistant. Do you have any questions?",
        chat_placeholder: "Ask me anything...",
    },
    vi: {
        nav_home: "Trang chủ", nav_about: "Về Bản Thân", nav_live: "Ứng dụng Live", nav_research: "Nghiên cứu", nav_contact: "Liên hệ", nav_cv: "CV sắp ra mắt",
        hero_greeting: "Xin chào, mình là <span class='accent'>NGUYỄN VĂN TUẤN</span> 👋",
        hero_role: "Sinh viên Fintech <br> chuyên về ",
        hero_desc: "Mình chuyên xử lý toàn bộ vòng đời của dữ liệu—từ thu thập, làm sạch các tập dữ liệu thô cho đến phân tích dữ liệu khám phá (EDA) chuyên sâu. Mình xây dựng các mô hình tài chính và công cụ thuật toán dựa trên dữ liệu, nhằm thu hẹp khoảng cách giữa nghiên cứu định lượng phức tạp và các chiến lược đầu tư thực tiễn.",
        hero_btn_live: "Trải nghiệm Dashboard", scroll_down: "Cuộn xuống",
        about_title: "Về Bản Thân",
        about_desc: "Mình là sinh viên năm cuối chuyên ngành Khoa học Dữ liệu tại <strong>Đại học Kinh tế Tài chính TP.HCM (UEF)</strong>, nơi mình nuôi dưỡng niềm đam mê mãnh liệt với <strong>Phân tích Dữ liệu Tài chính</strong>. Hành trình của mình được dẫn dắt bởi sự tò mò không ngừng về cách dữ liệu vận hành và tác động đến thị trường toàn cầu.<br><br>Bên cạnh những con số, mình thích khám phá khía cạnh 'sáng tạo' của công nghệ. Mình đã tự học <strong>Lập trình và Thiết kế Web</strong> để đảm bảo các mô hình phân tích của mình không chỉ chính xác mà còn được trình bày đẹp mắt và thân thiện với người dùng. Mình luôn tin vào việc học tập suốt đời, luôn sẵn sàng tiếp thu các công cụ mới—từ các chiến lược giao dịch thuật toán phức tạp đến các hiệu ứng web hiện đại nhất—để kết nối giữa tài chính chuyên sâu và công nghệ.",
        ai_cta_text: "Tò mò về những kỹ năng bí mật khác của mình hay muốn trò chuyện với bản sao ảo của mình?",
        ai_cta_btn: "Trò chuyện với AI Trợ lý",
        featured_title_quantlab: "Dự án Nổi bật: NVT Quant Lab", 
        featured_sub_quantlab: "Đây là dự án trợ lí AI tư vấn đầu tư. Hệ thống thu thập dữ liệu giá cổ phiếu lịch sử theo thời gian thực, tính toán các chỉ số định lượng, chạy backtest và tạo bảng mô phỏng 10.000 trường hợp bằng thuật toán Monte Carlo. Dựa trên bộ dữ liệu này, AI Gemini sẽ phân tích và đưa ra chiến lược đầu tư tối ưu nhất. Thêm vào đó, tính năng đánh giá danh mục giúp nhà đầu tư kiểm định hiệu quả của các mã cổ phiếu đang nắm giữ. Mục tiêu cốt lõi của dự án là đơn giản hóa việc đầu tư chứng khoán, giúp ngay cả những nhà đầu tư F0 và những người không có nhiều kiến thức nền tảng về thị trường vẫn có thể tham khảo để ra quyết định đầu tư an toàn và hiệu quả.",
        iframe_title_quantlab: "Máy chủ NVT Quant Lab",
        featured_title_vn30: "Dự án Nổi bật: VN STOCKS Quant", 
        featured_sub_vn30: "Dự án nghiên cứu định lượng này đóng vai trò là tiền đề nền tảng để thực hiện NVT Quant Lab. Cụ thể, bộ dữ liệu cũng như phương thức thu thập và xử lý dữ liệu của NVT Lab đều được kế thừa và phát triển trực tiếp từ dự án này. Ứng dụng tập trung phân tích 30 mã cổ phiếu vốn hóa lớn nhất Việt Nam (VN30) và so sánh tương quan với chỉ số thị trường chuẩn (VNINDEX), cung cấp các công cụ trực quan hóa biến động, phân phối rủi ro và kỳ vọng lợi nhuận qua các biểu đồ tương tác. Đây là môi trường mạnh mẽ phục vụ cho việc bóc tách dữ liệu lịch sử, đo lường rủi ro hệ thống và nghiên cứu hành vi của từng cổ phiếu chuyên biệt trong nhóm VN30.",
        iframe_title_vn30: "Môi trường Giao dịch Trực tiếp",
        projects_title: "Các Dự án Phân tích Khác",
        proj_1_desc: "Coming soon",
        proj_2_desc: "Coming soon",
        proj_3_desc: "Coming soon",
        github_cta_text: "Bạn muốn xem thêm? Khám phá toàn bộ kho lưu trữ và các kịch bản thử nghiệm của mình.",
        github_cta_btn: "Xem thêm trên GitHub",
        contact_title: "Liên Hệ Với Mình", contact_sub: "Hiện tại đang trống",
        footer_rights: "© 2026 <strong>NGUYỄN VĂN TUẤN</strong>. Đã đăng ký Bản quyền.",
        footer_sub: "Thiết kế & Phát triển bởi NGUYỄN VĂN TUẤN | Dành cho Tài chính Định lượng",
        
        // Dịch thuật cho Chatbot
        chat_welcome: "Xin chào! Mình là trợ lý AI của NGUYỄN VĂN TUẤN. Bạn có câu hỏi gì không?",
        chat_placeholder: "Đợi bạn hỏi...",
    }
};

const langCheckbox = document.getElementById('lang-toggle');

function updateLanguage(lang) {
    // 1. Đồng bộ nút gạt
    if (langCheckbox) {
        langCheckbox.checked = (lang === 'en');
    }
    
    // 2. Thay đổi nội dung các phần tử có data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            element.innerHTML = translations[lang][key]; 
        }
    });

    // 3. Thay đổi nội dung placeholder của Chatbot
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) {
            element.placeholder = translations[lang][key]; 
        }
    });

    // 4. Reset hiệu ứng gõ chữ cho ngôn ngữ mới
    textArray = typingTexts[lang];
    textArrayIndex = 0;
    charIndex = 0;
    if (typedTextSpan) {
        typedTextSpan.textContent = ""; 
    }

    // Cập nhật biến ngôn ngữ toàn cục và lưu lại
    currentLang = lang;
    localStorage.setItem('nvt_lang', lang);
}

// Lắng nghe sự kiện GẠT NÚT
if (langCheckbox) {
    langCheckbox.addEventListener('change', () => {
        const newLang = langCheckbox.checked ? 'en' : 'vi';
        updateLanguage(newLang);
    });
}

/**
 * 8. PROJECT SWITCHER
 */
const switcherBtns = document.querySelectorAll('.switcher-btn');
const featuredIframe = document.getElementById('featured-iframe');
const featuredTitle = document.getElementById('featured-title');
const featuredSubtitle = document.getElementById('featured-subtitle');
const iframeTitle = document.getElementById('iframe-browser-title');

const projectsData = {
    quantlab: {
        url: "https://interested-kathryn-tri1301-71097f9c.koyeb.app/",
        titleKey: "featured_title_quantlab",
        subKey: "featured_sub_quantlab",
        iframeKey: "iframe_title_quantlab"
    },
    vn30: {
        url: "https://dntworkspace-dryffmvylswb5tx5nrtzex.streamlit.app/?embed=true",
        titleKey: "featured_title_vn30",
        subKey: "featured_sub_vn30",
        iframeKey: "iframe_title_vn30"
    }
};

if (switcherBtns) {
    switcherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Xóa active hiện tại
            switcherBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); // active btn mới
            
            const proj = btn.getAttribute('data-proj');
            const data = projectsData[proj];
            
            // Cập nhật iframe
            if (featuredIframe) featuredIframe.src = data.url;
            
            // Gán lại data-i18n cho Tiêu đề và Phụ đề
            if (featuredTitle) featuredTitle.setAttribute('data-i18n', data.titleKey);
            if (featuredSubtitle) featuredSubtitle.setAttribute('data-i18n', data.subKey);
            if (iframeTitle) iframeTitle.setAttribute('data-i18n', data.iframeKey);
            
            // Reset text dựa theo ngôn ngữ hiện tại
            updateLanguage(currentLang);
        });
    });
}