export type OrgStage = "Prototype" | "Pilot" | "Growth";

export type OrgProfile = {
  orgName: string;
  mission: string;
  focusArea: string;
  geography: string;
  stage: OrgStage;
  annualBudget: number;
  urgency: number;
  desiredAmount: number;
  differentiator: string;
};

export type GrantOpportunity = {
  id: string;
  name: string;
  funder: string;
  url: string;
  focusAreas: string[];
  regions: string[];
  stageFit: OrgStage[];
  amount: { min: number; max: number };
  deadline: string;
  decisionSpeed: "Fast-track" | "Standard" | "Slow";
  minBudget: number;
  description: string;
  signals: string[];
};

export type ScoredGrant = GrantOpportunity & {
  score: number;
  rationale: string[];
};
