export function createEditor(item) {
  const speed = Number(item.settings.speed) || 1;
  const pitch = Number(item.settings.pitch) || 0;
  const volume = Number(item.settings.volume) ?? 1;
  const adjustedDuration = getPreviewDuration(item.duration, speed);

  return `
    <div class="audio-editor" data-editor="${item.id}">
      <div class="editor-header">
        <div class="editor-title-wrap">
          <p class="eyebrow">AUDIO EDITOR</p>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <button class="editor-close" type="button" data-action="close-editor" data-id="${item.id}">×</button>
      </div>

      <div class="status-pipeline-bar" id="status-bar-${item.id}">
        <span class="status-badge status-ready" id="status-badge-${item.id}">STATUS: READY TO PROCESS</span>
      </div>

      <div class="editor-player">
        <div class="playback-controls">
          <button class="playback-button play-control" type="button" data-action="editor-play" data-id="${item.id}">▶</button>
          <button class="playback-button pause-control" type="button" data-action="editor-pause" data-id="${item.id}" hidden>Ⅱ</button>
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

        <!-- VOLUME BOOST (0% - 200%) -->
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
          <select class="lux-select" id="format-select-${item.id}">
            <option value="ogg" selected>OGG (.ogg) - Recommended for Roblox</option>
            <option value="mp3">MP3 (.mp3)</option>
            <option value="wav">WAV (.wav)</option>
            <option value="flac">FLAC (.flac)</option>
          </select>
        </div>
      </div>

      <!-- RESULT BOX (AUTO ACTIVE PAS UPLOAD SUCCESS) -->
      <div class="roblox-result-box" id="result-box-${item.id}" style="display: none; margin-top: 15px;">
        <label class="lux-label">ROBLOX ASSET ID RESULT</label>
        <div class="copy-input-group" style="display: flex; gap: 8px;">
          <input type="text" readonly id="asset-id-input-${item.id}" class="lux-input asset-id-input" value="" />
          <button type="button" class="action-button copy-btn" data-action="copy-asset-id" data-id="${item.id}">📋 COPY ID</button>
          <button type="button" class="primary-button rbxm-btn" data-action="download-rbxm" data-id="${item.id}">📦 DOWNLOAD .RBXM</button>
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

function formatPitch(pitch) {
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
