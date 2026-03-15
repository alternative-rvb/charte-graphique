# TODO - Generateur de charte graphique

## Generateur

- [ ] Interface web de configuration
  - [ ] Color pickers pour la palette (principale, secondaire, accent, texte, fond)
  - [ ] Upload du logo (picto SVG/PNG)
  - [ ] Champs texte : nom de marque, baseline, initiale
  - [ ] Selection des polices (Google Fonts)
  - [ ] Apercu en temps reel
- [ ] API Node.js
  - [ ] Endpoint POST `/generate` qui ecrit `config.json` et lance `build.js`
  - [ ] Endpoint GET `/download` qui sert le fichier genere
- [ ] Bouton "Generer ma charte" + lien de telechargement PDF
- [ ] Deploiement sur Vercel

## Contenu

- [ ] Supprimer ou completer `15-aaa.html` (page placeholder Lorem ipsum)
- [ ] Ajouter meta description + Open Graph (image og:image a fournir)
- [ ] Pied de page : logo Alternative RVB + lien portfolio

## Logo

- [ ] Fournir le vrai `assets/logo-picto.svg` pour remplacer le placeholder
