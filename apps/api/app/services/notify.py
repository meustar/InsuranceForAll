"""운영자 상담 알림. SMTP 본문에만 신청자 이메일·선택 메모를 넣고 로그에는 남기지 않는다."""

import smtplib
from email.message import EmailMessage

from app.config import get_settings


def send_advisor_notice(applicant_email: str, purpose_note: str | None = None) -> None:
    """운영 수신으로 회신용 이메일과 선택 메모만 알린다. SMTP가 없으면 건너뛴다."""
    settings = get_settings()
    to_addr = settings.consultation_notify_email.strip()
    host = settings.smtp_host.strip()
    if not to_addr or not host:
        return
    contact = (applicant_email or "").strip()
    note = (purpose_note or "").strip() or "(없음)"
    message = EmailMessage()
    message["To"] = to_addr
    message["From"] = (settings.smtp_from or to_addr).strip()
    message["Subject"] = "[모두의 보험] 상담 접수"
    message.set_content(f"신청자 이메일: {contact}\n메모: {note}\n")
    password = settings.smtp_password.get_secret_value()
    with smtplib.SMTP(host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, password)
        smtp.send_message(message)
