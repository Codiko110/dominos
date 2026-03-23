# Dominos (Compteur de score) - Expo / React Native

Application offline pour gérer les scores d’une partie de dominos (2 à 4 joueurs).

## Installation
```bash
npm install
```

## Lancer l’app
```bash
npx expo start
```

## Build APK Android

### Option A (recommandée) : EAS Build
1. Installer `eas-cli` :
   ```bash
   npm i -g eas-cli
   ```
2. Connexion / configuration EAS (compte Expo + credentials Android) :
   ```bash
   eas login
   ```
3. Générer l’APK :
   ```bash
   eas build -p android --profile production
   ```

### Option B : build de développement local
Selon ta configuration Expo, tu peux aussi essayer :
```bash
npx expo run:android
```
