import { Bot, Network, ShieldCheck, Gauge, BookOpenText, FlaskConical, Wand2, Compass } from "lucide-react";
export const AGENTS = [{
  key: "general",
  name: "Repo Analyst",
  tagline: "General purpose senior engineer",
  icon: Bot,
  tone: "olive"
}, {
  key: "architect",
  name: "Architect",
  tagline: "System design & data flow",
  icon: Network,
  tone: "olive"
}, {
  key: "security",
  name: "Security Expert",
  tagline: "Threats & secrets",
  icon: ShieldCheck,
  tone: "gold"
}, {
  key: "performance",
  name: "Performance",
  tagline: "Bottlenecks & caching",
  icon: Gauge,
  tone: "olive"
}, {
  key: "docs",
  name: "Docs Expert",
  tagline: "Publication-quality writing",
  icon: BookOpenText,
  tone: "gold"
}, {
  key: "testing",
  name: "Testing Expert",
  tagline: "Coverage & fixtures",
  icon: FlaskConical,
  tone: "olive"
}, {
  key: "reviewer",
  name: "Code Reviewer",
  tagline: "Quality & readability",
  icon: Wand2,
  tone: "gold"
}, {
  key: "mentor",
  name: "OSS Mentor",
  tagline: "First-PR guidance",
  icon: Compass,
  tone: "olive"
}];
export function findAgent(key) {
  return AGENTS.find(a => a.key === key) ?? AGENTS[0];
}