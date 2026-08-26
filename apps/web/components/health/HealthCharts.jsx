"use client";

import { useEffect, useRef } from "react";
import { axisBottom, max, scaleBand, scaleLinear, select } from "d3";
import { formatWon } from "../../lib/health-stats";

const WIDTH = 920;
const LABEL_WIDTH = 255;
const RIGHT = 28;

function shortLabel(label) {
  return label.length > 28 ? `${label.slice(0, 27)}…` : label;
}

function formatAxisWon(value) {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return Math.round(value).toLocaleString("ko-KR");
}

/**
 * 선택 성별 상품 보험료를 D3 가로 막대 data join으로 그린다.
 */
export function HorizontalBarChart({ data, sex }) {
  const ref = useRef(null);

  useEffect(() => {
    const svg = select(ref.current);
    const height = Math.max(180, data.length * 42 + 48);
    svg.attr("viewBox", `0 0 ${WIDTH} ${height}`);
    const maxValue = max(data, (item) => item.value) || 1;
    const x = scaleLinear().domain([0, maxValue]).nice().range([LABEL_WIDTH, WIDTH - RIGHT]);
    const y = scaleBand()
      .domain(data.map((item) => item.key))
      .range([12, height - 38])
      .padding(0.28);

    svg
      .select(".x-axis")
      .attr("transform", `translate(0,${height - 34})`)
      .call(axisBottom(x).ticks(5).tickFormat(formatAxisWon))
      .call((group) => group.select(".domain").remove())
      .call((group) => group.selectAll("line").attr("stroke", "var(--color-chart-grid)"))
      .call((group) =>
        group
          .selectAll("text")
          .attr("fill", "var(--color-chart-label)")
          .attr("font-size", 12),
      );

    svg
      .select(".bars")
      .selectAll("rect")
      .data(data, (item) => item.key)
      .join(
        (enter) => enter.append("rect").attr("x", x(0)).attr("width", 0),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("y", (item) => y(item.key))
      .attr("height", y.bandwidth())
      .attr("x", x(0))
      .attr("width", (item) => Math.max(0, x(item.value) - x(0)))
      .attr("rx", 4)
      .attr("fill", "var(--color-chart-a)");

    svg
      .select(".labels")
      .selectAll("text")
      .data(data, (item) => item.key)
      .join("text")
      .attr("x", LABEL_WIDTH - 12)
      .attr("y", (item) => (y(item.key) || 0) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--color-chart-label)")
      .attr("font-size", 13)
      .text((item) => shortLabel(item.label));

    svg
      .select(".values")
      .selectAll("text")
      .data(data, (item) => item.key)
      .join("text")
      .attr("x", (item) => Math.min(x(item.value) + 6, WIDTH - RIGHT))
      .attr("y", (item) => (y(item.key) || 0) + y.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--color-ink)")
      .attr("font-size", 12)
      .text((item) => formatWon(item.value));
  }, [data]);

  return (
    <svg
      ref={ref}
      className="h-auto w-full min-w-[680px]"
      role="img"
      aria-label={`${sex} 상품 보험료 가로 막대 차트`}
    >
      <g className="x-axis" />
      <g className="bars" />
      <g className="labels" />
      <g className="values" />
    </svg>
  );
}

/**
 * 같은 상품의 남녀 보험료 차이를 D3 덤벨 data join으로 그린다.
 */
export function DumbbellChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    const svg = select(ref.current);
    const height = Math.max(180, data.length * 42 + 48);
    svg.attr("viewBox", `0 0 ${WIDTH} ${height}`);
    const maxValue = max(data, (item) => Math.max(item.male, item.female)) || 1;
    const x = scaleLinear().domain([0, maxValue]).nice().range([LABEL_WIDTH, WIDTH - RIGHT]);
    const y = scaleBand()
      .domain(data.map((item) => item.key))
      .range([12, height - 38])
      .padding(0.28);

    svg
      .select(".x-axis")
      .attr("transform", `translate(0,${height - 34})`)
      .call(axisBottom(x).ticks(5).tickFormat(formatAxisWon))
      .call((group) => group.select(".domain").remove())
      .call((group) => group.selectAll("line").attr("stroke", "var(--color-chart-grid)"))
      .call((group) =>
        group
          .selectAll("text")
          .attr("fill", "var(--color-chart-label)")
          .attr("font-size", 12),
      );

    svg
      .select(".connectors")
      .selectAll("line")
      .data(data, (item) => item.key)
      .join("line")
      .attr("x1", (item) => x(item.male))
      .attr("x2", (item) => x(item.female))
      .attr("y1", (item) => (y(item.key) || 0) + y.bandwidth() / 2)
      .attr("y2", (item) => (y(item.key) || 0) + y.bandwidth() / 2)
      .attr("stroke", "var(--color-chart-grid)")
      .attr("stroke-width", 4);

    for (const field of ["male", "female"]) {
      svg
        .select(`.${field}-dots`)
        .selectAll("circle")
        .data(data, (item) => item.key)
        .join("circle")
        .attr("cx", (item) => x(item[field]))
        .attr("cy", (item) => (y(item.key) || 0) + y.bandwidth() / 2)
        .attr("r", 6)
        .attr(
          "fill",
          field === "male" ? "var(--color-chart-male)" : "var(--color-chart-female)",
        );
    }

    svg
      .select(".labels")
      .selectAll("text")
      .data(data, (item) => item.key)
      .join("text")
      .attr("x", LABEL_WIDTH - 12)
      .attr("y", (item) => (y(item.key) || 0) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--color-chart-label)")
      .attr("font-size", 13)
      .text((item) => shortLabel(item.label));
  }, [data]);

  return (
    <div>
      <div className="mb-3 flex gap-5 text-[13px] text-ink-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-chart-male" /> 남자
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-chart-female" /> 여자
        </span>
      </div>
      <svg
        ref={ref}
        className="h-auto w-full min-w-[680px]"
        role="img"
        aria-label="상품별 남녀 보험료 덤벨 차트"
      >
        <g className="x-axis" />
        <g className="connectors" />
        <g className="male-dots" />
        <g className="female-dots" />
        <g className="labels" />
      </svg>
    </div>
  );
}

/**
 * 선택 성별 보험료의 사분위 박스와 개별 점을 D3 data join으로 그린다.
 */
export function BoxSummaryChart({ summary, sex }) {
  const ref = useRef(null);

  useEffect(() => {
    const svg = select(ref.current);
    const x = scaleLinear()
      .domain([Math.min(0, summary.min), summary.max || 1])
      .nice()
      .range([70, WIDTH - RIGHT]);
    svg
      .select(".x-axis")
      .attr("transform", "translate(0,145)")
      .call(axisBottom(x).ticks(6).tickFormat(formatAxisWon))
      .call((group) => group.select(".domain").remove())
      .call((group) => group.selectAll("line").attr("stroke", "var(--color-chart-grid)"))
      .call((group) =>
        group
          .selectAll("text")
          .attr("fill", "var(--color-chart-label)")
          .attr("font-size", 12),
      );

    svg
      .select(".whisker")
      .selectAll("line")
      .data([summary])
      .join("line")
      .attr("x1", (item) => x(item.min))
      .attr("x2", (item) => x(item.max))
      .attr("y1", 78)
      .attr("y2", 78)
      .attr("stroke", "var(--color-chart-b)")
      .attr("stroke-width", 2);

    svg
      .select(".box")
      .selectAll("rect")
      .data([summary])
      .join("rect")
      .attr("x", (item) => x(item.q1))
      .attr("width", (item) => Math.max(1, x(item.q3) - x(item.q1)))
      .attr("y", 52)
      .attr("height", 52)
      .attr("rx", 5)
      .attr("fill", "var(--color-surface-muted)")
      .attr("stroke", "var(--color-chart-a)")
      .attr("stroke-width", 2);

    svg
      .select(".median")
      .selectAll("line")
      .data([summary])
      .join("line")
      .attr("x1", (item) => x(item.median))
      .attr("x2", (item) => x(item.median))
      .attr("y1", 49)
      .attr("y2", 107)
      .attr("stroke", "var(--color-chart-a)")
      .attr("stroke-width", 3);

    svg
      .select(".points")
      .selectAll("circle")
      .data(summary.values)
      .join("circle")
      .attr("cx", (value) => x(value))
      .attr("cy", (_, index) => 117 + (index % 3) * 5)
      .attr("r", 3)
      .attr("fill", "var(--color-chart-b)")
      .attr("opacity", 0.65);
  }, [summary]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} 170`}
      className="h-auto w-full min-w-[680px]"
      role="img"
      aria-label={`${sex} 보험료 최소값, 사분위, 중앙값, 최대값 분포 차트`}
    >
      <g className="x-axis" />
      <g className="whisker" />
      <g className="box" />
      <g className="median" />
      <g className="points" />
    </svg>
  );
}
