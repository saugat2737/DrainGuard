import {
  Zone,
  Report,
  ZoneRisk,
  RiskLevel,
  RiskFactor,
} from "./types";

/**
 * Weights per docs/RISK_ENGINE.md:
 * score = 100 * ( 0.40*rain + 0.25*blockage + 0.20*history + 0.15*elevation )
 */
export const RISK_WEIGHTS = {
  rain: 0.40,
  blockage: 0.25,
  history: 0.20,
  elevation: 0.15,
} as const;

/**
 * Tunable constants (previously inline magic numbers; values unchanged).
 *
 * RAIN_CAP_MM: the rain factor saturates here. The UI slider goes to 120 mm,
 *   but any rainfall above this value produces the same score.
 * RAIN_GATE_MM / RAIN_GATE_MULTIPLIER: below RAIN_GATE_MM the whole score is
 *   multiplied by RAIN_GATE_MULTIPLIER. This is a hard step (not a ramp), so
 *   the score jumps when rainfall crosses RAIN_GATE_MM.
 * BLOCKAGE_SATURATION: weighted report severity at which the blockage factor
 *   reaches 1.0.
 */
export const RAIN_CAP_MM = 60;
export const RAIN_GATE_MM = 5;
export const RAIN_GATE_MULTIPLIER = 0.3;
export const BLOCKAGE_SATURATION = 6;

/**
 * Risk level thresholds per docs/RISK_ENGINE.md:
 * 0–29: low
 * 30–59: medium
 * 60–79: high
 * 80–100: severe
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "severe";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/**
 * Normalize rainfall (mm) -> (0..1)
 * rain = min(rain_mm / RAIN_CAP_MM, 1)
 * Note: saturates at RAIN_CAP_MM (60 mm), below the 120 mm slider maximum.
 */
export function calculateRainFactor(rainMm: number): number {
  const safeRain = Math.max(0, rainMm);
  return Math.min(safeRain / RAIN_CAP_MM, 1);
}

/**
 * Normalize blockage severity:
 * min(sum(severity * status weight) / BLOCKAGE_SATURATION, 1)
 * open reports count fully (1.0), assigned count half (0.5), cleared count 0.
 * Known limitation: reports do not decay with age; an open report counts
 * until its status is changed.
 */
export function calculateBlockageFactor(reports: Report[]): {
  factor: number;
  effectiveReportsCount: number;
  blockageTypes: string[];
} {
  let effectiveSum = 0;
  let activeCount = 0;
  const typesSet = new Set<string>();

  for (const report of reports) {
    if (report.status === "cleared") {
      continue;
    }
    const weightMultiplier = report.status === "assigned" ? 0.5 : 1.0;
    effectiveSum += report.severity * weightMultiplier;
    activeCount += 1;
    if (report.blockage_type && report.blockage_type !== "none" && report.blockage_type !== "unknown") {
      typesSet.add(report.blockage_type);
    }
  }

  const factor = Math.min(effectiveSum / BLOCKAGE_SATURATION, 1);

  return {
    factor,
    effectiveReportsCount: activeCount,
    blockageTypes: Array.from(typesSet).sort(),
  };
}

/**
 * Generate human-readable factor descriptions
 */
function getRainDescription(rainMm: number): string {
  if (rainMm >= 60) return `torrential rain forecast (${Math.round(rainMm)} mm)`;
  if (rainMm >= 35) return `heavy rain forecast (${Math.round(rainMm)} mm)`;
  if (rainMm >= 15) return `moderate rain forecast (${Math.round(rainMm)} mm)`;
  if (rainMm >= 5) return `light rain forecast (${Math.round(rainMm)} mm)`;
  return `dry/minimal rain (${Math.round(rainMm)} mm)`;
}

function getBlockageDescription(activeCount: number, types: string[]): string {
  if (activeCount === 0) return "no active blockage reports";
  const typesText = types.length > 0 ? ` (${types.join(", ")})` : "";
  return `${activeCount} open blockage report${activeCount > 1 ? "s" : ""}${typesText}`;
}

function getHistoryDescription(factor: number): string {
  if (factor >= 0.75) return "frequent past waterlogging";
  if (factor >= 0.45) return "occasional past waterlogging";
  return "low past waterlogging history";
}

function getElevationDescription(factor: number): string {
  if (factor >= 0.75) return "low-lying street";
  if (factor >= 0.45) return "moderate-slope terrain";
  return "elevated terrain";
}

/**
 * Pure risk engine computation
 * @param zone Zone data
 * @param rainMm Rainfall input in mm (UI range 0-120; the rain factor
 *   saturates at RAIN_CAP_MM). The forecast window used by /api/weather is
 *   defined in that handler, not here.
 * @param zoneReports Reports linked to this zone (open, assigned or cleared;
 *   cleared reports contribute nothing)
 */
export function calculateZoneRisk(
  zone: Zone,
  rainMm: number,
  zoneReports: Report[] = []
): ZoneRisk {
  const safeRain = Math.max(0, rainMm);
  const rainNorm = calculateRainFactor(safeRain);
  const { factor: blockageNorm, effectiveReportsCount, blockageTypes } =
    calculateBlockageFactor(zoneReports);

  const historyNorm = Math.min(Math.max(0, zone.history_factor), 1);
  const elevationNorm = Math.min(Math.max(0, zone.elevation_factor), 1);

  // Raw weighted score: 100 * (0.40*rain + 0.25*blockage + 0.20*history + 0.15*elevation)
  const rainRawContrib = 100 * RISK_WEIGHTS.rain * rainNorm;
  const blockageRawContrib = 100 * RISK_WEIGHTS.blockage * blockageNorm;
  const historyRawContrib = 100 * RISK_WEIGHTS.history * historyNorm;
  const elevationRawContrib = 100 * RISK_WEIGHTS.elevation * elevationNorm;

  const rawScore =
    rainRawContrib + blockageRawContrib + historyRawContrib + elevationRawContrib;

  // Rain gating: below RAIN_GATE_MM, multiply the score by RAIN_GATE_MULTIPLIER
  const isGated = safeRain < RAIN_GATE_MM;
  const gateMultiplier = isGated ? RAIN_GATE_MULTIPLIER : 1.0;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore * gateMultiplier)));
  const level = getRiskLevel(finalScore);

  // Gated contributions for explanation ranking
  const rainContrib = rainRawContrib * gateMultiplier;
  const blockageContrib = blockageRawContrib * gateMultiplier;
  const historyContrib = historyRawContrib * gateMultiplier;
  const elevationContrib = elevationRawContrib * gateMultiplier;

  const factors: RiskFactor[] = [
    {
      key: "rain",
      value: rainNorm,
      weight: RISK_WEIGHTS.rain,
      contribution: rainContrib,
      text: getRainDescription(safeRain),
    },
    {
      key: "blockage",
      value: blockageNorm,
      weight: RISK_WEIGHTS.blockage,
      contribution: blockageContrib,
      text: getBlockageDescription(effectiveReportsCount, blockageTypes),
    },
    {
      key: "history",
      value: historyNorm,
      weight: RISK_WEIGHTS.history,
      contribution: historyContrib,
      text: getHistoryDescription(historyNorm),
    },
    {
      key: "elevation",
      value: elevationNorm,
      weight: RISK_WEIGHTS.elevation,
      contribution: elevationContrib,
      text: getElevationDescription(elevationNorm),
    },
  ];

  // Filter factors with contribution >= 10% of finalScore, ordered by contribution descending
  // If finalScore is 0, list top zero-contribution factor or clear message
  const minThreshold = finalScore > 0 ? 0.10 * finalScore : -1;
  const qualifyingFactors = factors
    .filter((f) => f.contribution >= minThreshold)
    .sort((a, b) => b.contribution - a.contribution);

  const levelDisplay = level.charAt(0).toUpperCase() + level.slice(1);
  let explanationSentence: string;
  if (qualifyingFactors.length === 0 || finalScore === 0) {
    explanationSentence = `${levelDisplay} risk (${finalScore}): minimal flood risk under current dry conditions.`;
  } else {
    const factorPhrases = qualifyingFactors.map((f) => f.text).join(", ");
    explanationSentence = `${levelDisplay} risk (${finalScore}): ${factorPhrases}.`;
  }

  const linkedReportIds = zoneReports.map((r) => r.id);

  return {
    zone_id: zone.id,
    score: finalScore,
    level,
    factors,
    explanation: explanationSentence,
    linked_report_ids: linkedReportIds,
  };
}
