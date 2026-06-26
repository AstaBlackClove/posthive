# Security Policy

## Supported Versions

This project is in active development. Security fixes are applied to the latest version only.

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues, as this could expose users before a fix is available.

Instead, email: **gunasheelan208@gmail.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You can expect an acknowledgement within 48 hours and a resolution timeline within 7 days for confirmed issues.

## Security Design Notes

- **Credentials are encrypted at rest** using AES-256-GCM. Platform tokens and passwords are never stored in plaintext.
- **`ENCRYPTION_KEY`** must be a 64-character hex string (32 bytes). Losing this key means losing access to all connected accounts.
- **`.env` files must never be committed** to version control. The `.gitignore` excludes them — do not override this.
- **Uploaded images** are served as static files. Do not store sensitive content via the upload endpoint.
- **No authentication layer** is currently implemented — this tool is designed for single-user self-hosting behind a private network or VPN. Do not expose it publicly without adding auth.
