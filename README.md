# AR-01 · Premiers Secours

Application web éducative qui apprend les **gestes de premiers secours** à travers des mini-jeux en réalité augmentée (webcam + détection de mains).

## Ce que c'est

5 missions progressives couvrant les gestes vitaux :

| # | Mission | Geste |
|---|---------|-------|
| 1 | Arrêt cardiaque | Compressions thoraciques (100–120 BPM) |
| 2 | Personne inconsciente | Position Latérale de Sécurité (PLS) |
| 3 | Brûlure | Refroidissement 15 min |
| 4 | Situations multiples | Quiz sur plusieurs règles basiques de sécurité|

Chaque mission comporte une **phase d'apprentissage** (slides illustrés) puis une **phase de jeu** où la webcam analyse tes gestes en temps réel via [MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker).

La progression est sauvegardée localement (localStorage). Aucune donnée n'est envoyée à un serveur.

## Stack

- Vanilla JS / HTML / CSS — aucun framework, aucun bundler
- [MediaPipe Hands](https://cdn.jsdelivr.net/npm/@mediapipe/hands) pour le tracking des mains
- [MediaPipe Camera Utils](https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils) pour l'accès webcam

## Lancer le projet

Le projet tourne entièrement côté client mais **doit être servi via HTTP** (pas en `file://`) à cause des restrictions d'accès à la webcam.

### Option 1 — avec VS Code Live Server

Installe l'extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), fais un clic droit sur `index.html` > **Open with Live Server**.

### Option 2 — avec Python

```bash
# Python 3
python3 -m http.server 8080
```

Puis ouvre [http://localhost:8080](http://localhost:8080) dans ton navigateur.

### Option 3 — avec Node.js

```bash
npx serve .
```

> Autorise l'accès à la webcam quand le navigateur le demande — aucune donnée ne quitte ton appareil.
