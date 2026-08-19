"""Encryption at rest for digital delivery secrets.

SECURITY.md requires gift-card codes to be encrypted at rest using an
application-managed key stored outside the database. This wraps Fernet
(AES128-CBC + HMAC) keyed from `settings.delivery_encryption_key`.

`digital_deliveries.encrypted_payload` never contains a raw code once this
module is used; only `decrypt_delivery_secret` (called from an authorized,
audited read path) turns it back into plaintext.
"""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken


class DeliveryEncryptionNotConfigured(RuntimeError):
    pass


def _derive_fernet_key(secret: str) -> bytes:
    """Accept any non-empty secret (not necessarily a valid Fernet key) and
    derive a stable, correctly-formatted 32-byte urlsafe-base64 Fernet key
    from it, so operators can set a plain random string in the environment
    instead of having to pre-generate a Fernet-specific key."""
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet(key: str | None) -> Fernet:
    if not key:
        raise DeliveryEncryptionNotConfigured(
            "DELIVERY_ENCRYPTION_KEY is not set; refusing to store or read "
            "digital delivery secrets in plaintext."
        )
    return Fernet(_derive_fernet_key(key))


def encrypt_delivery_secret(plaintext: str, *, key: str | None) -> str:
    return _fernet(key).encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_delivery_secret(ciphertext: str, *, key: str | None) -> str:
    try:
        return _fernet(key).decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("delivery payload could not be decrypted") from exc
