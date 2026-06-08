import { Auth }   from '../auth.js';
import { t }      from '../i18n.js';

export function renderLogin(router) {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
        <div class="auth-page">
            <div class="auth-card glass-card">
                <div class="auth-header">
                    <div class="auth-logo">✦</div>
                    <h2>${t('auth_login_welcome')}</h2>
                    <p>${t('auth_login_sub')}</p>
                </div>

                <form id="login-form" class="auth-form" autocomplete="off">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="login-email" class="form-input"
                            placeholder="demo@nvtlab.vn" value="demo@nvtlab.vn"/>
                    </div>
                    <div class="form-group">
                        <label>${t('auth_pass')}</label>
                        <input type="password" id="login-pass" class="form-input"
                            placeholder="••••••••" value="demo1234"/>
                    </div>
                    <div id="login-error" class="auth-error" style="display:none"></div>
                    <button type="submit" class="btn-primary btn-full" id="login-submit-btn">
                        ${t('topbar_login')}
                    </button>
                </form>

                <div class="auth-footer">
                    <span>${t('auth_no_account')}</span>
                    <a href="#/register" class="auth-link">${t('auth_reg_free')}</a>
                </div>

                <div class="auth-demo-notice">
                    <span>${t('auth_demo_notice')}</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-submit-btn');
        const errDiv = document.getElementById('login-error');
        btn.textContent = t('auth_logging_in');
        btn.disabled = true;
        errDiv.style.display = 'none';

        const email = document.getElementById('login-email').value.trim() || 'demo@nvtlab.vn';
        const pass = document.getElementById('login-pass').value || 'demo1234';
        
        try {
            await Auth.login(email, pass);
            window.location.hash = '#/dashboard';
            window.dispatchEvent(new Event('hashchange'));
        } catch(err) {
            errDiv.textContent = err.message || t('auth_err_login');
            errDiv.style.display = 'block';
        } finally {
            btn.textContent = t('topbar_login');
            btn.disabled = false;
        }
    });
}

export function renderRegister(router) {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
        <div class="auth-page">
            <div class="auth-card glass-card">
                <div class="auth-header">
                    <div class="auth-logo">✦</div>
                    <h2>${t('auth_reg_title')}</h2>
                    <p>${t('auth_reg_sub')}</p>
                </div>

                <form id="register-form" class="auth-form" autocomplete="off">
                    <div class="form-group">
                        <label>${t('auth_name')}</label>
                        <input type="text" id="reg-name" class="form-input"
                            placeholder="${t('auth_name_ph')}"/>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="reg-email" class="form-input"
                            placeholder="email@example.com"/>
                    </div>
                    <div class="form-group">
                        <label>${t('auth_pass')}</label>
                        <input type="password" id="reg-pass" class="form-input"
                            placeholder="${t('auth_pass_ph')}"/>
                    </div>
                    <div id="register-error" class="auth-error" style="display:none"></div>
                    <button type="submit" class="btn-primary btn-full" id="reg-submit-btn">
                        ${t('topbar_register')}
                    </button>
                </form>

                <div class="auth-footer">
                    <span>${t('auth_have_account')}</span>
                    <a href="#/login" class="auth-link">${t('topbar_login')}</a>
                </div>

                <div class="auth-demo-notice">
                    <span>${t('auth_reg_demo')}</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('reg-submit-btn');
        const errDiv = document.getElementById('register-error');
        btn.textContent = t('auth_creating');
        btn.disabled = true;
        errDiv.style.display = 'none';

        const email = document.getElementById('reg-email').value.trim();
        const name = document.getElementById('reg-name').value.trim();
        const pass = document.getElementById('reg-pass').value;

        if (!email || !pass || pass.length < 8) {
            errDiv.textContent = t('auth_val_pass');
            errDiv.style.display = 'block';
            btn.textContent = t('topbar_register');
            btn.disabled = false;
            return;
        }

        try {
            await Auth.register(email, pass, name);
            window.location.hash = '#/dashboard';
            window.dispatchEvent(new Event('hashchange'));
        } catch (err) {
            errDiv.textContent = err.message || t('auth_err_reg');
            errDiv.style.display = 'block';
        } finally {
            btn.textContent = t('topbar_register');
            btn.disabled = false;
        }
    });
}

