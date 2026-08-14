import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const EXPECTED_BYTES = 65_536;
const requestCount = readInteger("ARGO_TEST_REQUESTS", 600, 1, 100_000);
const concurrency = readInteger("ARGO_TEST_CONCURRENCY", 5, 1, 10);
const baseUrlValue = process.env.ARGO_TEST_BASE_URL;
const token = process.env.ARGO_TEST_TOKEN;

if (!baseUrlValue) fail("ARGO_TEST_BASE_URL 환경변수가 필요합니다.");
if (!token) fail("ARGO_TEST_TOKEN 환경변수가 필요합니다.");

let baseUrl;
try {
  baseUrl = new URL(baseUrlValue);
} catch {
  fail("ARGO_TEST_BASE_URL이 올바른 URL이 아닙니다.");
}
if (!["https:", "http:"].includes(baseUrl.protocol)) {
  fail("ARGO_TEST_BASE_URL은 http 또는 https URL이어야 합니다.");
}

const startedAt = new Date().toISOString();
console.log(`시작 시각: ${startedAt}`);
console.log(`경로별 요청 수: ${requestCount}`);
console.log(`동시 요청 수: ${concurrency}`);

const tests = [
  { path: "/__argo-test/r2", source: "r2" },
  { path: "/__argo-test/external", source: "external" },
];

let totalFailures = 0;
for (const test of tests) {
  const result = await runPath(test);
  totalFailures += result.failures;
  printResult(result);
}

if (totalFailures > 0) process.exitCode = 1;

async function runPath({ path, source }) {
  const runPrefix = `${source}-${Date.now()}-${randomUUID()}`;
  const durations = [];
  const errors = [];
  let nextIndex = 0;
  let successes = 0;
  let failures = 0;
  let totalBytes = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= requestCount) return;

      const target = new URL(path, baseUrl);
      target.searchParams.set("run", `${runPrefix}-${index + 1}-${randomUUID()}`);
      const requestStarted = performance.now();
      try {
        const response = await fetch(target, {
          method: "GET",
          headers: { "x-argo-test-token": token },
          cache: "no-store",
          redirect: "error",
        });
        const body = await response.arrayBuffer();
        const elapsed = performance.now() - requestStarted;
        durations.push(elapsed);
        totalBytes += body.byteLength;

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`);
        }
        if (response.headers.get("x-argo-test-source") !== source) {
          throw new Error("X-Argo-Test-Source 불일치");
        }
        if (body.byteLength !== EXPECTED_BYTES) {
          throw new Error(`본문 크기 ${body.byteLength}바이트`);
        }
        successes += 1;
      } catch (error) {
        failures += 1;
        if (errors.length < 5) {
          errors.push(error instanceof Error ? error.message : "알 수 없는 오류");
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  durations.sort((left, right) => left - right);
  return {
    source,
    runPrefix,
    total: requestCount,
    successes,
    failures,
    totalBytes,
    average: durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : 0,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    errors,
  };
}

function printResult(result) {
  console.log("");
  console.log(`[${result.source}]`);
  console.log(`run 식별자: ${result.runPrefix}`);
  console.log(`전체 요청 수: ${result.total}`);
  console.log(`성공 수: ${result.successes}`);
  console.log(`실패 수: ${result.failures}`);
  console.log(`받은 총 바이트: ${result.totalBytes}`);
  console.log(`평균 응답시간: ${formatMilliseconds(result.average)}`);
  console.log(`p50 응답시간: ${formatMilliseconds(result.p50)}`);
  console.log(`p95 응답시간: ${formatMilliseconds(result.p95)}`);
  for (const error of result.errors) console.log(`실패 예시: ${error}`);
}

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

function formatMilliseconds(value) {
  return `${value.toFixed(2)}ms`;
}

function readInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    fail(`${name}은 ${minimum}~${maximum} 범위의 정수여야 합니다.`);
  }
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
