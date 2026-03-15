'use strict';
/**
 * build.js — Compilateur de documents HTML imprimables
 *
 * Chaque sous-dossier de documents/ est un document independant.
 * Le nom du dossier devient le nom du fichier de sortie et le titre du document.
 *
 * Convention de nommage des fragments :
 *   01-cover.html, 02-section.html ...
 *   Prefixe numerique = ordre. Nom apres le tiret = commentaire de section.
 *   Renommer en .html.off pour desactiver sans supprimer.
 *
 * Usage :
 *   node build.js                    <- compile tous les documents
 *   node build.js charte-graphique   <- compile un seul document
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = __dirname;
const DOCS_DIR    = path.join(ROOT, 'documents');
const DIST_DIR    = path.join(ROOT, 'dist');
const CSS_FILE    = path.join(ROOT, 'assets', 'css', 'shared.css');
const FONTS_URL_DEFAULT = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';

// config.js racine supprime — cfgFallback ci-dessous est le seul fallback

// Valeurs neutres utilisees quand un champ est vide dans la config du document
const cfgFallback = {
  marque: {
    nom:      'Ma Marque',
    nomLigne1:'Ma',
    nomLigne2:'Marque',
    tagline:  '',
    baseline: '',
    initiale: 'M',
    version:  '1.0',
    date:     '[Date]',
    auteur:   '[Votre nom]',
    role:     'Community Manager',
    logo:     'https://placehold.co/40x40?text=LOGO',
  },
  palette: {
    principale:    '#111111',
    principaleNom: 'Noir',
    secondaire:    '#555555',
    secondaireNom: 'Gris',
    accent:        '#FFFFFF',
    accentNom:     'Blanc',
    texte:         '#000000',
    texteNom:      'Encre',
    fond:          '#F5F5F5',
    fondNom:       'Blanc casse',
  },
  polices: {
    titres:    "'DM Serif Display', serif",
    titresNom: 'DM Serif Display',
    corps:     "'DM Sans', sans-serif",
    corpsNom:  'DM Sans',
  },
  meta: {
    figmaUrl:      '',
    fontsUrl:      'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
    didactiqueUrl: '../Charte-Graphique-Didactique.html',
  },
};

// Merge profond : les valeurs vides ("", null, undefined) dans local tombent sur fallback
function mergeConfig(defaults, local) {
  const out = {};
  for (const section of Object.keys(defaults)) {
    out[section] = {};
    for (const key of Object.keys(defaults[section])) {
      const v = local[section] && local[section][key];
      out[section][key] = (v !== undefined && v !== null && v !== '')
        ? v
        : defaults[section][key];
    }
    // Cles presentes dans local mais absentes de defaults
    if (local[section]) {
      for (const key of Object.keys(local[section])) {
        if (out[section][key] === undefined) out[section][key] = local[section][key];
      }
    }
  }
  return out;
}

// "charte-graphique" -> "Charte graphique"
function toTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

// Injecte data-side et page-num automatiquement dans un fragment
function processFragment(fragment, pageNum) {
  const side = pageNum % 2 === 1 ? 'left' : 'right';

  fragment = fragment.replace(/data-side="(left|right)"/, `data-side="${side}"`);
  if (!fragment.includes('data-side=')) {
    fragment = fragment.replace(/class="([^"]*figma-page[^"]*)"/, `class="$1" data-side="${side}"`);
  }
  fragment = fragment.replace(
    /<span class="page-num">Page \d+<\/span>/,
    `<span class="page-num">Page ${pageNum}</span>`
  );
  fragment = fragment.replace(
    /(<span class="print-section-header-name">[^<]*?)\d{2} —/,
    `$1${String(pageNum).padStart(2, '0')} —`
  );
  return fragment;
}

function buildDocument(docSlug) {
  const docDir    = path.join(DOCS_DIR, docSlug);
  const title     = toTitle(docSlug);
  const outFile   = path.join(DIST_DIR, `${docSlug}.html`);
  const localCfg = path.join(docDir, 'config.js');
  if (!fs.existsSync(localCfg)) {
    console.error(`  ERR  ${docSlug}  ->  config.js manquant dans documents/${docSlug}/`);
    process.exit(1);
  }
  const cfg = mergeConfig(cfgFallback, require(localCfg));
  cfg.meta.didactiqueUrl = `../Charte-Graphique-Didactique.html?doc=${docSlug}`;
  // Resoudre les chemins de logo relatifs au docDir -> relatifs a dist/
  if (cfg.marque.logo && cfg.marque.logo.startsWith('./')) {
    cfg.marque.logo = `../documents/${docSlug}/${cfg.marque.logo.slice(2)}`;
  }

  const fragments = fs.readdirSync(docDir)
    .filter(f => f.endsWith('.html'))
    .sort()
    .map(file => {
      const name    = file.replace(/^\d+-/, '').replace(/\.html$/, '');
      const comment = name.replace(/-/g, ' ').toUpperCase();
      return { file, comment };
    });

  const rawCss = fs.readFileSync(CSS_FILE, 'utf8');
  // Injection des variables de config dans le CSS
  const css = rawCss
    .replace(/--palette-principale:\s*[^;]+;/, `--palette-principale: ${cfg.palette.principale};`)
    .replace(/--palette-secondaire:\s*[^;]+;/, `--palette-secondaire: ${cfg.palette.secondaire};`)
    .replace(/--palette-accent:\s*[^;]+;/,     `--palette-accent: ${cfg.palette.accent};`)
    .replace(/--palette-texte:\s*[^;]+;/,       `--palette-texte: ${cfg.palette.texte};`)
    .replace(/--palette-fond:\s*[^;]+;/,        `--palette-fond: ${cfg.palette.fond};`)
    .replace(/--police-titres:\s*[^;]+;/,       `--police-titres: ${cfg.polices.titres};`)
    .replace(/--police-corps:\s*[^;]+;/,        `--police-corps: ${cfg.polices.corps};`);

  const sep = '='.repeat(48);
  let body  = '';

  fragments.forEach(({ file, comment }, i) => {
    let fragment = fs.readFileSync(path.join(docDir, file), 'utf8');
    fragment = processFragment(fragment, i + 1);
    // Resolution des marqueurs {{section.cle}}
    fragment = fragment.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, section, key) => {
      return (cfg[section] && cfg[section][key] !== undefined) ? cfg[section][key] : match;
    });

    // Remplacement des pictos logo par l'image SVG (sauf dans logo-interdits)
    if (!file.includes('logo-interdits')) {
      // div.logo-mark.gradient avec taille inline -> img
      fragment = fragment.replace(
        /<div class="logo-mark gradient"([^>]*)>[^<]*<\/div>/g,
        (match, attrs) => {
          const sizeM = attrs.match(/width:\s*(\d+)px/);
          const size = sizeM ? sizeM[1] : '40';
          const rrM = attrs.match(/border-radius:\s*(\d+)px/);
          const rr = rrM ? rrM[1] : '10';
          return `<img src="${cfg.marque.logo}" width="${size}" height="${size}" style="border-radius:${rr}px; display:block;" alt="${cfg.marque.nom}">`;
        }
      );
      // Avatars circulaires (ig-avatar, fb-avatar, li-avatar, email-sig-avatar)
      fragment = fragment.replace(
        /<div class="(ig-avatar|fb-avatar|li-avatar|email-sig-avatar)"([^>]*)>[^<]*<\/div>/g,
        (match, cls, attrs) => {
          const sizeM = attrs.match(/width:\s*(\d+)px/);
          const size = sizeM ? sizeM[1] : '32';
          return `<img src="${cfg.marque.logo}" width="${size}" height="${size}" class="${cls}" style="border-radius:50%; object-fit:cover;" alt="${cfg.marque.nom}">`;
        }
      );
      // ig-watermark et ig-watermark-dark
      fragment = fragment.replace(
        /<div class="(ig-watermark[^"]*)"([^>]*)>[^<]*<\/div>/g,
        (_m, cls) => `<img src="${cfg.marque.logo}" class="${cls}" alt="${cfg.marque.nom}">`
      );
      // card-logo-icon (carte de visite)
      fragment = fragment.replace(
        /<div class="(card-logo-icon[^"]*)">[^<]*<\/div>/g,
        (_m, cls) => `<img src="${cfg.marque.logo}" class="${cls}" alt="${cfg.marque.nom}">`
      );
      // logo-box (couverture)
      fragment = fragment.replace(
        /<div class="logo-box">[\s\S]*?<\/div>/,
        `<img src="${cfg.marque.logo}" class="logo-box" alt="${cfg.marque.nom}">`
      );
      // Logos inline dans email campagne et web landing (div style avec "B")
      fragment = fragment.replace(
        /<div style="[^"]*border-radius:\s*\d+px[^"]*">\s*B\s*<\/div>/g,
        (_m) => {
          const sizeM = _m.match(/width:\s*(\d+)px/);
          const size = sizeM ? sizeM[1] : '22';
          const rrM = _m.match(/border-radius:\s*(\d+)px/);
          const rr = rrM ? rrM[1] : '5';
          return `<img src="${cfg.marque.logo}" width="${size}" height="${size}" style="border-radius:${rr}px; display:block;" alt="${cfg.marque.nom}">`;
        }
      );
    }
    // Liens relatifs ecrits depuis documents/ -> corriges pour dist/
    fragment = fragment.replace(/href="\.\//g, 'href="../');
    body += `\n  <!-- ${sep}\n       ${comment}\n  ${sep} -->\n`;
    body += fragment + '\n';
  });

  const ctaPageNum = fragments.length + 1;
  body += `
  <!-- ================================================
       CTA TELECHARGEMENT
  ================================================ -->
  <div class="cta-block figma-page">
    <span class="page-num">Page ${ctaPageNum}</span>
    <div class="label" style="color:rgba(255,255,255,0.5);">Ressources</div>
    <h2 class="title">Telecharger ${title.toLowerCase()}</h2>
    <p class="desc" style="margin-bottom:0;">
      Imprimer ou sauvegarder cette page via votre navigateur (Ctrl+P &gt; Enregistrer en PDF).
    </p>
    <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
      <button class="btn-white" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Telecharger en PDF
      </button>
      <a class="btn-white" href="../Charte-Graphique-Didactique.html">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        Version didactique
      </a>
    </div>
    <p class="cta-note">PDF : A4 portrait — activer "Graphiques d'arriere-plan" dans les options d'impression</p>
    <div style="margin-top:24px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; gap:10px; font-size:0.7rem; color:rgba(255,255,255,0.45); font-family:'DM Sans',sans-serif;">
      Ressource pedagogique par
      <a href="https://www.alternative-rvb.com" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none; color:rgba(255,255,255,0.6); font-size:0.7rem; font-weight:600; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
        <span style="display:inline-flex; align-items:center; justify-content:center; background:#fff; border-radius:50%; width:24px; height:24px; flex-shrink:0;">
          <img src="https://www.alternative-rvb.com/images/logo.svg" alt="Alternative RVB" height="18" width="18" style="border-radius:50%; display:block;">
        </span>
        Alternative RVB
      </a>
    </div>
  </div>
`;

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link href="${cfg.meta.fontsUrl || FONTS_URL_DEFAULT}" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<div class="page">
${body}
</div><!-- /page -->
</body></html>`;

  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`  OK  ${docSlug}  (${fragments.length} pages)  ->  dist/${docSlug}.html`);
}

// --- Main ---
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);

const target = process.argv[2];

const docs = target
  ? [target]
  : fs.readdirSync(DOCS_DIR).filter(f => fs.statSync(path.join(DOCS_DIR, f)).isDirectory());

if (docs.length === 0) {
  console.error('Aucun document trouve dans documents/');
  process.exit(1);
}

console.log(`Build — ${docs.length} document(s)`);
docs.forEach(buildDocument);

// Genere dist/index.json avec la liste des documents disponibles
const allDocs = fs.readdirSync(DOCS_DIR).filter(f => fs.statSync(path.join(DOCS_DIR, f)).isDirectory());
const index = allDocs.map(slug => {
  const localCfgPath = path.join(DOCS_DIR, slug, 'config.js');
  const docCfg = fs.existsSync(localCfgPath)
    ? mergeConfig(cfgFallback, require(localCfgPath))
    : cfgFallback;
  return {
    slug,
    title:   toTitle(slug),
    file:    `./dist/${slug}.html`,
    meta:    { ...docCfg.meta, didactiqueUrl: `../Charte-Graphique-Didactique.html?doc=${slug}` },
    palette: {
      principale: docCfg.palette.principale,
      secondaire: docCfg.palette.secondaire,
      accent:     docCfg.palette.accent,
      texte:      docCfg.palette.texte,
      fond:       docCfg.palette.fond,
    },
  };
});
fs.writeFileSync(path.join(DIST_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
console.log(`  OK  dist/index.json  (${index.length} document(s))`);

console.log('Done.');
