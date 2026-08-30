"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { validatePdfFile } from "../../lib/documents";
import { getOpsDashboard, queueOpsSync, uploadOpsPdfs } from "../../lib/ops";

/**
 * F-09·F-10 운영 대시보드. 생년월일·GA4·포털 키는 다루지 않는다.
 */
export function OpsDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const body = await getOpsDashboard();
      setData(body);
      setError("");
    } catch (caught) {
      if (caught.status === 401) {
        router.replace("/ops/login");
        return;
      }
      setError(caught.message || "대시보드를 불러오지 못했습니다.");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSync() {
    setPending(true);
    setNotice("");
    setError("");
    try {
      await queueOpsSync();
      setNotice("공공 캐시 동기화를 큐에 넣었습니다.");
      await load();
    } catch (caught) {
      setError(caught.message || "동기화를 시작하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function onUpload(event) {
    event.preventDefault();
    const picked = Array.from(event.currentTarget.files || []);
    if (!picked.length) {
      return;
    }
    for (const file of picked) {
      const checked = validatePdfFile(file);
      if (!checked.ok) {
        setError(checked.message);
        return;
      }
    }
    setPending(true);
    setNotice("");
    setError("");
    try {
      const body = await uploadOpsPdfs(picked);
      const count = Array.isArray(body.job_ids) ? body.job_ids.length : 0;
      setNotice(`PDF ${count}건을 큐에 넣었습니다. 원본 파일명은 저장하지 않습니다.`);
      await load();
    } catch (caught) {
      setError(caught.message || "PDF를 올리지 못했습니다.");
    } finally {
      setPending(false);
      event.currentTarget.value = "";
    }
  }

  if (!data && !error) {
    return <p className="text-ink-muted">불러오는 중…</p>;
  }

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-[28px] font-bold leading-[1.25] text-ink">운영 대시보드</h1>
        <p className="mt-3 text-base leading-6 text-ink-muted">
          캐시 상태·상담 열람·다건 PDF만 다룹니다. 사용자 통계 여정과 섞지 않습니다.
        </p>
      </div>

      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-[14px] text-ink">{notice}</p> : null}

      <div>
        <h2 className="text-[18px] font-semibold text-ink">공공 캐시</h2>
        <button
          type="button"
          onClick={onSync}
          disabled={pending}
          className="mt-4 inline-flex h-12 items-center justify-center rounded-[12px] bg-brand px-6 text-[16px] font-medium text-on-brand hover:bg-brand-hover disabled:opacity-60"
        >
          수동 동기화
        </button>
        <ul className="mt-4 space-y-2 text-[15px] text-ink">
          {(data?.cache_heads || []).map((head) => (
            <li key={head.source}>
              {head.source}
              {head.stale ? " · 이전 캐시" : ""}
              {head.base_period ? ` · ${head.base_period}` : ""}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-[18px] font-semibold text-ink">상담 요청</h2>
        <p className="mt-2 text-[13px] text-ink-muted">만료 전 행만 복호화해 보여 줍니다. 분석 이벤트에는 넣지 않습니다.</p>
        <ul className="mt-4 space-y-3">
          {(data?.consultations || []).map((row) => (
            <li key={row.id} className="rounded-[12px] border border-border bg-surface p-4">
              <p className="text-[15px] text-ink">{row.email}</p>
              <p className="mt-1 text-[13px] text-ink-muted">{row.contact_channel}</p>
              {row.purpose_note ? <p className="mt-2 text-[14px] text-ink">{row.purpose_note}</p> : null}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-[18px] font-semibold text-ink">다건 PDF</h2>
        <form className="mt-4">
          <label htmlFor="ops-pdfs" className="block text-[14px] font-medium text-ink">
            PDF 여러 개 (한 번에 10개, 파일명 미저장)
          </label>
          <input
            id="ops-pdfs"
            name="files"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={pending}
            onChange={onUpload}
            className="mt-2 text-[15px] text-ink"
          />
        </form>
        <ul className="mt-4 space-y-2 text-[15px] text-ink">
          {(data?.documents || []).map((doc) => (
            <li key={doc.job_id}>
              {doc.job_id} · {doc.status}
              {doc.fail_code ? ` · ${doc.fail_code}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
