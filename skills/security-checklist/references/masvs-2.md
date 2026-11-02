# OWASP MASVS 2.1 (apps móviles)

Los enunciados de los controles son citas literales del repositorio oficial `OWASP/masvs` (carpeta `controls/`, release v2.1.0), comprobadas el 2026-11-02. Las notas de React Native y Expo son propias.

Aplica a apps Android e iOS, nativas, React Native, Expo o Flutter. El backend de la app se revisa con ASVS y el API Top 10. MASVS cubre lo que vive en el dispositivo.

| Control | Enunciado (OWASP) | Notas para React Native / Expo |
|---------|-------------------|--------------------------------|
| **MASVS-STORAGE-1** | The app securely stores sensitive data. | Tokens y secretos en `expo-secure-store` (Keychain/Keystore), no en AsyncStorage ni MMKV sin cifrar |
| **MASVS-STORAGE-2** | The app prevents leakage of sensitive data. | Sin PII en logs (`console.log` llega a logcat); revisar `android:allowBackup`; capturas de pantalla y portapapeles en pantallas sensibles |
| **MASVS-CRYPTO-1** | The app employs current strong cryptography and uses it according to industry best practices. | Sin cripto casera; usar las APIs de la plataforma o librerías mantenidas |
| **MASVS-CRYPTO-2** | The app performs key management according to industry best practices. | Ninguna clave privada en el bundle: todo lo que va en `EXPO_PUBLIC_*` o en `app.config` es público |
| **MASVS-AUTH-1** | The app uses secure authentication and authorization protocols and follows the relevant best practices. | OAuth con PKCE; la autorización vive en el backend, nunca en la app |
| **MASVS-AUTH-2** | The app performs local authentication securely according to the platform best practices. | Biometría ligada a una clave del Keystore/Keychain, no un booleano en JS |
| **MASVS-AUTH-3** | The app secures sensitive operations with additional authentication. | Reautenticación para borrar la cuenta, cambiar el email o hacer pagos |
| **MASVS-NETWORK-1** | The app secures all network traffic according to the current best practices. | Sin `usesCleartextTraffic`; sin excepciones ATS amplias |
| **MASVS-NETWORK-2** | The app performs identity pinning for all remote endpoints under the developer's control. | Pinning solo si el modelo de amenazas lo pide; tiene coste de mantenimiento (rotación de certificados) |
| **MASVS-PLATFORM-1** | The app uses IPC mechanisms securely. | Deep links y esquemas: validar parámetros; no ejecutar acciones sensibles solo por abrir un enlace; Android App Links verificados |
| **MASVS-PLATFORM-2** | The app uses WebViews securely. | `originWhitelist` restringido; sin `javaScriptEnabled` con contenido no confiable; nada de puentes JS↔nativo con datos externos |
| **MASVS-PLATFORM-3** | The app uses the user interface securely. | Ocultar datos sensibles en el selector de apps; teclado seguro en campos sensibles |
| **MASVS-CODE-1** | The app requires an up-to-date platform version. | `minSdkVersion` y versión mínima de iOS razonables |
| **MASVS-CODE-2** | The app has a mechanism for enforcing app updates. | Versión mínima obligatoria comprobada contra el servidor; las OTA (EAS Update) no sustituyen al binario |
| **MASVS-CODE-3** | The app only uses software components without known vulnerabilities. | `npm audit` / `osv-scanner` del lockfile de la app |
| **MASVS-CODE-4** | The app validates and sanitizes all untrusted inputs. | Datos de deep links, notificaciones push y portapapeles tratados como no confiables |
| **MASVS-RESILIENCE-1** | The app validates the integrity of the platform. | Opcional: detección de root/jailbreak; Play Integrity / App Attest (en Firebase vía App Check) |
| **MASVS-RESILIENCE-2** | The app implements anti-tampering mechanisms. | Opcional: según el modelo de amenazas |
| **MASVS-RESILIENCE-3** | The app implements anti-static analysis mechanisms. | Opcional: Hermes compila el JS a bytecode, pero no es ofuscación real |
| **MASVS-RESILIENCE-4** | The app implements anti-dynamic analysis techniques. | Opcional: según el modelo de amenazas |
| **MASVS-PRIVACY-1** | The app minimizes access to sensitive data and resources. | Permisos mínimos en `app.json`; pedirlos en el momento de uso |
| **MASVS-PRIVACY-2** | The app prevents identification of the user. | Identificadores publicitarios y analítica sin PII; no huellas de dispositivo innecesarias |
| **MASVS-PRIVACY-3** | The app is transparent about data collection and usage. | Etiquetas de privacidad de las tiendas coherentes con lo que hace la app; política enlazada |
| **MASVS-PRIVACY-4** | The app offers user control over their data. | Borrado de cuenta desde la app (obligatorio en las tiendas); exportación de datos |

Los controles RESILIENCE son defensa en profundidad. No bloquean salvo que el modelo de amenazas los exija (apps de banca, DRM, antifraude).
