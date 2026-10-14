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
  workerUrl: 'https://azarmory-gate.azrion.workers.dev',

  // Fallback if Discord's live member count can't be loaded.
  discordMembersFallback: 6000,
  discordInviteCode: '7NtGVHAx3A',

  // Which product the Store menu shows as the big "Latest drop" card.
  latest: 'azware',

  products: {
    azware: {
      name: 'Azware',
      status: 'live',                 // 'live' | 'soon' | 'new' | 'updated'
      version: '1.0',
      category: 'Aim training planner',
      tagline: "Daily aim routines for Roblox Rivals, built from Aimlabs' official scenarios.",
      icon: 'assets/img/azware-icon.png',
      art: 'assets/img/azware-app.png',
      page: 'azware.html',
      features: ['PC + Mobile', 'Aimlabs · KovaaK\'s · Mobile drills', 'PSA sensitivity'],
      demo: 'app/azware/index.html',
      // Each version has its own download + video. The site shows a PC / Mobile picker.
      // videoId = the part after watch?v= in the YouTube link.
      platforms: {
        pc: {
          label: 'PC', short: 'Windows', system: 'Windows 10 / 11 (64-bit)', status: 'live', version: '1.0',
          size: '1.1 MB', format: 'zip',
          // the file is stored privately on the Cloudflare worker (worker/files) and only handed out after the password + Discord check
          download: true,
          videoId: '',
          perks: ['Desktop app with its own window', '3D aim trainer', 'Progress saved on your PC']
        },
        mobile: {
          label: 'Mobile', short: 'Android APK', system: 'Android (APK)', status: 'soon',
          download: '',
          videoId: '',
          perks: ['Android app, installed from an APK', 'Built for touch, with mobile drills for Rivals', 'Same daily quests']
        }
      }
    },    opticore: {
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
