"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MapPin, Rocket, Sparkles, TimerReset } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GRANT_OPPORTUNITIES } from "@/data/grants";
import { OrgProfile, OrgStage, ScoredGrant } from "@/types/grant";
import { scoreGrants } from "@/lib/scoring";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

const profileSchema = z.object({
  orgName: z.string().min(2, "Name is required"),
  mission: z.string().min(30, "Add a mission statement (30+ chars)"),
  focusArea: z.string(),
  geography: z.string(),
  stage: z.enum(["Prototype", "Pilot", "Growth"]),
  annualBudget: z.coerce.number().min(0, "Enter a positive number"),
  urgency: z.coerce.number().min(0).max(100),
  desiredAmount: z.coerce.number().min(5000),
  differentiator: z.string().min(25, "Share what makes you distinct"),
});

type ProfileForm = z.infer<typeof profileSchema>;

type InsightState = {
  scores: ScoredGrant[];
  brief: string;
  generating: boolean;
};

const STAGES: OrgStage[] = ["Prototype", "Pilot", "Growth"];

const geographies = [
  "North America",
  "Latin America",
  "Global South",
  "Europe",
  "Africa",
  "Asia Pacific",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );

const daysUntil = (deadline: string) => {
  const delta = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(delta / (1000 * 60 * 60 * 24)));
};

const focusAreas = Array.from(
  new Set(GRANT_OPPORTUNITIES.flatMap((grant) => grant.focusAreas)),
).sort();

const copyToClipboard = (text: string) => {
  if (!text) return;
  if (typeof navigator !== "undefined" && navigator?.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
};

const buildFocusData = (scores: ScoredGrant[]) => {
  const aggregate = new Map<string, number>();
  scores.forEach((grant) => {
    grant.focusAreas.forEach((area) => {
      const current = aggregate.get(area) ?? 0;
      aggregate.set(area, Math.max(current, grant.score));
    });
  });
  return Array.from(aggregate.entries())
    .map(([focus, score]) => ({ focus, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

export default function Home() {
  const [insight, setInsight] = useState<InsightState>({
    scores: [],
    brief: "",
    generating: false,
  });
  const [preview, setPreview] = useState({
    stage: "Pilot" as OrgStage,
    urgency: 82,
    desiredAmount: 150000,
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      orgName: "Common Thread Labs",
      mission:
        "We deploy community-owned microgrids that keep neighborhood clinics online during climate disasters, pairing hardware with youth green jobs.",
      focusArea: "Climate resilience",
      geography: "North America",
      stage: "Pilot",
      annualBudget: 550000,
      urgency: 82,
      desiredAmount: 150000,
      differentiator:
        "We already operate in three tribal lands with data-sharing agreements and a revenue-share with local coops.",
    },
  });

  const topGrant = insight.scores[0];
  const focusChartData = useMemo(() => buildFocusData(insight.scores), [insight.scores]);
  const fastTrackCount = insight.scores.filter((grant) => grant.decisionSpeed === "Fast-track").length;
  const dueSoonCount = insight.scores.filter((grant) => daysUntil(grant.deadline) <= 45).length;
  const avgScore =
    insight.scores.slice(0, 3).reduce((acc, grant) => acc + grant.score, 0) /
    Math.max(1, Math.min(3, insight.scores.length));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((value) => {
      const nextUrgency = value.urgency !== undefined ? Number(value.urgency) : undefined;
      const nextDesired =
        value.desiredAmount !== undefined ? Number(value.desiredAmount) : undefined;

      setPreview((prev) => ({
        stage: (value.stage as OrgStage) ?? prev.stage,
        urgency: Number.isFinite(nextUrgency) ? Number(nextUrgency) : prev.urgency,
        desiredAmount: Number.isFinite(nextDesired) ? Number(nextDesired) : prev.desiredAmount,
      }));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const submit = async (values: ProfileForm) => {
    const profile: OrgProfile = {
      ...values,
      annualBudget: Number(values.annualBudget),
      desiredAmount: Number(values.desiredAmount),
    };

    const scores = scoreGrants(profile);
    setInsight({ scores, brief: "", generating: true });

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, topGrant: scores[0] }),
      });
      const data = await response.json();
      setInsight({ scores, brief: data.brief, generating: false });
    } catch (error) {
      console.error("brief error", error);
      setInsight({ scores, brief: "", generating: false });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pt-16 lg:flex-row">
        <section className="w-full space-y-4 lg:w-5/12">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-sky-300">GrantPilot</p>
            <h1 className="mt-2 text-4xl font-semibold text-white lg:text-5xl">
              Find funders that buy your next milestone.
            </h1>
            <p className="mt-4 text-base text-slate-300">
              Input the real constraints of your venture and GrantPilot scores premium grant programs, then
              spins a funder-ready micro-brief powered by GPT-4. No more 40-tab searching.
            </p>
            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Top match</p>
                <p className="text-2xl font-semibold text-white">
                  {insight.scores.length ? `${Math.round(topGrant?.score ?? 0)}%` : "—"}
                </p>
                <p>Ready in {dueSoonCount || "—"} deadlines &lt;45 days.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Average score</p>
                <p className="text-2xl font-semibold text-white">
                  {insight.scores.length ? `${Math.round(avgScore)}%` : "—"}
                </p>
                <p>Benchmark across your top trio.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Fast-track pool</p>
                <p className="text-2xl font-semibold text-white">
                  {insight.scores.length ? fastTrackCount : "—"}
                </p>
                <p>Programs that wire funds within 30 days.</p>
              </div>
            </div>
          </div>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-xl text-white">Venture fingerprint</CardTitle>
              <CardDescription className="text-slate-400">
                Describe your org once; we handle matching logic and storytelling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4 text-left" onSubmit={form.handleSubmit(submit)}>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-200">Organization name</label>
                  <Input
                    {...form.register("orgName")}
                    className="bg-slate-900 text-slate-50 placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-slate-200">Mission snapshot</label>
                  <textarea
                    {...form.register("mission")}
                    rows={3}
                    className="w-full rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-slate-200">Primary focus</label>
                    <select
                      {...form.register("focusArea")}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100"
                    >
                      {focusAreas.map((area) => (
                        <option key={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-slate-200">Geography</label>
                    <select
                      {...form.register("geography")}
                      className="w-full rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100"
                    >
                      {geographies.map((geo) => (
                        <option key={geo}>{geo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-slate-200">Stage</label>
                    <div className="flex gap-2">
                      {STAGES.map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => form.setValue("stage", stage)}
                          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                            preview.stage === stage
                              ? "border-sky-400 bg-sky-400/10 text-white"
                              : "border-slate-800 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm text-slate-200">Deployment urgency ({preview.urgency}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      {...form.register("urgency")}
                      className="w-full accent-sky-400"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-slate-200">Annual budget (USD)</label>
                    <Input
                      type="number"
                      {...form.register("annualBudget")}
                      className="bg-slate-900 text-slate-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-slate-200">Ideal grant ask</label>
                    <Input
                      type="number"
                      {...form.register("desiredAmount")}
                      className="bg-slate-900 text-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-slate-200">Proof you have unfair advantages</label>
                  <textarea
                    {...form.register("differentiator")}
                    rows={2}
                    className="w-full rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
                  />
                </div>

                <Button type="submit" className="w-full bg-sky-400 text-slate-950 hover:bg-sky-300">
                  Run Grant Intelligence
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="w-full lg:w-7/12">
          <div className="grid gap-4">
            <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-5 w-5 text-sky-300" />
                  Grant radar
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Weighted on focus fit, amount range, region, readiness signals, and deployment urgency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insight.scores.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Awaiting your inputs—press “Run Grant Intelligence” to see precision-matched grant programs.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {insight.scores.slice(0, 3).map((grant) => (
                      <div
                        key={grant.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-900/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{grant.funder}</p>
                            <h3 className="text-xl font-semibold text-white">{grant.name}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-400">Match</p>
                            <p className="text-3xl font-bold text-sky-300">{grant.score}%</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 px-3 py-1 text-slate-300">
                            <MapPin className="h-3 w-3" />
                            {grant.regions.join(" / ")}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 px-3 py-1 text-slate-300">
                            <TimerReset className="h-3 w-3" />
                            {daysUntil(grant.deadline)} days
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 px-3 py-1 text-slate-300">
                            <Rocket className="h-3 w-3" />
                            {grant.decisionSpeed}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-300">{grant.description}</p>
                        <div className="mt-3 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                          <div>
                            <p className="text-slate-500">Amount</p>
                            <p>
                              {formatCurrency(grant.amount.min)} - {formatCurrency(grant.amount.max)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Focus</p>
                            <p>{grant.focusAreas.join(" • ")}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Signals</p>
                            <p>{grant.signals[0]}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                          {grant.rationale.map((item) => (
                            <span key={item} className="rounded-md bg-slate-800 px-2 py-1">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="text-xl text-white">Program officer brief</CardTitle>
                <CardDescription className="text-slate-400">
                  Auto-generated narrative you can paste into an LOI or warm intro email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insight.generating && (
                  <p className="text-sm text-slate-400">Drafting with GPT-4… breathing life into your metrics.</p>
                )}
                {insight.brief ? (
                  <p className="whitespace-pre-line rounded-md border border-slate-800 bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-50">
                    {insight.brief}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Submit your profile to see a condensed, funder-friendly story anchored on the strongest match.
                  </p>
                )}
                {topGrant && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Talk tracks to name</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Reference {topGrant.signals[0]} explicitly in your opener.</li>
                      <li>
                        Note that your request ({formatCurrency(preview.desiredAmount)}) is within their{" "}
                        {formatCurrency(topGrant.amount.min)}-{formatCurrency(topGrant.amount.max)} band.
                      </li>
                      <li>Invite them to a fast deployment sprint within {preview.urgency} days.</li>
                    </ul>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  onClick={() => copyToClipboard(insight.brief)}
                  disabled={!insight.brief}
                >
                  Copy brief
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-xl text-white">Grant calendar pulse</CardTitle>
                <CardDescription className="text-slate-400">
                  Prioritize the next 45 days. Auto-builds a pursuit pipeline every time you re-run the model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insight.scores.length === 0 ? (
                  <p className="text-sm text-slate-400">No opportunities tracked yet.</p>
                ) : (
                  <div className="space-y-3">
                    {insight.scores.slice(0, 4).map((grant) => (
                      <div key={grant.id} className="flex items-center justify-between rounded-lg bg-slate-950/50 p-3 text-sm">
                        <div>
                          <p className="font-medium text-white">{grant.name}</p>
                          <p className="text-slate-400">Due in {daysUntil(grant.deadline)} days</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Ask ready?</p>
                          <Button
                            variant="secondary"
                            className="bg-slate-800 text-white hover:bg-slate-700"
                            onClick={() => {
                              const rationale = grant.rationale.join(", ");
                              copyToClipboard(
                                `${grant.name} – ${formatCurrency(grant.amount.min)}-${formatCurrency(
                                  grant.amount.max,
                                )} | ${rationale}`,
                              );
                            }}
                          >
                            Prep kit <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-xl text-white">Focus alignment radar</CardTitle>
                <CardDescription className="text-slate-400">
                  Visualizes how funders’ thesis areas overlap with your mission keywords.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {focusChartData.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Run GrantPilot to see how your work lands across the funding landscape.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={focusChartData}>
                      <PolarGrid stroke="rgba(148, 163, 184, 0.3)" />
                      <PolarAngleAxis
                        dataKey="focus"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickLine={false}
                      />
                      <Radar
                        dataKey="score"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.25}
                        dot={{ r: 2, fill: "#bae6fd" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
