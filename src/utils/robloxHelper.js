// ============================================================
// 🤖 LUXIUS ROBLOX HELPER (ANTI-TITLE MATCH & RBXM GENERATOR)
// ============================================================

// 1. GENERATE RANDOM ASSET TITLE (SECURITY ANTI-FLAG)
export function generateRandomAssetTitle() {
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LX_AUDIO_${randomHex}`;
}

// 2. GENERATE AND DOWNLOAD ROBLOX .RBXM MODEL FILE
export function downloadSoundRbxm(assetId, songName) {
  const cleanId = String(assetId).replace(/\D/g, "");
  const formattedAssetUrl = `rbxassetid://${cleanId}`;

  // Formating XML RBXM murni standar Roblox Studio
  const rbxmContent = `<?xml version="1.0" encoding="utf-8"?>
<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">
	<External>null</External>
	<External>nil</External>
	<Item class="Sound" referent="RBX_LUXIUS_SOUND">
		<Properties>
			<string name="Name">${escapeXml(songName || "LuxiusAudio")}</string>
			<Content name="SoundId"><url>${formattedAssetUrl}</url></Content>
			<float name="Volume">0.8</float>
			<float name="PlaybackSpeed">1</float>
			<bool name="Looped">false</bool>
			<bool name="Playing">false</bool>
			<BinaryString name="Tags"></BinaryString>
		</Properties>
	</Item>
</roblox>`;

  const blob = new Blob([rbxmContent], { type: "model/x-rbxm" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${songName || "LuxiusAudio"}_Sound.rbxm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}
