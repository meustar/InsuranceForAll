"""운영자 상담 알림. 사용자 이메일·메모 원문은 넣지 않는다."""

import smtplib
from email.message import EmailMessage
from uuid import UUID

from app.config import get_settings


def send_advisor_notice(request_id: UUID) -> None:
    """CONSULTATION_NOTIFY_EMAIL로 접수 id만 알린다. SMTP가 없으면 건너뛴다."""
    settings = get_settings()
    to_addr = settings.consultation_notify_email.strip()
    host = settings.smtp_host.strip()
    if not to_addr or not host:
        return
    message = EmailMessage()
    message["To"] = to_addr
    message["From"] = (settings.smtp_from or to_addr).strip()
    message["Subject"] = "[모두의 보험] 상담 접수"
    message.set_content(
        f"상담 요청이 접수되었습니다. request_id={request_id} contact_channel=email\n"
        "신청자 연락처는 알림에 포함하지 않습니다."
    )
    password = settings.smtp_password.get_secret_value()
    with smtplib.SMTP(host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, password)
        smtp.send_message(message)
