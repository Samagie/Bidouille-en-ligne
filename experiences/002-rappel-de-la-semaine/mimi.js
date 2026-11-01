/* Mimi en SVG : un chat assis, de face, avec l'accessoire de son rôle.
   Dans Chez Miaouss, on remplacera ce dessin par avatar(humeur, rôle). */
(() => {
  "use strict";

  const COULEURS = {
    pelage: "#9a9cb0",
    rayures: "#6c6f86",
    ventre: "#eceaf2",
    trait: "#2b2730",
    nez: "#e98b8b",
    oreille: "#f3b8b8",
    joues: "#f4a894",
    accent: "#f4a894",
  };

  // Accessoires derrière la tête (dessinés avant elle) et devant (après elle).
  const ROLES = {
    hote: {
      devant: (c) => `
        <g transform="rotate(14 124 30)">
          <rect x="98" y="33" width="50" height="7" rx="3" fill="#2b2730"/>
          <rect x="107" y="4" width="32" height="32" rx="3" fill="#2b2730"/>
          <rect x="107" y="26" width="32" height="6" fill="${c.accent}"/>
        </g>`,
    },
    banquier: {
      devant: () => `
        <circle cx="120" cy="84" r="13" fill="rgba(255,255,255,.18)" stroke="#c9a227" stroke-width="3"/>
        <path d="M133 88 Q 146 112 131 130" fill="none" stroke="#c9a227" stroke-width="2"/>
        <path d="M60 40 Q 100 18 140 40 L 136 50 Q 100 34 64 50 Z" fill="#3f8f5b"/>`,
    },
    coach: {
      devant: () => `
        <path d="M50 66 Q 100 46 150 66 L 150 77 Q 100 57 50 77 Z" fill="#e5484d"/>
        <path d="M84 126 Q 100 148 116 126" fill="none" stroke="#2b2730" stroke-width="2"/>
        <rect x="93" y="139" width="18" height="11" rx="5" fill="#f2c94c" stroke="#b8901b" stroke-width="1.5"/>`,
    },
    chef: {
      devant: () => `
        <path d="M62 36 C 46 12 74 -6 88 9 C 95 -8 122 -6 117 11 C 134 -2 156 14 138 36 Z" fill="#ffffff" stroke="#dcd7d2" stroke-width="2"/>
        <rect x="64" y="30" width="72" height="17" rx="5" fill="#ffffff" stroke="#dcd7d2" stroke-width="2"/>`,
    },
    majordome: {
      devant: () => `
        <path d="M100 131 L 78 120 L 78 142 Z M100 131 L 122 120 L 122 142 Z" fill="#2b2730" stroke="#2b2730" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="100" cy="131" r="5.5" fill="#46404d"/>`,
    },
    veto: {
      devant: () => `
        <path d="M76 124 Q 72 158 100 162 Q 128 158 124 124" fill="none" stroke="#5b6b7a" stroke-width="3.5"/>
        <circle cx="100" cy="166" r="8" fill="#c7d0d9" stroke="#5b6b7a" stroke-width="2.5"/>
        <path d="M58 46 Q 100 26 142 46" fill="none" stroke="#5b6b7a" stroke-width="3"/>
        <circle cx="100" cy="35" r="9" fill="#e9eef2" stroke="#5b6b7a" stroke-width="2.5"/>`,
    },
    critique: {
      devant: () => `
        <path d="M54 52 C 56 22 144 18 150 50 C 124 38 80 40 54 52 Z" fill="#2b2730"/>
        <path d="M97 24 L 100 13 L 103 24 Z" fill="#2b2730"/>
        <circle cx="80" cy="85" r="12" fill="none" stroke="#2b2730" stroke-width="2.5"/>
        <circle cx="120" cy="85" r="12" fill="none" stroke="#2b2730" stroke-width="2.5"/>
        <path d="M92 84 L 108 84" stroke="#2b2730" stroke-width="2.5"/>`,
    },
    dj: {
      devant: (c) => `
        <path d="M50 86 C 46 18 154 18 150 86" fill="none" stroke="#2b2730" stroke-width="8" stroke-linecap="round"/>
        <rect x="38" y="70" width="20" height="34" rx="8" fill="${c.accent}" stroke="#2b2730" stroke-width="3"/>
        <rect x="142" y="70" width="20" height="34" rx="8" fill="${c.accent}" stroke="#2b2730" stroke-width="3"/>`,
    },
    paparazzi: {
      devant: () => `
        <path d="M80 140 Q 66 124 84 118 M120 140 Q 134 124 116 118" fill="none" stroke="#2b2730" stroke-width="3"/>
        <rect x="84" y="131" width="11" height="7" rx="1.5" fill="#2b2730"/>
        <rect x="76" y="136" width="48" height="32" rx="6" fill="#2b2730"/>
        <circle cx="100" cy="152" r="11" fill="#4b5563" stroke="#aeb7c2" stroke-width="3"/>
        <circle cx="96" cy="148" r="3" fill="#dfe6ee"/>`,
    },
    juge: {
      devant: () => `
        <g fill="#f4f1ea" stroke="#d6cfc0" stroke-width="2">
          <circle cx="50" cy="70" r="11"/><circle cx="46" cy="89" r="11"/><circle cx="48" cy="108" r="11"/><circle cx="53" cy="125" r="10"/>
          <circle cx="150" cy="70" r="11"/><circle cx="154" cy="89" r="11"/><circle cx="152" cy="108" r="11"/><circle cx="147" cy="125" r="10"/>
          <path d="M54 56 C 66 30 134 30 146 56 C 128 46 72 46 54 56 Z"/>
        </g>`,
    },
    meteo: {
      derriere: () => `
        <path d="M58 206 C 50 160 64 118 100 114 C 136 118 150 160 142 206 Z" fill="#f2c230" stroke="#d9a90c" stroke-width="2"/>
        <path d="M100 120 L 100 204" stroke="#d9a90c" stroke-width="2"/>
        <circle cx="100" cy="150" r="3" fill="#d9a90c"/><circle cx="100" cy="176" r="3" fill="#d9a90c"/>`,
      devant: () => `
        <path d="M42 104 C 34 40 70 16 100 16 C 130 16 166 40 158 104 C 150 80 138 62 100 60 C 62 62 50 80 42 104 Z" fill="#f2c230" stroke="#d9a90c" stroke-width="2"/>`,
    },
  };

  function yeux(humeur, c) {
    if (humeur === "content") {
      return `<path d="M71 87 Q 80 75 89 87 M111 87 Q 120 75 129 87" fill="none" stroke="${c.trait}" stroke-width="4.5" stroke-linecap="round"/>`;
    }
    if (humeur === "endormi") {
      return `<path d="M71 84 Q 80 92 89 84 M111 84 Q 120 92 129 84" fill="none" stroke="${c.trait}" stroke-width="4" stroke-linecap="round"/>`;
    }
    if (humeur === "surpris") {
      return `<circle cx="80" cy="84" r="10.5" fill="#fff" stroke="${c.trait}" stroke-width="2.5"/><circle cx="80" cy="85" r="5.5" fill="${c.trait}"/>
              <circle cx="120" cy="84" r="10.5" fill="#fff" stroke="${c.trait}" stroke-width="2.5"/><circle cx="120" cy="85" r="5.5" fill="${c.trait}"/>`;
    }
    return `<ellipse cx="80" cy="84" rx="7.5" ry="9.5" fill="${c.trait}"/><circle cx="82.5" cy="80.5" r="2.6" fill="#fff"/>
            <ellipse cx="120" cy="84" rx="7.5" ry="9.5" fill="${c.trait}"/><circle cx="122.5" cy="80.5" r="2.6" fill="#fff"/>`;
  }

  /**
   * @param {object} o
   * @param {string} [o.role]     hote, banquier, coach, chef, majordome, veto, critique, dj, paparazzi, juge, meteo
   * @param {string} [o.humeur]   normal, content, endormi, surpris
   * @param {object} [o.couleurs] remplace des couleurs de COULEURS
   * @param {boolean} [o.anime]   ajoute les classes d'animation (clignement, queue, oreille)
   */
  function mimi({ role = "hote", humeur = "normal", couleurs = {}, anime = true } = {}) {
    const c = { ...COULEURS, ...couleurs };
    const r = ROLES[role] || {};
    const a = (classe) => (anime ? ` class="${classe}"` : "");
    const bouche = humeur === "surpris"
      ? `<ellipse cx="100" cy="113" rx="4" ry="5" fill="${c.trait}"/>`
      : `<path d="M100 104 Q 100 111 93 112 M100 104 Q 100 111 107 112" fill="none" stroke="${c.trait}" stroke-width="2.6" stroke-linecap="round"/>`;
    const dodo = humeur === "endormi"
      ? `<g${a("rs-mimi-zzz")} fill="${c.trait}" font-family="sans-serif" font-weight="700"><text x="150" y="40" font-size="22">z</text><text x="166" y="22" font-size="15">z</text></g>`
      : "";
    return `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mimi">
  <g${a("rs-mimi-queue")}><path d="M132 192 C 172 198 190 166 178 136 C 173 124 166 118 158 117" fill="none" stroke="${c.pelage}" stroke-width="16" stroke-linecap="round"/>
    <path d="M171 126 C 168 121 163 118 158 117" fill="none" stroke="${c.rayures}" stroke-width="16" stroke-linecap="round"/></g>
  <path d="M58 206 C 50 160 64 118 100 114 C 136 118 150 160 142 206 Z" fill="${c.pelage}"/>
  <ellipse cx="100" cy="170" rx="25" ry="32" fill="${c.ventre}"/>
  <ellipse cx="83" cy="206" rx="15" ry="9" fill="${c.pelage}"/><ellipse cx="117" cy="206" rx="15" ry="9" fill="${c.pelage}"/>
  <path d="M78 206 L 78 212 M88 206 L 88 212 M112 206 L 112 212 M122 206 L 122 212" stroke="${c.rayures}" stroke-width="2" stroke-linecap="round"/>
  ${r.derriere ? r.derriere(c) : ""}
  <g${a("rs-mimi-oreille")}><path d="M56 68 L 58 18 L 94 46 Z" fill="${c.pelage}" stroke="${c.pelage}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M64 58 L 65 32 L 84 47 Z" fill="${c.oreille}"/></g>
  <path d="M144 68 L 142 18 L 106 46 Z" fill="${c.pelage}" stroke="${c.pelage}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M136 58 L 135 32 L 116 47 Z" fill="${c.oreille}"/>
  <path d="M46 88 C 46 52 72 38 100 38 C 128 38 154 52 154 88 C 154 118 128 130 100 130 C 72 130 46 118 46 88 Z" fill="${c.pelage}"/>
  <path d="M92 44 L 95 58 M100 42 L 100 58 M108 44 L 105 58" stroke="${c.rayures}" stroke-width="4" stroke-linecap="round"/>
  <path d="M48 82 L 60 84 M47 92 L 59 92" stroke="${c.rayures}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M152 82 L 140 84 M153 92 L 141 92" stroke="${c.rayures}" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="68" cy="101" rx="9" ry="5.5" fill="${c.joues}" opacity=".55"/><ellipse cx="132" cy="101" rx="9" ry="5.5" fill="${c.joues}" opacity=".55"/>
  <g${a("rs-mimi-yeux")}>${yeux(humeur, c)}</g>
  <path d="M94.5 97.5 L 105.5 97.5 L 100 104 Z" fill="${c.nez}" stroke="${c.nez}" stroke-width="2" stroke-linejoin="round"/>
  ${bouche}
  <path d="M77 104 L 42 98 M77 109 L 42 111 M123 104 L 158 98 M123 109 L 158 111" stroke="${c.trait}" stroke-width="1.8" stroke-linecap="round" opacity=".45"/>
  ${r.devant ? r.devant(c) : ""}
  ${dodo}
</svg>`;
  }

  window.RS = window.RS || {};
  window.RS.mimi = mimi;
  window.RS.ROLES_MIMI = Object.keys(ROLES);
})();
