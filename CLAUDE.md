# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Projet charte graphique Community Manager

Charte graphique interactive pour Community Manager, avec une version document (charte-graphique.html) et une version pédagogique annotée (Didactique).

## Commandes

```bash
node build.js                    # compile tous les documents
node build.js charte-graphique   # compile un seul document
```

Le build doit être lancé depuis la racine du projet (là où se trouve `build.js`).

## Structure des fichiers

```text
charte-graphique/
  documents/
    charte-graphique/               <- fragments du document principal
      config.js                     <- configuration de la marque pour ce document
      logo-picto.svg                <- picto logo spécifique à ce document
      01-cover.html ... 14-web-landing.html
    doc-demo/                       <- document de démonstration
    doc-fallback/                   <- document avec valeurs neutres (fallback)
  assets/
    css/
      shared.css                    <- CSS du document (injecté inline par build.js)
      didactic.css                  <- CSS de la couche didactique uniquement
    favicon.svg
    logo-picto.svg                  <- picto logo global (placeholder)
  dist/
    charte-graphique.html           <- GÉNÉRÉ par build.js, ne pas éditer à la main
    doc-demo.html                   <- GÉNÉRÉ
    doc-fallback.html               <- GÉNÉRÉ
    index.json                      <- index des documents générés (GÉNÉRÉ)
  build.js                          <- script d'assemblage générique
  Charte-Graphique-Didactique.html  <- shell pédagogique, éditer directement
  Charte-Graphique-FIGMA-File.html  <- version Figma
  TODO.md
```

## Configuration de la marque

Chaque document a son propre `documents/<slug>/config.js` (format CommonJS, `module.exports`). Il n'y a pas de `config.json` à la racine.

Les champs disponibles dans `config.js` :

```js
module.exports = {
  marque: {
    nom, nomLigne1, nomLigne2, tagline, baseline,
    initiale, version, date, auteur, role, logo,  // logo: chemin relatif au docDir (ex: './logo-picto.svg')
  },
  palette: {
    principale, principaleNom,
    secondaire, secondaireNom,
    accent, accentNom,
    texte, texteNom,
    fond, fondNom,
  },
  polices: {
    titres, titresNom, corps, corpsNom,
  },
  meta: {
    figmaUrl,       // URL Figma externe
    fontsUrl,       // URL Google Fonts (optionnel, a une valeur par défaut)
    didactiqueUrl,  // généré automatiquement par build.js
  },
};
```

`build.js` merge la config locale avec des valeurs `cfgFallback` internes : les champs vides (`""`, `null`, `undefined`) tombent sur le fallback.

## Workflow

### Modifier une section existante

1. Éditer le fragment dans `documents/charte-graphique/` (ex. `03-couleurs.html`)
2. `node build.js`
3. `dist/charte-graphique.html` est régénéré
4. `Charte-Graphique-Didactique.html` se met à jour au prochain chargement (fetch)

### Ajouter une page

1. Créer `documents/charte-graphique/NN-nom-de-la-page.html`
2. Le préfixe numérique définit l'ordre, le nom après le tiret devient le commentaire de section
3. `node build.js`

### Désactiver une page sans la supprimer

Renommer le fichier en `.html.off`.

### Ajouter un nouveau document

1. Créer `documents/<slug>/` avec un `config.js` et les fragments HTML
2. `node build.js` compile automatiquement tous les sous-dossiers de `documents/`

### Modifier le CSS du document

- Éditer `assets/css/shared.css` puis `node build.js`

### Modifier le CSS de la couche didactique

- Éditer `assets/css/didactic.css` directement (pas de build nécessaire)

## Architecture technique

### build.js

Compilateur Node.js (sans dépendances) qui :

- Scanne `documents/` pour trouver les sous-dossiers, chacun devient un document
- Charge `config.js` du dossier (obligatoire, le build échoue si absent)
- Merge la config locale avec `cfgFallback` interne (valeurs neutres)
- Injecte les variables CSS `--palette-*` et `--police-*` dans `shared.css`
- Remplace les tokens `{{marque.nom}}`, `{{palette.principale}}` etc. dans les fragments
- Remplace les blocs picto HTML par `<img src="...logo-picto.svg">`
- Auto-numérote les pages et alterne `data-side` left/right
- Corrige les liens relatifs (`./` -> `../`) pour le contexte `dist/`
- Ajoute un CTA final (téléchargement PDF + lien didactique)
- Génère `dist/<slug>.html` (self-contained) et `dist/index.json`

### dist/charte-graphique.html

Fichier self-contained :

- CSS de `shared.css` injecté inline avec variables de config
- Fragments concaténés dans l'ordre alphabétique des fichiers
- Importable dans le plugin Figma `html.to.design`

### Charte-Graphique-Didactique.html

Shell HTML autonome qui :

- `fetch()` un document depuis `dist/` au chargement (paramètre `?doc=<slug>`)
- Injecte le CSS et le contenu body du document fetché
- Lit les `data-` attributes sur chaque `.figma-page` pour construire les popups
- Layout 3 colonnes : sidebar fixe (300px) | contenu centré (842px) | aside popup (300px)
- Scrollspy sur les sections avec animation slide droite->gauche sur les popups

#### Source des popups

Définies sur chaque `.figma-page` via des `data-` attributes :

```html
<div
  id="couleurs"
  class="figma-page"
  data-icon="..."
  data-title="Titre de la popup"
  data-tip="Conseil pratique"
  data-warn="Erreur fréquente"
  data-badges="ok:Indispensable,opt:Optionnel"
  title="Texte du corps de la popup"
></div>
```

- `data-side` : ne pas définir manuellement (alternance gérée automatiquement par `build.js`)
- `data-badges` : format `type:Libellé` séparés par `,` (`ok` = vert, `opt` = gris)
- `title` : corps de la popup (texte long)
- Les `data-` attributes sont ignorés par le plugin `html.to.design`

## Roadmap

- Interface web de configuration (color pickers, upload logo, champs marque)
- API Node.js côté serveur qui expose `build.js` via un endpoint POST `/generate`
- Bouton "Générer" + lien de téléchargement du PDF généré
- Déploiement sur Vercel
