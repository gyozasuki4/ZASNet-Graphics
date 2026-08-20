# Release signing and updater secrets

The current workflow intentionally produces unsigned development builds. No private signing material belongs in this repository.

Future signed releases will need GitHub Actions secrets/variables managed in repository settings:

- Tauri updater private signing key and password, if configured.
- Apple Developer certificate, certificate password, Team ID, and notarization/App Store Connect credentials.
- Windows code-signing certificate/password or a cloud signing provider.

Secrets must be used only by trusted tag workflows, never by fork pull requests, and must not be printed or uploaded as artifacts. The public updater key may be committed only when the official Tauri updater configuration requires it. Unsigned macOS packages can trigger Gatekeeper warnings; unsigned Windows packages can trigger SmartScreen warnings. Users should not disable platform security globally.

GitHub Releases are the planned future update-manifest host. Updates must be signature-verified and user-initiated; the client must not silently restart during a broadcast.
