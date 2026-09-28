import { defineConfig } from "vitest/config";

// Two groups, run one after the other (sequence.groupOrder):
//   1. "unit"       - everything except tests/scripts, fully parallel.
//   2. "benchmarks" - tests/scripts (evaluation scripts and wall-clock
//                     performance checks), one file at a time, after group
//                     1 has finished.
// The timing assertions (e.g. T4.5's "under 200 ms") are only meaningful
// when the machine is not also running a dozen parallel test workers and
// in-memory MongoDB servers; see Decision Log I7.6.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/**/*.test.js"],
          exclude: ["tests/scripts/**"],
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: "benchmarks",
          include: ["tests/scripts/**/*.test.js"],
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
