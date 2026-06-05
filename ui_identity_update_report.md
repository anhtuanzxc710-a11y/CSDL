# UI Identity Update Report (DNT -> NVT)

This report details the updates made to the CSDL repository to align all user-facing branding and personal identity references with the new owner, **NGUYỄN VĂN TUẤN** (Brand: **NVT**).

---

## 1. Files Changed

- **[index.html](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/docs/index.html)**: Replaced page title, author meta, greeting text, logos, switcher buttons, chatbot headers, emails, and GitHub links. Removed LinkedIn completely.
- **[script.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/docs/script.js)**: Replaced i18n dictionaries for English and Vietnamese, updating names, groups ("Nhom 10"), references to "DNT" with "NVT", and modified the language localStorage key from `dnt_lang` to `nvt_lang`.
- **[README.md](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/README.md)**: Updated main project title and descriptions to match "NVT" while preserving technical/functional folders like `dnt_quant_lab`.
- **[README_ENG.md](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/README_ENG.md)**: Updated main project title and descriptions to match "NVT" in English documentation.

---

## 2. Old Personal Information Removed from the UI

- **Full Names / Labels**: `Nhom 10` / `Nhóm 10`, `DOAN NGUYEN TRI`, `Tri Doan`
- **Branding**: `DNT.`, `DNT Quant Lab`, `DNT Workspace`, `DNT AI Assistant`
- **Email**: `doantri12343@gmail.com`
- **GitHub**: `https://github.com` (generic placeholder)
- **LinkedIn**: `https://www.linkedin.com` (removed entirely)

---

## 3. New Information Applied

- **Full Name**: `NGUYỄN VĂN TUẤN`
- **Brand / Logo Text**: `NVT`
- **GitHub Profile**: `https://github.com/anhtuanzxc710-a11y`
- **Email Address**: `tuan7105@gmail.com`
- **LinkedIn**: None (all buttons, icons, and items removed cleanly from the page layout)
- **Page Title**: `nvt.`
- **Author Meta Tag**: `NGUYỄN VĂN TUẤN`

---

## 4. Old References Intentionally Left Unchanged

The following references to the old identity were **intentionally kept** to prevent breaking system integrations or deployments:

1. **[docs/CNAME](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/docs/CNAME)**: Kept as `dntquantlab.pro.vn` to ensure the live GitHub Pages domain is not disrupted.
2. **Chatbot API URL (`docs/script.js:L136`)**: Kept as `https://dnt-portfolio-backend.onrender.com/chat` since this is the active Render backend endpoint servicing the chatbot.
3. **Streamlit App URL (`docs/script.js:L388`)**: Kept as `https://dntworkspace-dryffmvylswb5tx5nrtzex.streamlit.app/?embed=true` because this is the active URL serving the VN STOCKS Quant analyzer in the iframe.
4. **Internal Directory/File Names**: Folders like `dnt_quant_lab` were left untouched to avoid breaking relative import paths, API routes, or Docker configurations in the backend codebase.

---

## 5. Manual Actions Still Needed

- **Curriculum Vitae (CV)**: Since no CV PDF file currently exists in the workspace, the navigation translation `nav_cv` has been updated to show `"CV coming soon"` (English) and `"CV sắp ra mắt"` (Vietnamese). When you have your final CV PDF ready, please copy it to `/docs` and link it to the navbar.

---

## 6. Validation Search Results

Post-update searches verified that all occurrences of the old identity have been completely scrubbed from UI-visible contexts:

- **Search for "DNT" in docs**: Only found in the CNAME domain, Streamlit iframe URL, and the Render Chatbot API URL (internal/system integrations only).
- **Search for "Doan" in docs**: 0 results.
- **Search for "Tri Doan" in docs**: 0 results.
- **Search for "carrot1301" in docs**: 0 results.
- **Search for "doantri" in docs**: 0 results.
- **Search for "LinkedIn" in docs**: 0 results.
- **Search for "Nhom 10" in docs**: 0 results.
