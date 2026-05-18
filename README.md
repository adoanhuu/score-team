# Capi Scoring Arc

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

## Makefile

Variables globales (surchargeables) :

| Variable                 | Défaut                |
| ------------------------ | --------------------- |
| `REMOTE_WRANGLER_CONFIG` | `wrangler.local.toml` |
| `REMOTE_D1_DATABASE`     | `score-team`          |

### Développement

| Cible           | Description                                                                       |
| --------------- | --------------------------------------------------------------------------------- |
| `make dev`      | Démarre l'environnement Docker local (nécessite `.env.local` ou `D1_DATABASE_ID`) |
| `make dev-down` | Arrête l'environnement Docker local                                               |
| `make deploy`   | Lance le script de déploiement `deploy.sh`                                        |

### Base de données — migrations

| Cible                    | Description                           |
| ------------------------ | ------------------------------------- |
| `make db-migrate`        | Applique les migrations en local      |
| `make remote-db-migrate` | Applique les migrations sur le remote |
| `make remote`            | Alias de `remote-db-migrate`          |

### Utilisateurs — local

| Cible                    | Paramètres                                                                               | Description                                 |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| `make select-users`      | —                                                                                        | Liste tous les utilisateurs                 |
| `make select-user`       | `EMAIL=...`                                                                              | Affiche un utilisateur par email            |
| `make insert-user`       | `FIRST_NAME=... LAST_NAME=... EMAIL=... PASSWORD_HASH=...` (ou `PASSWORD_HASH_FILE=...`) | Crée un utilisateur                         |
| `make delete-user`       | `ID=...`                                                                                 | Supprime un utilisateur et ses sessions     |
| `make hash-password`     | `PASSWORD=...` (ou `PASSWORD_FILE=...`)                                                  | Génère un hash de mot de passe              |
| `make set-user-password` | `EMAIL=... PASSWORD=...` (ou `PASSWORD_FILE=...`)                                        | Met à jour le mot de passe d'un utilisateur |

### Utilisateurs — remote

| Cible                           | Paramètres                                                                               | Description                             |
| ------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| `make remote-select-users`      | —                                                                                        | Liste tous les utilisateurs             |
| `make remote-select-user`       | `EMAIL=...`                                                                              | Affiche un utilisateur par email        |
| `make remote-insert-user`       | `FIRST_NAME=... LAST_NAME=... EMAIL=... PASSWORD_HASH=...` (ou `PASSWORD_HASH_FILE=...`) | Crée un utilisateur                     |
| `make remote-delete-user`       | `ID=...`                                                                                 | Supprime un utilisateur et ses sessions |
| `make remote-update-user-token` | `EMAIL=... TOKEN=...`                                                                    | Met à jour le token d'un utilisateur    |
| `make remote-update-password`   | `EMAIL=... PASSWORD_HASH=...` (ou `PASSWORD_HASH_FILE=...`)                              | Met à jour le hash de mot de passe      |
| `make remote-set-user-password` | `EMAIL=... PASSWORD=...` (ou `PASSWORD_FILE=...`)                                        | Hache et met à jour le mot de passe     |

### Sessions — local

| Cible                  | Paramètres              | Description                              |
| ---------------------- | ----------------------- | ---------------------------------------- |
| `make select-sessions` | `EMAIL=...` (optionnel) | Liste les sessions, filtrables par email |

### Sessions — remote

| Cible                         | Paramètres              | Description                              |
| ----------------------------- | ----------------------- | ---------------------------------------- |
| `make remote-select-sessions` | `EMAIL=...` (optionnel) | Liste les sessions, filtrables par email |
| `make remote-delete-session`  | `ID=...`                | Supprime une session                     |

### Contests — local

| Cible                  | Paramètres                                                                                                                             | Description                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `make select-contests` | —                                                                                                                                      | Liste tous les contests            |
| `make select-contest`  | `UUID=...`                                                                                                                             | Affiche un contest par UUID        |
| `make insert-contest`  | `NAME=... START_DATE='YYYY-MM-DD HH:MM' END_DATE='YYYY-MM-DD HH:MM' MAX_USERS=... RULESET=[nature\|campagne\|3d\|3d2\|3dh\|ar\|field]` | Crée un contest (UUID auto-généré) |
| `make delete-contest`  | `ID=...`                                                                                                                               | Supprime un contest                |

### Contests — remote

| Cible                         | Paramètres                                                                                                                             | Description                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `make remote-select-contests` | —                                                                                                                                      | Liste tous les contests            |
| `make remote-select-contest`  | `UUID=...`                                                                                                                             | Affiche un contest par UUID        |
| `make remote-insert-contest`  | `NAME=... START_DATE='YYYY-MM-DD HH:MM' END_DATE='YYYY-MM-DD HH:MM' MAX_USERS=... RULESET=[nature\|campagne\|3d\|3d2\|3dh\|ar\|field]` | Crée un contest (UUID auto-généré) |
| `make remote-delete-contest`  | `ID=...`                                                                                                                               | Supprime un contest                |

### Utilitaires

| Cible              | Paramètres | Description                                      |
| ------------------ | ---------- | ------------------------------------------------ |
| `make remote-exec` | `SQL=...`  | Exécute une requête SQL arbitraire sur le remote |
