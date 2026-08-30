export function renderApiConfigPanel() {
  const savedKey = localStorage.getItem("luxius_api_key") || "";
  const savedTargetId = localStorage.getItem("luxius_target_id") || "";

  return `
    <div class="api-config-panel" id="roblox-api-panel">
      <div class="api-header">
        <h3>🔒 ROBLOX OPEN CLOUD API CONFIGURATION</h3>
        <span class="eyebrow" style="color:#ff6b00;">STEP 1 OF 2</span>
      </div>

      <div class="api-tutorial-box">
        📖 <strong>Panduan Pembuatan API Key Roblox:</strong><br/>
        1. Buka <strong>Creator Dashboard Roblox</strong> → Menu <strong>Open Cloud / API Keys</strong>.<br/>
        2. Buat Key Baru: Isi Nama API Key, Akses <strong>Assets (Write & Read)</strong>.<br/>
        3. Atur <strong>IP Address: OFF</strong> & <strong>No Expired: ON</strong> → Simpan & Paste Secret Key di bawah ini.
      </div>

      <div class="target-toggle-group">
        <button type="button" class="toggle-btn active" id="btn-target-personal" onclick="setTargetType('user')">👤 PERSONAL USER ACCOUNT</button>
        <button type="button" class="toggle-btn" id="btn-target-group" onclick="setTargetType('group')">👥 GROUP CREATOR ACCOUNT</button>
      </div>

      <div class="api-input-grid">
        <div>
          <label class="lux-label" id="lbl-target-id">USER ID / CREATOR ID</label>
          <input type="text" class="lux-input" id="global-target-id" value="${savedTargetId}" placeholder="Masukkan ID User / Group Roblox..." />
        </div>

        <div>
          <label class="lux-label">OPEN CLOUD API SECRET KEY</label>
          <input type="password" class="lux-input" id="global-api-key" value="${savedKey}" placeholder="Paste Secret API Key..." />
        </div>
      </div>

      <div style="margin-top: 15px; text-align: right;">
        <button type="button" class="primary-button" id="btn-save-api-config">💾 SAVE API CONFIG</button>
      </div>
    </div>
  `;
}
