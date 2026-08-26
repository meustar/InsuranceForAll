"""상담 연락처·메모 AES-256-GCM. nonce와 태그를 한 BYTEA에 붙인다."""

from __future__ import annotations

import hashlib
import os

_NONCE_LEN = 12
_AAD = b"ifa-consultation-v1"


def _aesgcm(secret: str):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = hashlib.sha256(secret.encode("utf-8")).digest()
    return AESGCM(key)


def encrypt_field(secret: str, plaintext: str) -> bytes:
    """레코드마다 새 nonce로 암호화한다. nonce||ciphertext||tag 순서다."""
    nonce = os.urandom(_NONCE_LEN)
    token = _aesgcm(secret).encrypt(nonce, plaintext.encode("utf-8"), _AAD)
    return nonce + token


def decrypt_field(secret: str, blob: bytes) -> str:
    """테스트·만료 정리 외 경로에서는 쓰지 않는다."""
    nonce, token = blob[:_NONCE_LEN], blob[_NONCE_LEN:]
    return _aesgcm(secret).decrypt(nonce, token, _AAD).decode("utf-8")
