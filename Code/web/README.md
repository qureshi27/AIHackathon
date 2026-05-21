# ASL Live — browser demo

Real-time American Sign Language alphabet recognition in the browser.
Hand keypoints from MediaPipe → Landmark classifier in ONNX → letter on screen.
Stack: **Vite + React + TypeScript**, deployable to **Vercel** with one push.

```
public/
├── hand_landmarker.task        # MediaPipe Hands model
└── landmark_model.onnx         # Exported from best_landmark_transformer_v2.pt (see step 2)
```

No external scaler file is needed — the Transformer's first `LayerNorm` handles
input normalization, so the only preprocessing the browser does is the same
wrist-center + max-distance scale used during training.

---

## 1 · Install and run dev

```bash
cd web
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. The dev server requires `https` for
webcam access in some browsers — Vite serves on `localhost` which is allowed by
all major browsers as a secure context.

---

## 2 · Generate the ONNX model

> Already shipped at `public/landmark_model.onnx` (~11 MB).
> Re-run only if you retrain the model.

```bash
# from inside web/
pip install torch onnx onnxruntime
python scripts/export_onnx.py
```

The script reads `../best_landmark_transformer_v2.pt.zip`, reconstructs the
Transformer (6 encoder layers, d_model=192, nhead=8, ffn=768, gelu, norm_first=True),
and writes `public/landmark_model.onnx`. Parity vs. the PyTorch model is within
~2e-6 max abs diff on real samples.

---

## 3 · Deploy to Vercel

The app is pure static after `npm run build`. Two paths:

### Option A — Vercel CLI (one terminal)

```bash
npm i -g vercel
vercel              # follow prompts, choose "Other" → Vite is auto-detected
vercel --prod       # deploy to production once happy
```

### Option B — GitHub → Vercel dashboard

1. Push the repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. **Root Directory:** `web`. Framework is auto-detected as Vite.
4. **Deploy** — `vercel.json` already sets `outputDirectory: dist`, SPA rewrites,
   and correct MIME types for `.onnx`, `.task`, and `.wasm`.

### Asset size note

`hand_landmarker.task` is ~7.6 MB and `landmark_model.onnx` is typically <1 MB.
Both ship as static files, well under Vercel's 100 MB limit. Cached aggressively
by the headers in `vercel.json`.

---

## 4 · How the pipeline runs in the browser

```
<video>           getUserMedia → 640×480 @ ~30 FPS
   │
   ▼
MediaPipe Hands   @mediapipe/tasks-vision, WASM
   │              → 21 (x,y,z) landmarks per frame
   ▼
Preprocessing     src/lib/preprocessing.ts
   │              centre on wrist · scale to max distance
   │              reshape to (1, 21, 3)
   ▼
ONNX Runtime Web  onnxruntime-web, WASM
   │              Transformer with input LayerNorm — no external scaler
   │              → 29-class logits → softmax → argmax
   ▼
Smoother          src/lib/smoother.ts
                  majority-vote over last 8 frames · hold 800ms to commit
                  space → " "    del → backspace    nothing → reset
```

If MediaPipe finds **no hand**, the prediction is forced to `nothing` (matches
the training-time inference rule from the Python notebook).

---

## 5 · Customising

| Want to change… | Edit… |
|---|---|
| Hold duration, smoothing window | `src/lib/smoother.ts` (`PredictionSmoother(capacity, holdMs)`) |
| Camera resolution | `start()` in `src/components/LiveDemo.tsx` |
| Skeleton colours | `drawSkeleton()` in `src/components/LiveDemo.tsx` |
| Design tokens (colours, type, spacing) | `src/styles/tokens.css` |
| ONNX input tensor name | `src/hooks/useOnnxModel.ts` — auto-detected from `session.inputNames`, override if your export used a non-default name |

---

## 6a · Wrapping as a mobile app (webintoapp.com)

If you use [webintoapp.com](https://webintoapp.com) to wrap your Vercel URL as
an Android APK / iOS IPA, the camera will silently do nothing unless you tick
a few specific boxes. The web app already does its part — opts in via the
`Permissions-Policy: camera=(self)` header, `manifest.webmanifest` declares the
`camera` permission, and `<meta http-equiv="Permissions-Policy">` is present
for WebViews that read meta over HTTP headers.

You still need to do this on **webintoapp.com's side**:

1. **Permissions tab** in the builder — tick **Camera**. (Also tick
   *Internet* if it isn't on by default.)
2. **WebView settings** — make sure *"Allow access to camera"* /
   *"Allow `getUserMedia`"* is on. Some plans hide this under "Advanced".
3. **HTTPS only** — paste the Vercel `https://...vercel.app` URL, not a
   custom domain that hasn't propagated yet. Mixed-content kills camera.
4. **Rebuild + reinstall the APK** after toggling any permission. The
   permission set is baked into the AndroidManifest at build time —
   reloading the in-app page won't help.
5. **First-launch grant** — on first use of the camera, Android will show
   the standard "Allow ASL Live to take pictures and record video?" prompt.
   If the user picks *Deny*, the in-app error directs them to
   *Settings → Apps → ASL Live → Permissions → Camera*.

### Why we can't grant camera permission automatically

No web app can. Camera is an OS-level permission gated on a user gesture and
a clear consent dialog. The most a page can do is:

- Declare the permission in PWA manifest + `Permissions-Policy` (done).
- Fire `getUserMedia` only after the user taps "Start camera" (done — see
  [`LiveDemo.tsx`](src/components/LiveDemo.tsx)).
- Cycle through fallback constraints if the first one fails (done —
  desktop ideal → `facingMode: 'user'` → `facingMode: 'environment'` →
  `video: true`).
- Show specific recovery advice per error name (done — `NotAllowedError`,
  `NotFoundError`, `NotReadableError`, etc.).

Anything beyond that (silently turning on the camera, bypassing the OS
prompt) is blocked by every modern mobile browser and WebView by design.

## 6b · Wrapping as a mobile app (Capacitor)

The web app works in a phone's browser already, but if you're packaging it as
a native iOS/Android app using **Capacitor**, the WebView won't grant camera
access without explicit configuration. The browser symptom is "camera blocked"
on mobile but everything works in desktop Chrome.

### iOS

1. `npx cap add ios`
2. Open `ios/App/App/Info.plist` and add:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>This app needs camera access to recognise sign language gestures.</string>
   ```
3. In `capacitor.config.ts`, the default Capacitor WebView (`WKWebView`) supports
   `getUserMedia` from iOS 14.3+. No extra plugin required for basic camera
   streaming.

### Android

1. `npx cap add android`
2. In `android/app/src/main/AndroidManifest.xml` add inside `<manifest>`:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-feature android:name="android.hardware.camera" android:required="false" />
   ```
3. In the `<application>` tag, ensure the WebView allows mixed content if
   you're loading the model from a remote URL (we serve from `public/`, so
   this is usually fine):
   ```xml
   android:usesCleartextTraffic="true"
   ```
4. Android WebView requires you to grant the permission at runtime. In
   `android/app/src/main/java/.../MainActivity.java` extend
   `BridgeActivity` and override `onPermissionResult` if needed — Capacitor's
   default flow is sufficient for most cases.

### TL;DR

If you see "camera blocked" inside the mobile app, the WebView did not get
permission. Re-check:

- The Info.plist / AndroidManifest entries above.
- The OS-level permission for your app (Settings → Privacy → Camera).
- That the app was reinstalled after adding permissions (manifest changes
  don't propagate via hot reload).

## 7 · Troubleshooting

**"Model load failed: 404"** — `public/landmark_model.onnx` is missing. Run step 2 to regenerate it.

**"InvalidArgument: input name mismatch"** — Your ONNX export used a different
input name than `landmarks`. The hook auto-detects via `session.inputNames`, so
this should self-heal; if not, hard-code the name in `useOnnxModel.ts`.

**Camera prompt never appears** — You're not on `https://` or `localhost`. Browsers
block `getUserMedia` on plain `http://`.

**Predictions stuck on `nothing`** — Lighting too low, or hand outside the frame.
Watch the skeleton overlay: if no yellow lines appear, MediaPipe didn't detect
a hand. Move closer to the camera.

**Skeleton appears but predictions look random** — The model expects landmarks in
the same coordinate convention as MediaPipe's `HandLandmarker.detectForVideo()`
(normalized image coords, with the wrist at index 0). If you swap detectors, you
must re-train.
