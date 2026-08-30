export function createEditor(item) {
  const speed = typeof item.settings?.speed === "number" ? item.settings.speed : 1;
  const pitch = typeof item.settings?.pitch === "number" ? item.settings.pitch : 0;
  const volume = typeof item.settings?.volume === "number" ? item.settings.volume : 1;
  const adjustedDuration = getPreviewDuration(item.duration, speed);
  
  // Wajib ada asset ID asli dan status upload sukses baru box ini boleh muncul!
  const isUploaded = Boolean(item.uploadedAssetId);
  const formattedAssetId = isUploaded ? `rbxassetid://${item.uploadedAssetId}` : "";

  return `
    <div class="audio-editor" data-editor="${item.id}">
      <div class="editor-header">
        <div class="editor-title-wrap">
          <p class="eyebrow">AUDIO EDITOR</p>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <button class="editor-close" type="button" data-action="close-editor" data-id="${item.id}">×</button>
      </div>

      <!-- STATUS BADGE -->
      <div class="status-pipeline-bar" id="status-bar-${item.id}">
        <span class="status-badge ${item.statusClass || 'status-ready'}" id="status-badge-${item.id}">
          ${item.statusText || "STATUS: READY TO PROCESS"}
        </span>
      </div>

      <div class="editor-player">
        <div class="playback-controls">
          <button class="playback-button play-control" type="button" data-action="editor-play" data-id="${item.id}" id="play-btn-${item.id}">▶</button>
          <button class="playback-button pause-control" type="button" data-action="editor-pause" data-id="${item.id}" id="pause-btn-${item.id}" hidden style="background: #e65c00; border: none;">Ⅱ</button>
          <button class="playback-button stop-control" type="button" data-action="editor-stop" data-id="${item.id}">■</button>
        </div>

        <div class="editor-time">
          <span class="current-time" id="current-time-${item.id}">00:00</span>
          <span class="time-divider">/</span>
          <span class="duration-time" id="duration-value-${item.id}">${formatDuration(adjustedDuration)}</span>
        </div>

        <div class="seek-wrapper">
          <input class="lux-range seek-input" type="range" min="0" max="100" step="0.01" value="0" data-control="seek" data-id="${item.id}" />
        </div>
      </div>

      <div class="editor-controls">
        <!-- SPEED -->
        <div class="editor-control">
          <div class="control-heading">
            <label>Speed</label>
            <output id="speed-value-${item.id}">${speed.toFixed(2)}x</output>
          </div>
          <input class="lux-range" type="range" min="0.25" max="2" step="0.01" value="${speed}" data-control="speed" data-id="${item.id}" />
          <div class="range-hints"><span>0.25x</span><span>2.00x</span></div>
        </div>

        <!-- PITCH -->
        <div class="editor-control">
          <div class="control-heading">
            <label>Pitch</label>
            <output id="pitch-value-${item.id}">${formatPitch(pitch)}</output>
          </div>
          <input class="lux-range" type="range" min="-12" max="12" step="1" value="${pitch}" data-control="pitch" data-id="${item.id}" />
          <div class="range-hints"><span>-12 st</span><span>0</span><span>+12 st</span></div>
        </div>

        <!-- VOLUME BOOST -->
        <div class="editor-control">
          <div class="control-heading">
            <label>Volume Boost</label>
            <output id="volume-value-${item.id}">${Math.round(volume * 100)}%</output>
          </div>
          <input class="lux-range" type="range" min="0" max="2" step="0.05" value="${volume}" data-control="volume" data-id="${item.id}" />
          <div class="range-hints"><span>0%</span><span>100%</span><span>200%</span></div>
        </div>
      </div>

      <div class="export-options-card">
        <div class="option-row">
          <label class="lux-label">EXPORT FORMAT</label>
          <select class="lux-select" id="format-select-${item.id}" data-control="format" data-id="${item.id}">
            <option value="ogg" ${item.format === 'ogg' ? 'selected' : ''}>OGG (.ogg) - Recommended for Roblox</option>
            <option value="mp3" ${item.format === 'mp3' ? 'selected' : ''}>MP3 (.mp3)</option>
            <option value="wav" ${item.format === 'wav' ? 'selected' : ''}>WAV (.wav)</option>
            <option value="flac" ${item.format === 'flac' ? 'selected' : ''}>FLAC (.flac)</option>
          </select>
        </div>
      </div>

      <!-- ROBLOX RESULT BOX (DEFAULT HIDDEN - BARU MUNCUL PAS SUKSES) -->
      <div class="roblox-result-box" id="result-box-${item.id}" style="display: ${isUploaded ? 'flex' : 'none'}; flex-direction: column; width: 100%; box-sizing: border-box; margin-top: 15px; padding: 16px; border: 1px solid #00ff88; border-radius: 12px; background: rgba(0, 255, 136, 0.04);">
        <label class="lux-label" style="color: #00ff88; display: block; width: 100%; text-align: center; margin-bottom: 10px; font-weight: bold; font-size: 11px;">✅ ROBLOX ASSET ID HASIL UPLOAD:</label>
        <input type="text" readonly id="asset-id-input-${item.id}" class="lux-input asset-id-input" value="${formattedAssetId}" style="width: 100%; text-align: center; color: #00ff88; font-weight: bold; font-family: monospace; padding: 12px; margin-bottom: 10px; box-sizing: border-box; background: #000; border: 1px solid #00ff88; border-radius: 8px;" />
        <div style="display: flex; flex-direction: column; width: 100%; gap: 8px;">
          <button type="button" class="action-button copy-btn" data-action="copy-asset-id" data-id="${item.id}" style="background: #00ff88; color: #000; border: none; font-weight: bold; width: 100%; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">📋 COPY ASSET ID</button>
          <button type="button" class="primary-button rbxm-btn" data-action="download-rbxm" data-id="${item.id}" style="background: #141418; color: #00ff88; border: 1px solid #00ff88; font-weight: bold; width: 100%; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">📦 DOWNLOAD .RBXM</button>
        </div>
      </div>

      <div class="editor-duration-note">
        <div class="duration-block">
          <span>ORIGINAL</span>
          <strong>${formatDuration(item.duration || 0)}</strong>
        </div>
        <div class="duration-arrow">→</div>
        <div class="duration-block">
          <span>CURRENT SPEED</span>
          <strong id="adjusted-duration-${item.id}">${formatDuration(adjustedDuration)}</strong>
        </div>
      </div>

      <div class="editor-actions" style="margin-top: 20px;">
        <button class="action-button" type="button" data-action="reset-settings" data-id="${item.id}">Reset</button>
        <button class="action-button export-btn" type="button" data-action="export-audio" data-id="${item.id}">💾 Download File</button>
        <button class="primary-button upload-roblox-btn" type="button" data-action="upload-roblox" data-id="${item.id}">🚀 Upload to Roblox</button>
      </div>
    </div>
  `;
}

function getPreviewDuration(duration, speed) {
  const original = Number(duration) || 0;
  const safeSpeed = Number(speed) || 1;
  return original <= 0 ? 0 : original / safeSpeed;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatPitch(pitch) {
  const val = Number(pitch) || 0;
  if (val > 0) return `+${val} st`;
  if (val < 0) return `${val} st`;
  return "0 st";
}

function escapeHtml(val) {
  return String(val)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}