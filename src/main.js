import "./style.css";
import { AudioProcessor } from "./engine/processor.js";
import { renderApiConfigPanel } from "./ui/apiPanel.js";
import { createEditor } from "./ui/controls.js";
import {
  generateRandomAssetTitle,
  downloadSoundRbxm
} from "./utils/robloxHelper.js";

window.targetType = localStorage.getItem("luxius_target_type") || "user";
window.setTargetType = function (type) {
  window.targetType = type;
  localStorage.setItem("luxius_target_type", type);
  const btnPersonal = document.getElementById("btn-target-personal");
  const btnGroup = document.getElementById("btn-target-group");
  const lblTarget = document.getElementById("lbl-target-id");
  if (type === "user") {
    if (btnPersonal) btnPersonal.classList.add("active");
    if (btnGroup) btnGroup.classList.remove("active");
    if (lblTarget) lblTarget.innerText = "USER ID (PERSONAL ACCOUNT)";
  } else {
    if (btnGroup) btnGroup.classList.add("active");
    if (btnPersonal) btnPersonal.classList.remove("active");
    if (lblTarget) lblTarget.innerText = "GROUP CREATOR ID (GROUP ACCOUNT)";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">L</div>
          <div class="brand-text">
            <strong>LUXIUS</strong>
            <span>AUDIO ENGINE V1.0</span>
          </div>
        </div>
        <div class="status-pill">
          <span class="status-dot"></span> ENGINE ONLINE
        </div>
      </header>
      <main class="workspace">
        <section class="hero">
          <p class="eyebrow">LUXIUS AUDIO ENGINE</p>
          <h1>Prepare your audio. <span>Simply.</span></h1>
          <p class="hero-description">
            Upload, organize and prepare your audio files in a clean workspace.
          </p>
        </section>
        <section class="upload-section">
          <div id="roblox-api-mount"></div>
          <div class="drop-zone" id="dropZone">
            <div class="upload-icon">↑</div>
            <h2>Drop your audio files here</h2>
            <p>MP3 · OGG · WAV · FLAC</p>
            <button class="primary-button" id="selectFilesBtn" type="button">Select Files</button>
            <input type="file" id="fileInput" multiple accept="audio/*" style="display: none;" />
            <div class="batch-counter"><span id="fileCount">0</span> / 8 FILES</div>
          </div>
        </section>
        <section class="queue-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">PROCESS QUEUE</p>
              <h2>Your audio files</h2>
            </div>
            <button class="ghost-button" id="clearAllBtn" type="button">Clear All</button>
          </div>
          <div class="queue" id="queueContainer"></div>
        </section>
      </main>
      <footer class="footer">
        <span>LUXIUS TEAM</span>
        <span>AUDIO ENGINE V1.0</span>
      </footer>
    </div>
  `;

  const apiMount = document.getElementById("roblox-api-mount");
  if (apiMount) {
    apiMount.innerHTML = renderApiConfigPanel();
    window.setTargetType(window.targetType);
    const saveBtn = document.getElementById("btn-save-api-config");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const apiKey = document.getElementById("global-api-key")?.value?.trim() || "";
        const targetId = document.getElementById("global-target-id")?.value?.trim() || "";
        localStorage.setItem("luxius_api_key", apiKey);
        localStorage.setItem("luxius_target_id", targetId);
        alert("💾 API Key & Creator ID tersimpan di LocalStorage!");
      });
    }
  }

  const processor = new AudioProcessor();
  const queueItems = [];
  let currentPlayingId = null;

  const fileInput = document.getElementById("fileInput");
  const selectFilesBtn = document.getElementById("selectFilesBtn");
  const queueContainer = document.getElementById("queueContainer");
  const fileCountEl = document.getElementById("fileCount");
  const clearAllBtn = document.getElementById("clearAllBtn");

  selectFilesBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
    fileInput.value = "";
  });

  function handleFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|ogg|wav|flac)$/i)) continue;
      const item = {
        id: "audio_" + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        url: URL.createObjectURL(file),
        duration: 0,
        settings: { speed: 1, pitch: 0, volume: 1 },
        isEditorOpen: false,
        uploadedAssetId: null,
        format: "ogg",
        statusText: "STATUS: READY TO PROCESS",
        statusClass: "status-ready"
      };
      const tempAudio = new Audio(item.url);
      tempAudio.addEventListener("loadedmetadata", () => {
        item.duration = tempAudio.duration;
        renderQueue();
      });
      queueItems.push(item);
    }
    renderQueue();
  }

  function renderQueue() {
    fileCountEl.innerText = queueItems.length;
    if (queueItems.length === 0) {
      queueContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎵</div>
          <h3>No audio files added</h3>
          <p>Drop your audio files above to start editing.</p>
        </div>
      `;
      return;
    }
    queueContainer.innerHTML = queueItems.map((item) => `
      <div class="queue-item" id="item-${item.id}">
        <div class="file-icon">♪</div>
        <div class="file-main">
          <span class="file-name" style="font-weight: bold;">${item.name}</span>
          <div class="file-meta">${item.size}</div>
        </div>
        <div class="file-actions">
          <button class="action-button" data-action="toggle-editor" data-id="${item.id}">
            ${item.isEditorOpen ? "Close" : "⚙ Edit"}
          </button>
          <button class="remove-button" data-action="remove-item" data-id="${item.id}">×</button>
        </div>
        ${item.isEditorOpen ? createEditor(item) : ""}
      </div>
    `).join("");

    attachEventListeners();

    if (currentPlayingId) {
      updatePlaybackUI(currentPlayingId, true);
    }
  }

  // 🔑 UPDATE STATUS BADGE SECARA REAL-TIME TANPA RE-RENDER DOM GLITCH
  function updateItemStatus(id, text, badgeClass) {
    const item = queueItems.find(q => q.id === id);
    if (item) {
      item.statusText = text;
      item.statusClass = badgeClass;
      
      const badgeEl = document.getElementById(`status-badge-${id}`);
      if (badgeEl) {
        badgeEl.innerText = text;
        badgeEl.className = `status-badge ${badgeClass}`;
      }
    }
  }

  function attachEventListeners() {
    queueContainer.onclick = async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const item = queueItems.find((q) => q.id === id);

      if (action === "toggle-editor") {
        item.isEditorOpen = !item.isEditorOpen;
        if (!item.isEditorOpen && currentPlayingId === id) {
          processor.stop();
          currentPlayingId = null;
        }
        renderQueue();
      } else if (action === "close-editor") {
        item.isEditorOpen = false;
        if (currentPlayingId === id) {
          processor.stop();
          currentPlayingId = null;
        }
        renderQueue();
      } else if (action === "remove-item") {
        const idx = queueItems.findIndex((q) => q.id === id);
        if (idx !== -1) queueItems.splice(idx, 1);
        if (currentPlayingId === id) {
          processor.stop();
          currentPlayingId = null;
        }
        renderQueue();
      } else if (action === "editor-play") {
        await processor.play(item.url, item.settings);
        updatePlaybackUI(id, true);
      } else if (action === "editor-pause") {
        processor.pause();
        updatePlaybackUI(id, false);
      } else if (action === "editor-stop") {
        processor.stop();
        updatePlaybackUI(id, false);
      } else if (action === "reset-settings") {
        item.settings.speed = 1.0;
        processor.setSpeed(1.0);
        renderQueue();
      } else if (action === "export-audio") {
        exportAudioFile(item);
      } else if (action === "upload-roblox") {
        uploadToRobloxCloud(item);
      } else if (action === "copy-asset-id") {
        const input = document.getElementById(`asset-id-input-${id}`);
        if (input && input.value) {
          navigator.clipboard.writeText(input.value);
          btn.innerText = "✓ BERHASIL DICOPY!";
          setTimeout(() => (btn.innerText = "📋 COPY ASSET ID"), 2000);
        }
      } else if (action === "download-rbxm") {
        if (item.uploadedAssetId) {
          downloadSoundRbxm(item.uploadedAssetId, item.name);
        }
      }
    };

    queueContainer.oninput = (e) => {
      const input = e.target;
      const control = input.dataset.control;
      const id = input.dataset.id;
      const item = queueItems.find((q) => q.id === id);
      if (!item) return;

      if (control === "format") {
        item.format = input.value;
      } else if (control === "speed") {
        const val = parseFloat(input.value);
        item.settings.speed = val;
        processor.setSpeed(val);
        const el = document.getElementById(`speed-value-${id}`);
        if (el) el.innerText = val.toFixed(2) + "x";

        const durEl = document.getElementById(`adjusted-duration-${id}`);
        if (durEl && item.duration) {
          const mins = Math.floor((item.duration / val) / 60);
          const secs = Math.floor((item.duration / val) % 60);
          durEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      }
    };

    processor.onStateChange = (state) => {
      if (currentPlayingId) {
        updatePlaybackUI(currentPlayingId, state === "playing");
      }
    };
  }

  function updatePlaybackUI(id, isPlaying) {
    if (isPlaying) {
      currentPlayingId = id;
    } else if (currentPlayingId === id) {
      currentPlayingId = null;
    }
    const playBtn = document.getElementById(`play-btn-${id}`);
    const pauseBtn = document.getElementById(`pause-btn-${id}`);
    if (playBtn && pauseBtn) {
      playBtn.style.display = isPlaying ? "none" : "inline-flex";
      pauseBtn.style.display = isPlaying ? "inline-flex" : "none";
    }
  }

  async function uploadToRobloxCloud(item) {
    const apiKey = document.getElementById("global-api-key")?.value?.trim() || localStorage.getItem("luxius_api_key");
    const targetId = document.getElementById("global-target-id")?.value?.trim() || localStorage.getItem("luxius_target_id");
    const workerUrl = 'https://roblox-audio-proxy.anggadwicandra855.workers.dev';

    if (!apiKey || !targetId) {
      alert("⚠️ Mohon isi API Key & Creator ID di Panel API Configuration!");
      return;
    }

    updateItemStatus(item.id, `STATUS: PROCESSING AUDIO & CHECKING SIZE...`, "status-processing");

    try {
      await processor.loadBuffer(item.url);
      const renderedBuffer = await processor.renderOffline(item.settings);
      
      const rawWavBytes = processor.audioBufferToWavBlob(renderedBuffer);
      let finalBlob = new Blob([rawWavBytes], { type: 'audio/wav' });

      const sizeMB = (finalBlob.size / (1024 * 1024));
      if (sizeMB > 19.5) {
        throw new Error(`Ukuran file audio terlalu besar (${sizeMB.toFixed(2)} MB). Maksimal limit Roblox adalah 20 MB.`);
      }

      const randomTitle = generateRandomAssetTitle();
      const metadata = {
        assetType: 'Audio',
        displayName: randomTitle,
        description: 'Uploaded via Luxius Audio Engine',
        creationContext: {
          creator: window.targetType === 'group' ? { groupId: targetId } : { userId: targetId }
        }
      };

      const formData = new FormData();
      formData.append('request', JSON.stringify(metadata));
      formData.append('fileContent', finalBlob, `audio.wav`);

      updateItemStatus(item.id, `STATUS: UPLOADING TO ROBLOX CLOUD...`, "status-processing");

      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'x-target-url': 'https://apis.roblox.com/assets/v1/assets'
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.message || data.error || JSON.stringify(data);
        throw new Error(`Roblox API Rejected: ${errorMsg}`);
      }

      let assetId = data.assetId || data.response?.assetId;
      if (!assetId && data.path) {
        const operationPath = data.path;
        updateItemStatus(item.id, `STATUS: ASYNC POLLING ID FROM ROBLOX...`, "status-processing");
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const pollRes = await fetch(workerUrl, {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'x-target-url': `https://apis.roblox.com/assets/v1/${operationPath}`
            }
          });
          const pollData = await pollRes.json();
          if (pollData.done) {
            assetId = pollData.response?.assetId;
            break;
          }
        }
      }

      if (!assetId) {
        throw new Error("Gagal mendapatkan Asset ID dari Roblox Dashboard.");
      }

      item.uploadedAssetId = assetId;
      updateItemStatus(item.id, `STATUS: UPLOAD SUCCESSFUL (${sizeMB.toFixed(2)} MB)!`, "status-success");

      // Buka otomatis kotak Roblox Asset ID setelah sukses
      const resultBox = document.getElementById(`result-box-${item.id}`);
      const assetInput = document.getElementById(`asset-id-input-${item.id}`);
      if (resultBox && assetInput) {
        assetInput.value = `rbxassetid://${assetId}`;
        resultBox.style.display = 'flex';
      }
    } catch (err) {
      item.uploadedAssetId = null;
      updateItemStatus(item.id, `STATUS: UPLOAD FAILED!`, "status-error");
      alert("⚠️ Detail Error Upload:\n" + err.message);
    }
  }

  async function exportAudioFile(item) {
    updateItemStatus(item.id, `STATUS: RENDERING AUDIO...`, "status-processing");
    try {
      await processor.loadBuffer(item.url);
      const renderedBuffer = await processor.renderOffline(item.settings);
      const rawWavBytes = processor.audioBufferToWavBlob(renderedBuffer);
      const blob = new Blob([rawWavBytes], { type: 'audio/wav' });

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${item.name.replace(/\.[^/.]+$/, "")}_edited.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      updateItemStatus(item.id, `STATUS: EXPORT SUCCESS!`, "status-success");
    } catch (err) {
      updateItemStatus(item.id, "STATUS: EXPORT FAILED!", "status-error");
      alert("Error export audio: " + err.message);
    }
  }

  clearAllBtn.addEventListener("click", () => {
    queueItems.length = 0;
    if (currentPlayingId) {
      processor.stop();
      currentPlayingId = null;
    }
    renderQueue();
  });
});