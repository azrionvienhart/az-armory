/* =========================================================
   Az.Armory config — the ONLY file you edit to change links,
   videos, downloads, or add a new product.
   The Store menu, the home catalogue and the unlock gate all
   read from `products` below. Order = display order.
   ========================================================= */
window.AZ = {
  links: {
    discord:   'https://discord.gg/7NtGVHAx3A',
    youtube:   'https://www.youtube.com/@7Azrion',
    subscribe: 'https://www.youtube.com/@7Azrion?sub_confirmation=1',
    instagram: 'https://www.instagram.com/azrionvienhart'
  },

  // Cloudflare Worker that verifies Discord membership (see worker/SETUP.md).
  // Leave '' until it's deployed — the gate then runs in honor mode.
  workerUrl: '',

  // Fallback if Discord's live member count can't be loaded.
  discordMembersFallback: 6000,
  discordInviteCode: '7NtGVHAx3A',

  // Which product the Store menu shows as the big "Latest drop" card.
  latest: 'azware',

  products: {
    azware: {
      name: 'Azware',
      status: 'soon',                 // 'live' | 'soon' | 'new' | 'updated'  (set 'live' + download when ready)
      version: '1.0',
      category: 'Aim training planner',
      tagline: "Daily aim routines for Roblox Rivals, built from Aimlabs' official scenarios.",
      icon: 'assets/img/azware-icon.png',
      art: 'assets/img/azware-app.png',
      page: 'azware.html',
      features: ['Aimlabs · KovaaK\'s · Mobile', 'PSA sensitivity', 'Browser trainer'],
      demo: 'app/azware/index.html',
      // Paste the YouTube video ID (the part after watch?v=) once the video is out.
      videoId: '',
      // Set when the release is ready: 'https://github.com/azrionvienhart/az-armory/releases/latest/download/Azware.zip'
      download: ''
    },
    opticore: {
      name: 'OptiCore',
      status: 'soon',
      category: 'PC optimizer',
      tagline: "Scans your Windows PC for what's holding Roblox Rivals back, then fixes it in one click.",
      icon: 'assets/img/opticore-icon.png',
      art: 'assets/img/opticore-scan.png',
      page: 'opticore.html',
      features: ['Windows', 'Scan + fix', 'Built for Rivals'],
      videoId: '',
      download: ''
    }
  }
};
