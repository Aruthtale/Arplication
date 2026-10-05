#!/usr/bin/env bash
#
# release.sh — Rilis otomatis Arplication
#
# Satu perintah untuk: bump versi → build web (+cap copy) → build APK release
#                      → commit → tag → push ke SEMUA remote
#                      → buat GitHub Release (+ upload APK) di SEMUA repo.
#
# PEMAKAIAN
#   scripts/release.sh patch          # 1.2.0 -> 1.2.1
#   scripts/release.sh minor          # 1.2.0 -> 1.3.0
#   scripts/release.sh major          # 1.2.0 -> 2.0.0
#   scripts/release.sh 1.5.0          # versi eksplisit
#
# OPSI
#   --notes <file>   Pakai isi file sebagai catatan rilis (markdown)
#   --title <text>   Judul rilis (default: "vX.Y.Z")
#   --skip-build     Lewati build (pakai APK yang sudah ada)
#   --no-push        Berhenti setelah commit+tag lokal (tanpa push/release)
#   --force-tag      Timpa tag di remote bila sudah ada (re-release)
#   --dry-run        Tampilkan rencana saja, tidak mengubah apa pun
#   -y, --yes        Lewati konfirmasi
#   -h, --help       Bantuan
#
set -euo pipefail

# ─────────────────────────────── util ────────────────────────────────
RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; CYN=$'\033[36m'; DIM=$'\033[2m'; RST=$'\033[0m'
info()  { printf '%s▸%s %s\n' "$CYN" "$RST" "$*"; }
ok()    { printf '%s✔%s %s\n' "$GRN" "$RST" "$*"; }
warn()  { printf '%s!%s %s\n' "$YEL" "$RST" "$*"; }
err()   { printf '%s✘%s %s\n' "$RED" "$RST" "$*" >&2; }
die()   { err "$*"; exit 1; }

# ──────────────────────── argumen & bantuan ──────────────────────────
usage() { sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

BUMP=""; NOTES_FILE=""; TITLE=""; SKIP_BUILD=0; NO_PUSH=0; DRY_RUN=0; ASSUME_YES=0; FORCE_TAG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)   usage ;;
    --notes)     NOTES_FILE="${2:-}"; shift 2 ;;
    --title)     TITLE="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --no-push)   NO_PUSH=1; shift ;;
    --force-tag) FORCE_TAG=1; shift ;;
    --dry-run)   DRY_RUN=1; shift ;;
    -y|--yes)    ASSUME_YES=1; shift ;;
    -*)          die "Opsi tidak dikenal: $1 (lihat --help)" ;;
    *)           [[ -z "$BUMP" ]] && BUMP="$1" || die "Argumen berlebih: $1"; shift ;;
  esac
done

[[ -z "$BUMP" ]] && { err "Wajib: jenis bump (patch|minor|major) atau versi eksplisit"; echo; usage; }

# ─────────────────────── lokasi & validasi ───────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[[ -f package.json ]] || die "package.json tidak ditemukan di $ROOT (jalankan dari repo Arplication)"
[[ -f android/app/build.gradle ]] || die "android/app/build.gradle tidak ditemukan"
command -v node >/dev/null || die "node tidak ditemukan"
command -v git  >/dev/null || die "git tidak ditemukan"

PKG="package.json"
GRADLE="android/app/build.gradle"
UPDATER="src/services/updater.js"
CHANGELOG="CHANGELOG.md"
APK="android/app/build/outputs/apk/release/app-release.apk"

# ────────────────────── hitung versi baru ────────────────────────────
CUR="$(node -p "require('./package.json').version")"
CUR_CODE="$(grep -E '^\s*versionCode ' "$GRADLE" | head -1 | grep -oE '[0-9]+')"

if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW="$BUMP"
else
  NEW="$(node -e '
    const cur = process.argv[1], kind = process.argv[2];
    let [maj, min, pat] = cur.split(".").map(Number);
    if (kind === "major") { maj++; min = 0; pat = 0; }
    else if (kind === "minor") { min++; pat = 0; }
    else if (kind === "patch") { pat++; }
    else { console.error("bump tidak valid: " + kind); process.exit(1); }
    console.log(`${maj}.${min}.${pat}`);
  ' "$CUR" "$BUMP")" || die "Jenis bump tidak valid: $BUMP"
fi

[[ "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Versi hasil tidak valid: $NEW"
NEW_CODE=$(( CUR_CODE + 1 ))
TAG="v$NEW"
[[ -z "$TITLE" ]] && TITLE="$TAG"

# ─────────────────────── daftar repo (dari remote) ───────────────────
mapfile -t REPOS < <(git remote -v \
  | awk '$3 == "(push)" { print $2 }' \
  | sed -E 's#^git@[^:]+:##; s#^https?://[^/]+/##; s#\.git$##' \
  | grep -E '^[^/]+/[^/]+$' \
  | sort -u)

[[ ${#REPOS[@]} -eq 0 ]] && die "Tidak ada remote push yang terdeteksi"

# ─────────────────────────── ringkasan ───────────────────────────────
echo
printf '%s════════════ RENCANA RILIS ════════════%s\n' "$CYN" "$RST"
printf '  Versi      : %s %s→%s %s\n' "$CUR" "$DIM" "$RST" "$NEW"
printf '  versionCode: %s → %s\n' "$CUR_CODE" "$NEW_CODE"
printf '  Tag        : %s\n' "$TAG"
printf '  Judul      : %s\n' "$TITLE"
printf '  Repo       : %s\n' "${REPOS[*]}"
printf '  Build      : %s\n' "$([[ $SKIP_BUILD -eq 1 ]] && echo 'dilewati' || echo 'web + APK release')"
printf '  Push       : %s\n' "$([[ $NO_PUSH -eq 1 ]] && echo 'tidak' || echo 'ya + GitHub Release')"
printf '%s═════════════════════════════════════════%s\n\n' "$CYN" "$RST"

if [[ $DRY_RUN -eq 1 ]]; then warn "DRY-RUN: tidak ada perubahan dilakukan."; exit 0; fi

# ─────────────────────────── cek git bersih ──────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
  err "Working tree tidak bersih. Commit atau stash dulu:"
  git status --short
  exit 1
fi
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && die "Tag $TAG sudah ada"

if [[ $ASSUME_YES -eq 0 ]]; then
  read -r -p "Lanjutkan rilis $TAG? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || die "Dibatalkan."
fi

# ───────────────────── 1. update nomor versi ─────────────────────────
info "1/6 Memperbarui nomor versi…"
node -e '
  const fs = require("fs");
  const v = process.argv[1];
  const p = "package.json";
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.version = v;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
' "$NEW"

if [[ -f package-lock.json ]]; then
  node -e '
    const fs = require("fs");
    const v = process.argv[1];
    const j = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
    j.version = v;
    if (j.packages && j.packages[""]) j.packages[""].version = v;
    fs.writeFileSync("package-lock.json", JSON.stringify(j, null, 2) + "\n");
  ' "$NEW"
fi

# updater.js — APP_VERSION
node -e '
  const fs = require("fs");
  const v = process.argv[1];
  const f = "src/services/updater.js";
  let s = fs.readFileSync(f, "utf8");
  s = s.replace(/(export const APP_VERSION\s*=\s*.)[^\x27"]+([\x27"])/, `$1${v}$2`);
  fs.writeFileSync(f, s);
' "$NEW"

# build.gradle — versionCode + versionName
node -e '
  const fs = require("fs");
  const [code, name] = process.argv.slice(1);
  const f = "android/app/build.gradle";
  let s = fs.readFileSync(f, "utf8");
  s = s.replace(/versionCode\s+\d+/, `versionCode ${code}`);
  s = s.replace(/versionName\s+"[^"]*"/, `versionName "${name}"`);
  fs.writeFileSync(f, s);
' "$NEW_CODE" "$NEW"

ok "Versi diperbarui di package.json, package-lock.json, updater.js, build.gradle"

# ────────────────────────── 2. catatan rilis ─────────────────────────
info "2/6 Menyiapkan catatan rilis…"
NOTES=""
if [[ -n "$NOTES_FILE" ]]; then
  [[ -f "$NOTES_FILE" ]] || die "File catatan tidak ditemukan: $NOTES_FILE"
  NOTES="$(cat "$NOTES_FILE")"
else
  LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
  if [[ -n "$LAST_TAG" ]]; then
    NOTES="$(git log --no-merges --pretty='- %s' "${LAST_TAG}..HEAD" 2>/dev/null | head -40)"
  fi
  [[ -z "$NOTES" ]] && NOTES="Rilis $TAG."
fi

# Sisipkan ke CHANGELOG.md (setelah header, sebelum entri pertama)
if [[ -f "$CHANGELOG" ]] && ! grep -q "^## \[$NEW\]" "$CHANGELOG"; then
  TODAY="$(date +%F)"
  node -e '
    const fs = require("fs");
    const [ver, date, notes] = process.argv.slice(1);
    const f = "CHANGELOG.md";
    let s = fs.readFileSync(f, "utf8");
    const block = `## [${ver}] - ${date}\n\n${notes}\n\n---\n\n`;
    const i = s.search(/^## \[/m);
    s = i === -1 ? s.trimEnd() + "\n\n" + block : s.slice(0, i) + block + s.slice(i);
    fs.writeFileSync(f, s);
  ' "$NEW" "$TODAY" "$NOTES"
  ok "CHANGELOG.md diperbarui"
else
  warn "CHANGELOG.md tidak diubah (sudah ada entri $NEW atau file tidak ada)"
fi

# ─────────────────────────── 3. build ────────────────────────────────
if [[ $SKIP_BUILD -eq 1 ]]; then
  warn "3/6 Build dilewati (--skip-build)"
  [[ -f "$APK" ]] || die "APK tidak ada di $APK — jangan pakai --skip-build"
else
  info "3/6 Build web (vite + cap copy)…"
  npm run build

  info "3/6 Build APK release…"
  export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"
  export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
  export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
  ( cd android && ./gradlew :app:assembleRelease --console=plain )
  [[ -f "$APK" ]] || die "Build selesai tapi APK tidak ditemukan: $APK"
fi

# verifikasi isi APK: pastikan versi web di bundle == versi rilis.
# PENTING: JANGAN grep "semver pertama" di bundle minified — data SVG path memuat
# angka seperti `0 1.1.9 2` yang tampak seperti versi (ini penyebab false positive
# lama "Web assets dalam APK: v1.1.9"). Versi asli disimpan sebagai literal
# ter-quote (mis. `1.3.2`), jadi cek token persis yang cocok dengan $NEW.
NEW_ESC="${NEW//./\\.}"
VER_RE="[\`'\"]${NEW_ESC}[\`'\"]"
BUNDLE_JS="$(unzip -p "$APK" 'assets/public/assets/index-*.js' 2>/dev/null || true)"
ok "APK siap: $(du -h "$APK" | cut -f1) ($APK)"
if [[ -z "$BUNDLE_JS" ]]; then
  warn "Tidak bisa membaca bundle JS dari APK — verifikasi versi dilewati"
# CATATAN: pakai here-string, BUKAN `printf | grep -q`. Dengan `set -o pipefail`,
# `grep -q` yang keluar lebih awal (begitu cocok) memicu SIGPIPE pada `printf` →
# pipeline melaporkan 141 (gagal) padahal versi ADA. Ini bug yang sempat membuat
# rilis 1.4.0 diblokir keliru.
elif grep -qE "$VER_RE" <<< "$BUNDLE_JS"; then
  info "Web assets dalam APK: v$NEW (cocok dengan versi rilis)"
else
  die "Web assets dalam APK TIDAK memuat v$NEW — 'cap copy' mungkin tidak jalan. Periksa sebelum rilis!"
fi

# ───────────────────── 4. commit + tag ───────────────────────────────
info "4/6 Commit & tag…"
git add -A
git commit -m "release: $TAG" -m "$NOTES"
git tag -a "$TAG" -m "$TAG"
ok "Commit + tag $TAG dibuat"

if [[ $NO_PUSH -eq 1 ]]; then
  warn "5/6 Push dilewati (--no-push). Rilis lokal selesai."
  exit 0
fi

# ─────────────────────────── 5. push ─────────────────────────────────
info "5/6 Push ke remote…"
git push origin HEAD:main
if [[ $FORCE_TAG -eq 1 ]]; then
  git push origin "$TAG" --force
else
  git push origin "$TAG"
fi
ok "Pushed ke: ${REPOS[*]}"

# ─────────────────────── 6. GitHub Release ───────────────────────────
info "6/6 Membuat GitHub Release + upload APK…"
ORIG_ACCOUNT="$(gh api user --jq .login 2>/dev/null || echo '')"

for repo in "${REPOS[@]}"; do
  owner="${repo%%/*}"
  # ganti akun gh bila owner cocok dengan akun yang tersimpan
  if gh auth status 2>/dev/null | grep -q "account $owner "; then
    gh auth switch --user "$owner" >/dev/null 2>&1 || true
  fi

  if gh release view "$TAG" --repo "$repo" >/dev/null 2>&1; then
    warn "$repo: release $TAG sudah ada — upload ulang APK"
    gh release upload "$TAG" "$APK" --repo "$repo" --clobber
  else
    gh release create "$TAG" "$APK" --repo "$repo" --title "$TITLE" --notes "$NOTES"
  fi
  ok "$repo → https://github.com/$repo/releases/tag/$TAG"
done

# kembalikan akun gh semula
[[ -n "$ORIG_ACCOUNT" ]] && gh auth switch --user "$ORIG_ACCOUNT" >/dev/null 2>&1 || true

echo
printf '%s═══════════ RILIS %s SELESAI ═══════════%s\n' "$GRN" "$TAG" "$RST"
ok "Selesai. APK: $APK"
