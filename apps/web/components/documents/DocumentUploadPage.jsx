"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { readApiError } from "../../lib/stats-client";
import { statusLabel, statusTone, validatePdfFile } from "../../lib/documents";

const POLL_MS = 2000;

/**
 * 증권 PDF를 올리고 job 상태만 보여 준다. 원본 파일명은 요청에 별도 필드로 넣지 않는다.
 */
export function DocumentUploadPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null);

  const pickFile = useCallback((next) => {
    const checked = validatePdfFile(next);
    if (!checked.ok) {
      setError(checked.message);
      setFile(null);
      return;
    }
    setError("");
    setFile(next);
  }, []);

  useEffect(() => {
    if (!job?.job_id || job.status === "completed" || job.status === "failed") {
      return;
    }
    const controller = new AbortController();
    const tick = async () => {
      try {
        const response = await fetch(`/api/v1/documents/${encodeURIComponent(job.job_id)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "작업 상태를 확인하지 못했습니다."));
        }
        const body = await response.json();
        setJob(body);
      } catch (caught) {
        if (caught.name !== "AbortError") {
          setError(caught.message || "작업 상태를 확인하지 못했습니다.");
        }
      }
    };
    const timer = window.setInterval(tick, POLL_MS);
    tick();
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [job?.job_id, job?.status]);

  async function onSubmit(event) {
    event.preventDefault();
    const checked = validatePdfFile(file);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/v1/documents", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        body: form,
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "업로드에 실패했습니다."));
      }
      const body = await response.json();
      setJob({ job_id: body.job_id, status: "queued" });
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (caught) {
      setError(caught.message || "업로드에 실패했습니다.");
    }
  }

  const tone = job ? statusTone(job.status) : null;

  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">증권 PDF 업로드</h1>
      <aside className="mt-6 rounded-[12px] border border-border bg-surface p-5 text-[14px] leading-6 text-ink-muted">
        <p>선택 경로입니다. 통계 탐색에는 파일이 필요하지 않습니다.</p>
        <p className="mt-3">
          원본 파일은 보관하지 않으며 업로드 파일명도 저장하지 않습니다. 마스킹 뒤 JSON 요약만
          남깁니다.
        </p>
      </aside>

      <form className="mt-8 space-y-6" onSubmit={onSubmit}>
        <div
          className={`rounded-[12px] border border-dashed p-8 text-center ${
            dragOver ? "border-brand bg-surface-muted" : "border-border bg-surface"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            pickFile(event.dataTransfer.files?.[0] || null);
          }}
        >
          <p className="text-[16px] text-ink">PDF를 이곳에 놓거나 파일을 선택하세요</p>
          <p className="mt-2 text-[13px] text-ink-muted">10MB 이하 · PDF만</p>
          <input
            ref={inputRef}
            className="mt-4 block w-full text-[14px] text-ink"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => pickFile(event.target.files?.[0] || null)}
          />
          {file ? (
            <p className="mt-3 text-[13px] text-ink-muted">파일이 선택되었습니다. 업로드하면 서버에는 파일명을 남기지 않습니다.</p>
          ) : null}
        </div>
        {error ? (
          <p className="text-[14px] text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-[12px] bg-brand px-6 text-[16px] font-medium text-on-brand hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-45"
          disabled={!file}
        >
          업로드
        </button>
      </form>

      {job ? (
        <div
          className={`mt-8 rounded-[12px] border bg-surface p-5 text-[14px] ${
            tone === "error"
              ? "border-danger text-danger"
              : tone === "done"
                ? "border-border text-ink"
                : "border-border text-ink-muted"
          }`}
          role="status"
        >
          <p className="font-medium text-ink">작업 상태: {statusLabel(job.status)}</p>
          {job.page_count != null ? (
            <p className="mt-2 text-ink-muted">페이지 수 {job.page_count}</p>
          ) : null}
          {job.fail_code ? <p className="mt-2">처리 코드: {job.fail_code}</p> : null}
          {job.preview_masked ? (
            <p className="mt-3 whitespace-pre-wrap text-ink-muted">{job.preview_masked}</p>
          ) : null}
        </div>
      ) : null}

      <Link href="/stats" className="mt-8 inline-flex min-h-11 items-center text-[14px] text-brand">
        통계로 돌아가기
      </Link>
    </section>
  );
}
