"""운영자 상담 알림. SMTP 본문에만 신청자 이메일을 넣고 로그에는 남기지 않는다."""

import smtplib
from email.message import EmailMessage
from uuid import UUID

from app.config import get_settings


def send_advisor_notice(request_id: UUID, applicant_email: str) -> None:
    """운영 수신 주소로 접수 id와 신청자 이메일을 알린다. SMTP가 없으면 건너뛴다."""
    settings = get_settings()
    to_addr = settings.consultation_notify_email.strip()
    host = settings.smtp_host.strip()
    if not to_addr or not host:
        return
    contact = (applicant_email or "").strip()
    message = EmailMessage()
    message["To"] = to_addr
    message["From"] = (settings.smtp_from or to_addr).strip()
    message["Subject"] = "[모두의 보험] 상담 접수"
    message.set_content(
        f"상담 요청이 접수되었습니다. request_id={request_id} contact_channel=email\n"
        f"신청자 이메일: {contact}\n"
    )
    password = settings.smtp_password.get_secret_value()
    with smtplib.SMTP(host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, password)
        smtp.send_message(message)
