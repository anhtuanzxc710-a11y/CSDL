import { t } from '../i18n.js';

export function renderLanding() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
        <div class="landing-page">
            <div class="landing-hero">
                <div class="hero-badge">${t('land_hero_badge')}</div>
                <h1 class="hero-title">
                    ${t('land_hero_title')}
                </h1>
                <p class="hero-desc">
                    ${t('land_hero_desc')}
                </p>
                <div class="hero-actions">
                    <a href="#/login" class="btn-primary">${t('land_hero_cta')}</a>
                    <a href="#/register" class="btn-ghost">${t('land_hero_reg')}</a>
                </div>
            </div>

            <div class="landing-features">
                <div class="feature-card">
                    <div class="feature-icon">🎲</div>
                    <h3>${t('land_feat_mc_t')}</h3>
                    <p>${t('land_feat_mc_d')}</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔥</div>
                    <h3>${t('land_feat_st_t')}</h3>
                    <p>${t('land_feat_st_d')}</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📈</div>
                    <h3>${t('land_feat_bt_t')}</h3>
                    <p>${t('land_feat_bt_d')}</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🤖</div>
                    <h3>${t('land_feat_ai_t')}</h3>
                    <p>${t('land_feat_ai_d')}</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <h3>${t('land_feat_kv_t')}</h3>
                    <p>${t('land_feat_kv_d')}</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📡</div>
                    <h3>${t('land_feat_sig_t')}</h3>
                    <p>${t('land_feat_sig_d')}</p>
                </div>
            </div>

            <div class="landing-cta-strip">
                <h2>${t('land_cta_strip')}</h2>
                <div class="hero-actions" style="justify-content:center; margin-top:1.5rem;">
                    <a href="#/login" class="btn-primary">${t('land_cta_login')}</a>
                </div>
            </div>
        </div>
    `;
}

