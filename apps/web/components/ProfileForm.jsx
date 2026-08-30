"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIFE_AREA_NAMES, SEX_VALUES } from "../lib/life-areas";
import {
  PRIVACY_NOTICE_PARAGRAPHS,
  PRIVACY_NOTICE_TITLE,
  SERVICE_INTRO,
} from "../lib/copy";
import { useSessionProfile } from "./SessionProvider";

/**
 * F-01 고지와 F-02 입력. 완료 시 항상 허브로만 보낸다.
 */
export function ProfileForm() {
  const router = useRouter();
  const { profile, save } = useSessionProfile();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const form = draft ?? {
    birthDate: profile?.birthDate ?? "",
    sex: profile?.sex ?? "",
    areaNm: profile?.areaNm ?? "",
  };

  function updateField(name, value) {
    setDraft((prev) => ({
      birthDate: prev?.birthDate ?? form.birthDate,
      sex: prev?.sex ?? form.sex,
      areaNm: prev?.areaNm ?? form.areaNm,
      [name]: value,
    }));
  }

  /**
   * React 상태가 비어도 제출 값으로 저장한다. GET query에는 쓰지 않는다.
   */
  function fieldsFromSubmit(event) {
    const submitted = new FormData(event.currentTarget);
    return {
      birthDate: form.birthDate || String(submitted.get("birthDate") || ""),
      sex: form.sex || String(submitted.get("sex") || ""),
      areaNm: form.areaNm || String(submitted.get("areaNm") || ""),
    };
  }

  function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    const result = save(fieldsFromSubmit(event));
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    router.push("/stats");
  }

  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">모두의 보험</h1>
      <p className="mt-3 text-base leading-6 text-ink-muted">{SERVICE_INTRO}</p>

      <aside
        className="mt-8 rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="privacy-notice-title"
      >
        <h2 id="privacy-notice-title" className="text-[18px] font-semibold text-ink">
          {PRIVACY_NOTICE_TITLE}
        </h2>
        <div className="mt-3 space-y-3 text-[13px] leading-[1.4] text-ink-muted">
          {PRIVACY_NOTICE_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </aside>

      <form
        className="mt-8 space-y-6"
        method="post"
        action="/stats"
        onSubmit={onSubmit}
        noValidate
      >
        <div>
          <label htmlFor="birthDate" className="block text-[14px] font-medium text-ink">
            생년월일
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            required
            autoComplete="bday"
            value={form.birthDate}
            onChange={(event) => updateField("birthDate", event.target.value)}
            className="mt-2 min-h-12 w-full max-w-xs rounded-[10px] border border-border bg-surface px-3 text-[16px] text-ink"
          />
        </div>

        <fieldset>
          <legend className="text-[14px] font-medium text-ink">성별</legend>
          <div className="mt-2 flex gap-6">
            {SEX_VALUES.map((value) => (
              <label key={value} className="inline-flex min-h-11 items-center gap-2 text-[16px] text-ink">
                <input
                  type="radio"
                  name="sex"
                  value={value}
                  checked={form.sex === value}
                  onChange={() => updateField("sex", value)}
                  required
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="areaNm" className="block text-[14px] font-medium text-ink">
            지역
          </label>
          <select
            id="areaNm"
            name="areaNm"
            required
            value={form.areaNm}
            onChange={(event) => updateField("areaNm", event.target.value)}
            className="mt-2 min-h-12 w-full max-w-xs rounded-[10px] border border-border bg-surface px-3 text-[16px] text-ink"
          >
            <option value="">선택하세요</option>
            {LIFE_AREA_NAMES.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="text-[14px] text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-[12px] bg-brand px-6 text-[16px] font-medium text-on-brand hover:bg-brand-hover"
        >
          통계 보기
        </button>
      </form>
    </section>
  );
}
