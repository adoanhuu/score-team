# Score Team Arc

Application web mobile pour saisir les scores d'une équipe sur un parcours Nature, Campagne ou 3D en tir à l'arc.

## Fonctions
- Saisie des points pour chaque flèche (6 flèches par volée).
- Total en temps réel de la volée et de l'équipe.
- Nombre de cibles configurable.
- Barèmes intégrés : Nature, Campagne et 3D.
- Barème personnalisé possible.
- Bilan final : total, moyennes, meilleure/pire volée, répartition des impacts.

## Utilisation
1. Ouvrir `index.html` dans un navigateur mobile.
2. Ou lancer un serveur local dans ce dossier :
   ```bash
   python3 -m http.server 8000
   ```
   puis ouvrir `http://<ip-machine>:8000` depuis le smartphone.

## Mode PWA (offline + icone)
- Le projet inclut maintenant :
  - `manifest.webmanifest`
  - `service-worker.js`
  - icones dans `icons/` (192, 512, maskable)
- Pour un vrai mode offline installable sur smartphone, il faut servir l'app en **HTTPS**.
- En HTTP sur IP locale, l'app fonctionne, mais le service worker/offline peut etre bloque selon le navigateur.

## HTTPS local avec Docker + Caddy
1. Demarrer le serveur HTTPS :
   ```bash
   docker compose -f docker-compose.https.yml up -d
   ```
2. Recuperer le certificat racine local genere par Caddy :
   ```bash
   docker compose -f docker-compose.https.yml exec -T caddy \
     cat /data/caddy/pki/authorities/local/root.crt > caddy-local-root.crt
   ```
3. Trouver l'IP locale de ta machine :
   ```bash
   hostname -I | awk '{print $1}'
   ```
4. Installer `caddy-local-root.crt` sur le smartphone comme certificat de confiance.
5. Ouvrir l'app depuis le smartphone :
   - `https://<ip-machine>:8443`

### Android (certificat)
- Copier `caddy-local-root.crt` sur le smartphone.
- Ouvrir Parametres > Securite > Chiffrement et identifiants > Installer un certificat > Certificat CA.
- Choisir le fichier `caddy-local-root.crt`, puis confirmer.

### iPhone/iPad (certificat)
- Envoyer `caddy-local-root.crt` sur l'iPhone (AirDrop, Mail, etc.).
- Ouvrir le fichier pour installer le profil.
- Aller dans Reglages > General > Informations > Reglages de confiance des certificats.
- Activer la confiance totale pour ce certificat.

### Installation de l'app sur l'ecran d'accueil
- Android (Chrome) : menu `⋮` > `Installer l'appli` ou `Ajouter a l'ecran d'accueil`.
- iOS (Safari) : bouton `Partager` > `Sur l'ecran d'accueil`.
