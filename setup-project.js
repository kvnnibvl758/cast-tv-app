#!/usr/bin/env node
/**
 * Crée le projet React Native, y intègre le code de l'app, applique les
 * modifications natives Android, puis compile l'APK.
 *
 * Usage :
 *   node setup-project.js [dossier-cible] [--no-build]
 *
 * Par défaut, le projet est créé à côté de ce dossier : ../CastTvApp
 * Prérequis : Node.js 18+, Android Studio (SDK Android installé).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = __dirname;
const APP_NAME = 'CastTvApp';
const RN_VERSION = '0.75.4';
const IS_WIN = process.platform === 'win32';

// Versions exactes (pas de "^", qui pose problème dans cmd.exe sous Windows).
const LIB_DEPS = [
  'react-native-google-cast@4.9.1',
  'react-native-video@6.4.5',
  'react-native-safe-area-context@4.10.9',
];

// ---------------------------------------------------------------- utilitaires

function log(msg) {
  console.log(`\n== ${msg}`);
}

function fail(msg) {
  console.error(`\nERREUR : ${msg}`);
  process.exit(1);
}

const quote = (p) => `"${p}"`;

function run(command, cwd, env) {
  console.log(`$ ${command}`);
  const r = spawnSync(command, {
    cwd,
    env: env || process.env,
    shell: true,
    stdio: 'inherit',
  });
  return r.status === 0;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

// ------------------------------------------------------- détection de l'env.

function findAndroidSdk() {
  const home = os.homedir();
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    IS_WIN && process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.platform === 'darwin' &&
      path.join(home, 'Library', 'Android', 'sdk'),
    path.join(home, 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find(
    (p) =>
      fs.existsSync(path.join(p, 'platform-tools')) ||
      fs.existsSync(path.join(p, 'platforms')) ||
      fs.existsSync(path.join(p, 'build-tools')),
  );
}

// Gradle 8.8 (React Native 0.75) fonctionne avec Java 17 à 22. Un Java plus
// récent (par exemple le JDK 25 fourni avec les dernières versions d'Android
// Studio) provoque l'erreur « Unsupported class file major version ».
const JAVA_MIN = 17;
const JAVA_MAX = 22;

function javaMajor(home) {
  const exe = path.join(home, 'bin', IS_WIN ? 'java.exe' : 'java');
  if (!fs.existsSync(exe)) return null;
  const r = spawnSync(exe, ['-version'], { encoding: 'utf8' });
  const m = `${r.stderr || ''}${r.stdout || ''}`.match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return m[1] === '1' ? Number(m[2]) : Number(m[1]); // "1.8.0" = Java 8
}

function subDirs(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name));
}

function javaCandidates() {
  const home = os.homedir();
  // ~/.jdks : dossier où Android Studio / IntelliJ téléchargent leurs JDK.
  const list = [process.env.JAVA_HOME, ...subDirs(path.join(home, '.jdks'))];

  if (IS_WIN) {
    const roots = [
      process.env.ProgramFiles,
      process.env['ProgramFiles(x86)'],
      'C:\\Program Files',
    ].filter(Boolean);
    const vendors = [
      'Eclipse Adoptium', 'Microsoft', 'Java', 'Zulu',
      'BellSoft', 'Amazon Corretto', 'Semeru',
    ];
    for (const root of roots) {
      for (const v of vendors) list.push(...subDirs(path.join(root, v)));
      list.push(path.join(root, 'Android', 'Android Studio', 'jbr'));
    }
    if (process.env.LOCALAPPDATA) {
      list.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Android Studio', 'jbr'));
    }
  } else if (process.platform === 'darwin') {
    list.push(...subDirs('/Library/Java/JavaVirtualMachines'));
    list.push('/Applications/Android Studio.app/Contents/jbr/Contents/Home');
  } else {
    list.push(
      ...subDirs('/usr/lib/jvm'),
      '/opt/android-studio/jbr',
      path.join(home, 'android-studio', 'jbr'),
    );
  }
  return [...new Set(list.filter(Boolean))];
}

// Renvoie { best, found } : best = le meilleur Java compatible (ou undefined),
// found = tous les Java détectés avec leur version (pour le message d'erreur).
function findJava() {
  const found = [];
  for (const c of javaCandidates()) {
    // Sous macOS, le JDK est dans <dossier>/Contents/Home.
    const home = fs.existsSync(path.join(c, 'bin')) ? c : path.join(c, 'Contents', 'Home');
    const major = javaMajor(home);
    if (major) found.push({ home, major });
  }
  const ok = found.filter((j) => j.major >= JAVA_MIN && j.major <= JAVA_MAX);
  // Java 17 d'abord (le plus testé avec React Native 0.75), puis 21, puis le reste.
  const rank = (j) => (j.major === 17 ? 0 : j.major === 21 ? 1 : 2);
  ok.sort((a, b) => rank(a) - rank(b) || a.major - b.major);
  return { best: ok[0], found };
}

// Force Gradle à utiliser ce Java, quel que soit l'environnement.
function pinGradleJava(target, javaHome) {
  const file = path.join(target, 'android', 'gradle.properties');
  let s = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  s = s.replace(/^org\.gradle\.java\.home=.*\r?\n?/m, '');
  if (s && !s.endsWith('\n')) s += '\n';
  s += `org.gradle.java.home=${javaHome.replace(/\\/g, '/')}\n`;
  fs.writeFileSync(file, s);
}

function buildEnv(sdk, javaHome) {
  const env = { ...process.env };
  if (sdk) {
    env.ANDROID_HOME = sdk;
    env.ANDROID_SDK_ROOT = sdk;
  }
  if (javaHome) {
    env.JAVA_HOME = javaHome;
    // Sous Windows la variable s'appelle souvent "Path" : on respecte la casse.
    const pathKey =
      Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
    env[pathKey] = path.join(javaHome, 'bin') + path.delimiter + (env[pathKey] || '');
  }
  return env;
}

// ------------------------------------------------------------ création projet

function createProject(target, env) {
  if (fs.existsSync(path.join(target, 'android'))) {
    console.log(`Projet déjà présent dans ${target}, on le réutilise.`);
    return;
  }
  const parent = path.dirname(target);
  // Ne pas créer un dossier existant : sous Windows, mkdir sur la racine d'un
  // disque ("C:\") échoue avec EPERM.
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
  const ok = run(
    `npx --yes @react-native-community/cli@latest init ${APP_NAME} ` +
      `--version ${RN_VERSION} --directory ${quote(target)} ` +
      `--skip-git-init --skip-install --pm npm`,
    parent,
    env,
  );
  if (!ok || !fs.existsSync(path.join(target, 'android'))) {
    fail("La création du projet React Native a échoué (voir les messages ci-dessus).");
  }
}

function detectPackage(target) {
  const javaRoot = path.join(target, 'android', 'app', 'src', 'main', 'java');
  const file = walk(javaRoot).find((f) => f.endsWith('MainApplication.kt'));
  if (!file) fail('MainApplication.kt introuvable : le gabarit React Native a-t-il changé ?');
  const m = fs.readFileSync(file, 'utf8').match(/^package\s+([\w.]+)/m);
  if (!m) fail('Impossible de lire le nom de package dans MainApplication.kt.');
  return { pkg: m[1], mainApplication: file, javaRoot };
}

function installDeps(target, env) {
  if (!run(`npm install ${LIB_DEPS.join(' ')}`, target, env)) {
    fail("L'installation des dépendances npm a échoué.");
  }
}

// --------------------------------------------------------------- copie du code

function copySources(target, pkg) {
  fs.copyFileSync(path.join(SRC, 'App.tsx'), path.join(target, 'App.tsx'));
  fs.cpSync(path.join(SRC, 'src'), path.join(target, 'src'), { recursive: true });

  // Module Swift AirPlay : copié pour plus tard (compilé uniquement via Xcode).
  const airplay = path.join(SRC, 'ios', 'AirPlayButton');
  if (fs.existsSync(airplay) && fs.existsSync(path.join(target, 'ios'))) {
    fs.cpSync(airplay, path.join(target, 'ios', 'AirPlayButton'), { recursive: true });
  }

  // Module Kotlin : on adapte le nom de package à celui du projet.
  const from = path.join(SRC, 'android-native', 'screenmirror');
  const dest = path.join(
    target, 'android', 'app', 'src', 'main', 'java', ...pkg.split('.'), 'screenmirror',
  );
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const code = fs
      .readFileSync(path.join(from, name), 'utf8')
      .replace(/^package com\.casttvapp\.screenmirror/m, `package ${pkg}.screenmirror`);
    fs.writeFileSync(path.join(dest, name), code);
  }
}

// ----------------------------------------------------- modifications natives

// Chaque fonction renvoie true si le fichier est (ou était déjà) modifié.

function patchMainApplication(file, pkg) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('ScreenMirrorPackage')) return true;
  const anchor = /\/\/ add\(MyReactNativePackage\(\)\)/;
  if (!anchor.test(s)) return false;
  s = s.replace(anchor, () => `add(${pkg}.screenmirror.ScreenMirrorPackage())`);
  fs.writeFileSync(file, s);
  return true;
}

// react-native-google-cast demande d'initialiser le CastContext dans onCreate.
function patchMainActivity(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('RNGCCastContext')) return true;
  const importAnchor = /^import com\.facebook\.react\.ReactActivity\r?$/m;
  const classAnchor = /^class MainActivity : ReactActivity\(\) \{\r?$/m;
  if (!importAnchor.test(s) || !classAnchor.test(s)) return false;
  s = s.replace(
    importAnchor,
    () =>
      'import android.os.Bundle\n' +
      'import com.facebook.react.ReactActivity\n' +
      'import com.reactnative.googlecast.api.RNGCCastContext',
  );
  s = s.replace(
    classAnchor,
    (m) =>
      `${m}\n\n  override fun onCreate(savedInstanceState: Bundle?) {\n` +
      '    super.onCreate(null)\n' +
      '    RNGCCastContext.getSharedInstance(this)\n' +
      '  }',
  );
  fs.writeFileSync(file, s);
  return true;
}

// Déclare le fournisseur d'options Cast (récepteur par défaut de Google) et
// les permissions réseau local.
function patchManifest(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('GoogleCastOptionsProvider')) return true;

  const internet =
    /^[ \t]*<uses-permission android:name="android\.permission\.INTERNET" \/>[ \t]*\r?\n/m;
  const activity = /^([ \t]*)<activity\b/m;
  if (!internet.test(s) || !activity.test(s)) return false;

  s = s.replace(
    internet,
    (m) =>
      m +
      '    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />\n' +
      '    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />\n',
  );
  s = s.replace(
    activity,
    (m, indent) =>
      `${indent}<meta-data\n` +
      `${indent}  android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"\n` +
      `${indent}  android:value="com.reactnative.googlecast.GoogleCastOptionsProvider" />\n` +
      m,
  );
  fs.writeFileSync(file, s);
  return true;
}

function patchAndroid(target, info) {
  const warnings = [];
  const mainDir = path.join(info.javaRoot, ...info.pkg.split('.'));

  if (!patchMainApplication(info.mainApplication, info.pkg)) {
    warnings.push(
      `MainApplication.kt : ajoute à la main  add(${info.pkg}.screenmirror.ScreenMirrorPackage())  dans getPackages().`,
    );
  }
  if (!patchMainActivity(path.join(mainDir, 'MainActivity.kt'))) {
    warnings.push(
      'MainActivity.kt : ajoute à la main  RNGCCastContext.getSharedInstance(this)  dans onCreate (voir le README).',
    );
  }
  const manifest = path.join(target, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!patchManifest(manifest)) {
    warnings.push(
      'AndroidManifest.xml : ajoute à la main le meta-data OPTIONS_PROVIDER_CLASS_NAME (voir le README).',
    );
  }
  if (!patchRootGradle(target)) {
    warnings.push(
      `android/build.gradle : ajoute à la main  castFrameworkVersion = "${CAST_FRAMEWORK_VERSION}"  dans le bloc ext.`,
    );
  }
  if (!patchAppGradle(target)) {
    warnings.push(
      `android/app/build.gradle : ajoute à la main, dans dependencies :  implementation "com.google.android.gms:play-services-cast-framework:${CAST_FRAMEWORK_VERSION}"`,
    );
  }
  if (!applyBranding(target)) {
    warnings.push(
      'res/values/styles.xml : ajoute dans le thème AppTheme  <item name="android:windowBackground">@drawable/splash_screen</item>  (écran de démarrage).',
    );
  }
  return warnings;
}

// Le projet est compilé avec compileSdk 34 (Android 14). react-native-google-cast
// demande par défaut la toute dernière version du SDK Cast ("+"), qui tire des
// bibliothèques androidx exigeant Android 36/37 et un Android Gradle Plugin
// plus récent : le build échoue alors à l'étape checkReleaseAarMetadata.
// On épingle donc le SDK Cast (22.0.0, octobre 2024) et on empêche androidx.core
// de monter au-delà de la version compatible avec compileSdk 34.
const CAST_FRAMEWORK_VERSION = '22.0.0';
const ANDROIDX_CORE_VERSION = '1.13.1';

function patchRootGradle(target) {
  const file = path.join(target, 'android', 'build.gradle');
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('castFrameworkVersion')) return true;

  const extAnchor = /^([ \t]*)ext\s*\{\r?\n/m;
  if (!extAnchor.test(s)) return false;

  s = s.replace(
    extAnchor,
    (m, indent) =>
      m +
      `${indent}    // SDK Cast épinglé : la version "+" par défaut exige un Android trop récent.\n` +
      `${indent}    castFrameworkVersion = "${CAST_FRAMEWORK_VERSION}"\n`,
  );
  s =
    s.replace(/\s*$/, '\n') +
    '\n// Empêche des dépendances androidx trop récentes d\'exiger un compileSdk > 34.\n' +
    'allprojects {\n' +
    '    configurations.all {\n' +
    '        resolutionStrategy {\n' +
    `            force "androidx.core:core:${ANDROIDX_CORE_VERSION}"\n` +
    `            force "androidx.core:core-ktx:${ANDROIDX_CORE_VERSION}"\n` +
    '        }\n' +
    '    }\n' +
    '}\n';
  fs.writeFileSync(file, s);
  return true;
}

// react-native-google-cast déclare le SDK Cast en "implementation", donc il
// n'est pas visible par le code de l'application. MainActivity.kt appelle
// RNGCCastContext.getSharedInstance(), qui renvoie un CastContext : sans cette
// dépendance, la compilation Kotlin échoue (« Cannot access class CastContext »).
function patchAppGradle(target) {
  const file = path.join(target, 'android', 'app', 'build.gradle');
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('play-services-cast-framework')) return true;

  const anchor = /^dependencies\s*\{\r?\n/m;
  if (!anchor.test(s)) return false;

  s = s.replace(
    anchor,
    (m) =>
      m +
      '    // Necessaire pour que MainActivity.kt voie la classe CastContext.\n' +
      `    implementation "com.google.android.gms:play-services-cast-framework:${CAST_FRAMEWORK_VERSION}"\n`,
  );
  fs.writeFileSync(file, s);
  return true;
}

// Icône de l'application et écran de démarrage : copie les ressources du
// dossier branding/ dans le projet, puis branche l'écran de démarrage sur le
// thème de l'application (styles.xml).
function applyBranding(target) {
  const from = path.join(SRC, 'branding', 'android', 'res');
  if (!fs.existsSync(from)) return true; // pas de ressources à appliquer
  const res = path.join(target, 'android', 'app', 'src', 'main', 'res');
  fs.cpSync(from, res, { recursive: true, force: true });

  const file = path.join(res, 'values', 'styles.xml');
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('splash_screen')) return true;

  const anchor = /^([ \t]*)<!-- Customize your theme here\. -->\r?\n/m;
  if (!anchor.test(s)) return false;
  s = s.replace(
    anchor,
    (m, indent) =>
      m +
      `${indent}<item name="android:windowBackground">@drawable/splash_screen</item>\n` +
      `${indent}<!-- Android 12 et plus : écran de démarrage système -->\n` +
      `${indent}<item name="android:windowSplashScreenBackground">@color/splash_background</item>\n` +
      `${indent}<item name="android:windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>\n`,
  );
  fs.writeFileSync(file, s);
  return true;
}

function writeLocalProperties(target, sdk) {
  const escaped = sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  fs.writeFileSync(
    path.join(target, 'android', 'local.properties'),
    `sdk.dir=${escaped}\n`,
  );
}

// ------------------------------------------------------------------ compilation

function buildApk(target, env) {
  const androidDir = path.join(target, 'android');
  if (!IS_WIN) fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
  const gradlew = IS_WIN ? 'gradlew.bat' : './gradlew';

  // Arrête les anciens démons Gradle (par exemple lancés avec un mauvais Java).
  run(`${gradlew} --stop`, androidDir, env);

  if (!run(`${gradlew} assembleRelease`, androidDir, env)) {
    console.error(
      '\nLe build a échoué. Causes fréquentes :\n' +
        ' - Plateforme Android 14 (API 34) ou Build-Tools 34.0.0 non installés : SDK Manager d\'Android Studio\n' +
        ' - Licences non acceptées : sdkmanager --licenses (dans platform-tools/cmdline-tools)\n' +
        ' - Mauvaise version de Java : il faut un JDK 17 à 22 (https://adoptium.net)\n' +
        ' - Pas de connexion internet (Gradle télécharge ses dépendances au premier build)',
    );
    process.exit(1);
  }

  const apk = path.join(
    androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk',
  );
  if (!fs.existsSync(apk)) fail(`APK introuvable : ${apk}`);

  const copy = path.join(target, `${APP_NAME}.apk`);
  fs.copyFileSync(apk, copy);
  return copy;
}

function tryInstall(sdk, apk, env) {
  if (!sdk) return false;
  const adb = path.join(sdk, 'platform-tools', IS_WIN ? 'adb.exe' : 'adb');
  if (!fs.existsSync(adb)) return false;
  const r = spawnSync(adb, ['devices'], { encoding: 'utf8', env });
  const hasDevice = (r.stdout || '')
    .split('\n')
    .slice(1)
    .some((l) => /\sdevice$/.test(l.trim()));
  if (!hasDevice) return false;
  log('Téléphone détecté, installation en cours');
  return spawnSync(adb, ['install', '-r', apk], { stdio: 'inherit', env }).status === 0;
}

// ------------------------------------------------------------------------ main

function main() {
  const args = process.argv.slice(2);
  const noBuild = args.includes('--no-build');
  const dirArg = args.find((a) => !a.startsWith('--'));
  const target = path.resolve(dirArg || path.join(SRC, '..', APP_NAME));

  if (Number(process.versions.node.split('.')[0]) < 18) {
    fail('Node.js 18 ou plus est requis (https://nodejs.org).');
  }

  log("Vérification de l'environnement");
  const sdk = findAndroidSdk();
  if (!sdk && !noBuild) {
    fail(
      'SDK Android introuvable. Dans Android Studio : More Actions > SDK Manager, ' +
        'installe une plateforme, puis définis la variable ANDROID_HOME (voir le README).',
    );
  }
  let java = null;
  if (!noBuild) {
    const { best, found } = findJava();
    if (!best) {
      const seen =
        found.map((j) => `  - Java ${j.major} : ${j.home}`).join('\n') ||
        '  (aucun Java trouvé)';
      fail(
        `Aucun Java ${JAVA_MIN} à ${JAVA_MAX} trouvé : Gradle ne fonctionne pas avec un Java plus récent.\n` +
          `Java détectés :\n${seen}\n\n` +
          `Installe un JDK 17, puis relance exactement la même commande :\n` +
          (IS_WIN ? '  winget install EclipseAdoptium.Temurin.17.JDK\n' : '') +
          '  (ou télécharge-le sur https://adoptium.net, version 17)',
      );
    }
    java = best;
  }
  const env = buildEnv(sdk, java && java.home);
  console.log(`SDK Android : ${sdk || '(non trouvé, build ignoré)'}`);
  if (java) console.log(`Java : ${java.home} (version ${java.major})`);
  console.log(`Projet : ${target}`);

  log('Création du projet React Native');
  createProject(target, env);
  const info = detectPackage(target);
  console.log(`Package Android : ${info.pkg}`);

  log('Installation des dépendances');
  installDeps(target, env);

  log("Copie du code de l'app et modifications Android");
  copySources(target, info.pkg);
  const warnings = patchAndroid(target, info);
  if (sdk) writeLocalProperties(target, sdk);
  if (java) pinGradleJava(target, java.home);
  warnings.forEach((w) => console.warn(`ATTENTION : ${w}`));

  if (noBuild) {
    console.log(`\nProjet prêt dans ${target} (build ignoré).`);
    return;
  }

  log("Compilation de l'APK (10 à 15 minutes au premier build)");
  const apk = buildApk(target, env);

  console.log(`\nAPK généré : ${apk}`);
  if (!tryInstall(sdk, apk, env)) {
    console.log(
      "Aucun téléphone détecté en USB. Transfère l'APK sur le téléphone puis ouvre-le " +
        '(autorise « sources inconnues » si demandé).',
    );
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    patchMainApplication,
    patchMainActivity,
    patchManifest,
    patchRootGradle,
    patchAppGradle,
    applyBranding,
    findJava,
  };
}
