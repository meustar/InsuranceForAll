import pytest

from worker.pdf_mask import extract_masked_pages, mask_text
from worker.tasks import mask_document


def test_mask_text_redacts_patterns() -> None:
    raw = "연락 010-1234-5678 / 900101-1234567 / demo@example.com"
    masked = mask_text(raw)
    assert "010-1234-5678" not in masked
    assert "900101-1234567" not in masked
    assert "demo@example.com" not in masked
    assert masked.count("[마스킹]") >= 3


def test_extract_masked_pages_hides_phone() -> None:
    fitz = pytest.importorskip("fitz")

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "담보 안내 010-1234-5678")
    pdf_bytes = doc.tobytes()
    doc.close()
    pages, count = extract_masked_pages(pdf_bytes)
    assert count == 1
    text = pages[0]["text_masked"]
    assert "010-1234-5678" not in text
    assert "text_raw" not in pages[0]
    assert "[마스킹]" in text


def test_mask_task_name() -> None:
    assert mask_document.name == "worker.mask_document"
