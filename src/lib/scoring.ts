import { GRANT_OPPORTUNITIES } from "@/data/grants";
import { OrgProfile, ScoredGrant } from "@/types/grant";

const focusSynonyms: Record<string, string[]> = {
  "Climate resilience": ["climate", "resilience", "decarbon", "wildfire", "flood"],
  "Environmental justice": ["environmental justice", "air quality", "frontline"],
  "Community infrastructure": ["infrastructure", "community", "public realm"],
  "Education access": ["education", "learning", "school", "edtech"],
  "Workforce mobility": ["workforce", "jobs", "skills"],
  "Civic tech": ["civic", "govtech", "public service"],
  "Digital health": ["health", "care", "medicaid", "clinical"],
  "Maternal care": ["maternal", "perinatal", "birth"],
  "Water security": ["water", "aquifer", "watershed"],
  "Indigenous tech transfer": ["indigenous", "sovereign"],
  "Public safety": ["safety", "violence prevention"],
  "Food systems": ["food", "agriculture", "supply chain"],
  "Regenerative ag": ["regenerative", "soil", "agro"],
  "Neurodiversity": ["neuro", "autism", "adhd"],
  "Assistive tech": ["assistive", "accessibility", "aac"],
};

const focusKeywords = Object.entries(focusSynonyms).flatMap(([key, values]) =>
  values.map((value) => ({ key, value })),
);

function normalizeBudget(input: number) {
  return Math.max(0, Math.min(input, 10_000_000));
}

function keywordScore(mission: string, focusAreas: string[]): number {
  const missionLower = mission.toLowerCase();
  let hits = 0;
  focusAreas.forEach((area) => {
    focusKeywords
      .filter((entry) => entry.key === area)
      .forEach((entry) => {
        if (missionLower.includes(entry.value)) {
          hits += 1;
        }
      });
  });
  return Math.min(30, hits * 5);
}

export function scoreGrants(profile: OrgProfile): ScoredGrant[] {
  const normalizedBudget = normalizeBudget(profile.annualBudget);

  const scores: ScoredGrant[] = GRANT_OPPORTUNITIES.map((grant) => {
    let score = 25;
    const rationale: string[] = [];

    if (grant.focusAreas.includes(profile.focusArea)) {
      score += 20;
      rationale.push("Direct focus fit");
    }

    const missionFocusScore = keywordScore(profile.mission, grant.focusAreas);
    score += missionFocusScore;
    if (missionFocusScore > 0) {
      rationale.push("Mission keywords align");
    }

    if (grant.stageFit.includes(profile.stage)) {
      score += 10;
      rationale.push("Stage aligned");
    }

    if (grant.regions.includes(profile.geography)) {
      score += 8;
      rationale.push("Region eligible");
    }

    if (profile.desiredAmount >= grant.amount.min && profile.desiredAmount <= grant.amount.max) {
      score += 10;
      rationale.push("Request size in range");
    } else {
      score -= 5;
    }

    if (normalizedBudget >= grant.minBudget) {
      score += 5;
    } else {
      score -= 5;
      rationale.push("Budget under threshold");
    }

    if (profile.urgency > 70 && grant.decisionSpeed === "Fast-track") {
      score += 5;
      rationale.push("Can deploy capital fast");
    }

    if (profile.stage === "Growth" && grant.decisionSpeed === "Slow") {
      score -= 5;
    }

    if (profile.differentiator.length > 40) {
      score += 2;
    }

    score = Math.min(100, Math.max(0, score));

    return { ...grant, score, rationale };
  });

  return scores.sort((a, b) => b.score - a.score);
}
