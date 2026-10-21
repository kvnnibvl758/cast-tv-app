# Cast TV App

App React Native personnelle (gratuite, non publiée) avec deux fonctions :

- **Écran** : recopier l'écran du téléphone sur la TV (Android + iOS)
- **Vidéos** : envoyer une vidéo vers la TV via Chromecast (Android + iOS) et AirPlay (iOS)

## Démarrage rapide (Android)

Prérequis, une seule fois :

- [Node.js](https://nodejs.org) 18 ou plus
- **Java 17** (JDK). Les versions récentes d'Android Studio fournissent un Java
  25, trop récent pour Gradle (erreur « Unsupported class file major version »).
  Sous Windows : `winget install EclipseAdoptium.Temurin.17.JDK`, sinon
  [adoptium.net](https://adoptium.net) (version 17). Le script le trouve tout seul.
- [Android Studio](https://developer.android.com/studio), ouvert au moins une fois
- Dans Android Studio : **More Actions > SDK Manager**
  - onglet *SDK Platforms* : **Android 14 (API 34)** coché
  - onglet *SDK Tools* : **Android SDK Build-Tools 34.0.0** et **Platform-Tools** cochés
- Sur le téléphone : mode développeur (7 appuis sur « Numéro de build »), puis
  débogage USB, puis brancher le téléphone en USB (facultatif, sert à
  l'installation automatique)

Ensuite, dans un terminal, depuis ce dossier :

```bash
node setup-project.js
```

Le script fait tout seul :

1. crée le projet React Native (0.75.4) dans `../CastTvApp`
2. installe les librairies (Chromecast, lecteur vidéo)
3. copie le code de l'app et le module Android de recopie d'écran
4. applique les modifications natives Android (manifest, `MainActivity`,
   `MainApplication`) et détecte le SDK et le Java d'Android Studio
5. compile l'APK (10 à 15 minutes au premier build, internet requis)
6. l'installe sur le téléphone s'il est branché

L'APK final est `../CastTvApp/CastTvApp.apk`. Sinon, copie-le sur le téléphone
et ouvre-le (autorise les « sources inconnues »). Il reste installé sans limite
de durée. Il est signé avec la clé de debug, ce qui suffit pour un usage perso.

Options : `node setup-project.js mon-dossier` change l'emplacement du projet,
`--no-build` prépare le projet sans compiler.

### Si le build échoue

- **SDK introuvable** : définis `ANDROID_HOME` (macOS `~/Library/Android/sdk`,
  Linux `~/Android/Sdk`, Windows `%LOCALAPPDATA%\Android\Sdk`).
- **Erreur de Java** (« Unsupported class file major version », ou « Aucun Java
  17 à 22 trouvé ») : installe le JDK 17 (voir les prérequis) et relance la même
  commande. Le script choisit lui-même un Java compatible.
- **Erreur `checkReleaseAarMetadata`** (« requires libraries to compile against
  version 36/37 ») : une bibliothèque Android trop récente a été téléchargée. Le
  script épingle le SDK Cast (`22.0.0`) et `androidx.core` (`1.13.1`) dans
  `android/build.gradle` pour l'éviter.
- **Erreur `Cannot access class 'CastContext'`** (dans `MainActivity.kt`) : le SDK
  Cast doit être déclaré aussi dans `android/app/build.gradle`. Le script l'ajoute.
- **Plateforme ou Build-Tools manquants / licences** : SDK Manager, ou
  `sdkmanager --licenses`.

## Fonctionnement

### Onglet « Écran » : recopie d'écran du téléphone

Ni Android ni iOS ne permettent à une app de lancer elle-même la recopie
d'écran. L'app ouvre donc l'écran système adapté.

- **Android** : le module Kotlin (`android-native/screenmirror/`) ouvre « Cast »
  (Pixel et la plupart des marques), « Smart View » (Samsung), sinon les
  réglages généraux.
- **iOS** : l'onglet affiche les étapes du Centre de contrôle
  (« Recopie de l'écran ») et le sélecteur AirPlay.

La TV doit être sur le même Wi-Fi que le téléphone.

### Onglet « Vidéos » : Chromecast

Sur Android, le script configure `react-native-google-cast` avec le récepteur
média par défaut de Google : **aucun compte Google Cast, aucun paiement et
aucune inscription de TV ne sont nécessaires** pour un usage perso.

### Icône, écran de démarrage et image de présentation

Le script applique aussi l'identité visuelle de l'app :

- **Icône** (celle de l'écran du téléphone) et **écran de démarrage** : ressources
  dans `branding/android/res/`, copiées dans le projet par le script.
- **Image de présentation** (en haut de l'onglet « Écran ») : `src/assets/cast-hero.png`.
- Les dessins d'origine (SVG) sont dans `design/`.

Pour mettre tes propres images, remplace les fichiers PNG par les tiens, avec le
même nom et la même taille, puis relance `node setup-project.js C:\CastTvApp` :
`branding/android/res/mipmap-*/ic_launcher.png` (48, 72, 96, 144 et 192 px, carrés)
et `drawable-nodpi/splash_logo.png` (logo de démarrage, 512 px).

## iOS (AirPlay, Apple ID gratuit)

Non testé ici, et nécessite un Mac avec Xcode. Le module Swift est dans
`ios/AirPlayButton/` (copié dans le projet par le script).

1. Dans le projet : `cd ios && pod install`, puis ouvre le `.xcworkspace`.
2. Clic droit sur le groupe du projet > **Add Files...** et ajoute les 3 fichiers
   de `ios/AirPlayButton/` (accepte le *Bridging Header* proposé).
3. Vérifie que `AVKit.framework` est lié, et ajoute la capacité **Background
   Modes > Audio, AirPlay, and Picture in Picture**.
4. Pour Chromecast sur iOS, suis la configuration native de la librairie
   `react-native-google-cast` (initialisation dans `AppDelegate`, entrées
   Bonjour dans `Info.plist`). Elle n'est pas faite par le script.
5. Build sur ton iPhone avec un Apple ID gratuit. L'app expire après 7 jours et
   doit être réinstallée depuis Xcode.

## Structure

```
setup-project.js                # crée le projet, applique les modifs, compile
App.tsx                         # onglets Écran / Vidéos
src/
  components/                   # boutons Chromecast + AirPlay
  hooks/useCastState.ts         # état de cast simplifié
  services/
    ChromecastService.ts        # encapsule react-native-google-cast
    ScreenMirrorService.ts      # appelle le module natif Android
  screens/
    MirrorScreen.tsx            # recopie d'écran du téléphone
    HomeScreen.tsx              # liste de vidéos + lecteur
  types/index.ts
android-native/screenmirror/    # module Kotlin (ouvre Cast / Smart View)
ios/AirPlayButton/              # module Swift (AVRoutePickerView)
```

## Pistes pour la suite

- Recopie d'écran « maison » (capture MediaProjection + flux vers un
  récepteur sur la TV), bien plus long à construire
- Brancher un vrai catalogue de vidéos (remplacer `SAMPLE_MEDIA`)
- Écran « now playing » plein écran avec contrôles
