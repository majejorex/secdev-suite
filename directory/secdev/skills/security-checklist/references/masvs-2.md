# OWASP MASVS 2.1 (mobile apps)

The control statements are literal quotes from the official `OWASP/masvs` repository (folder `controls/`, release v2.1.0), checked on 2026-11-02. The React Native and Expo notes are our own.

Applies to Android and iOS apps, native, React Native, Expo or Flutter. The app's backend is reviewed with ASVS and the API Top 10. MASVS covers what lives on the device.

| Control | Statement (OWASP) | Notes for React Native / Expo |
|---------|-------------------|-------------------------------|
| **MASVS-STORAGE-1** | The app securely stores sensitive data. | Tokens and secrets in `expo-secure-store` (Keychain/Keystore), not in AsyncStorage or unencrypted MMKV |
| **MASVS-STORAGE-2** | The app prevents leakage of sensitive data. | No PII in logs (`console.log` reaches logcat); review `android:allowBackup`; screenshots and clipboard on sensitive screens |
| **MASVS-CRYPTO-1** | The app employs current strong cryptography and uses it according to industry best practices. | No home-made crypto; use platform APIs or maintained libraries |
| **MASVS-CRYPTO-2** | The app performs key management according to industry best practices. | No private key in the bundle: everything in `EXPO_PUBLIC_*` or `app.config` is public |
| **MASVS-AUTH-1** | The app uses secure authentication and authorization protocols and follows the relevant best practices. | OAuth with PKCE; authorization lives in the backend, never in the app |
| **MASVS-AUTH-2** | The app performs local authentication securely according to the platform best practices. | Biometrics tied to a Keystore/Keychain key, not a boolean in JS |
| **MASVS-AUTH-3** | The app secures sensitive operations with additional authentication. | Re-authentication to delete the account, change the email or make payments |
| **MASVS-NETWORK-1** | The app secures all network traffic according to the current best practices. | No `usesCleartextTraffic`; no broad ATS exceptions |
| **MASVS-NETWORK-2** | The app performs identity pinning for all remote endpoints under the developer's control. | Pinning only if the threat model asks for it; it has a maintenance cost (certificate rotation) |
| **MASVS-PLATFORM-1** | The app uses IPC mechanisms securely. | Deep links and schemes: validate parameters; do not run sensitive actions just because a link was opened; verified Android App Links |
| **MASVS-PLATFORM-2** | The app uses WebViews securely. | Restricted `originWhitelist`; no `javaScriptEnabled` with untrusted content; no JS-to-native bridges with external data |
| **MASVS-PLATFORM-3** | The app uses the user interface securely. | Hide sensitive data in the app switcher; secure keyboard on sensitive fields |
| **MASVS-CODE-1** | The app requires an up-to-date platform version. | Reasonable `minSdkVersion` and minimum iOS version |
| **MASVS-CODE-2** | The app has a mechanism for enforcing app updates. | Mandatory minimum version checked against the server; OTA updates (EAS Update) do not replace the binary |
| **MASVS-CODE-3** | The app only uses software components without known vulnerabilities. | `npm audit` / `osv-scanner` on the app's lockfile |
| **MASVS-CODE-4** | The app validates and sanitizes all untrusted inputs. | Data from deep links, push notifications and the clipboard treated as untrusted |
| **MASVS-RESILIENCE-1** | The app validates the integrity of the platform. | Optional: root/jailbreak detection; Play Integrity / App Attest (in Firebase via App Check) |
| **MASVS-RESILIENCE-2** | The app implements anti-tampering mechanisms. | Optional: depends on the threat model |
| **MASVS-RESILIENCE-3** | The app implements anti-static analysis mechanisms. | Optional: Hermes compiles the JS to bytecode, but that is not real obfuscation |
| **MASVS-RESILIENCE-4** | The app implements anti-dynamic analysis techniques. | Optional: depends on the threat model |
| **MASVS-PRIVACY-1** | The app minimizes access to sensitive data and resources. | Minimal permissions in `app.json`; request them at the moment of use |
| **MASVS-PRIVACY-2** | The app prevents identification of the user. | Advertising identifiers and analytics without PII; no needless device fingerprinting |
| **MASVS-PRIVACY-3** | The app is transparent about data collection and usage. | Store privacy labels consistent with what the app does; policy linked |
| **MASVS-PRIVACY-4** | The app offers user control over their data. | Account deletion from within the app (required by the stores); data export |

The RESILIENCE controls are defense in depth. They do not block unless the threat model requires them (banking apps, DRM, anti-fraud).
