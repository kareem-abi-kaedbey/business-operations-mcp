
export type Lead = {
  id: string;
  name: string;
  project: string;
  budget: number;
  currency: "EUR";
  status: "new" | "contacted" | "quoted" | "won" | "lost";
  priority: "low" | "medium" | "high";
};

export const leads: Lead[] = [
  {
    id: "L001",
    name: "Sophie Martin",
    project: "Custom kitchen",
    budget: 12000,
    currency: "EUR",
    status: "contacted",
    priority: "high",
  },
  {
    id: "L002",
    name: "Thomas Bernard",
    project: "Built-in wardrobe",
    budget: 4500,
    currency: "EUR",
    status: "new",
    priority: "medium",
  },
  {
    id: "L003",
    name: "Emma Dubois",
    project: "Living room renovation",
    budget: 18000,
    currency: "EUR",
    status: "quoted",
    priority: "high",
  },
  {
    id: "L004",
    name: "Lucas Petit",
    project: "Wooden shelves",
    budget: 800,
    currency: "EUR",
    status: "new",
    priority: "low",
  },
];

export type CustomerNote = {
  leadId: string;
  date: string;
  content: string;
};

export const customerNotes: CustomerNote[] = [
  {
    leadId: "L001",
    date: "2026-11-10",
    content:
      "Customer requested a quote for a custom kitchen.",
  },
  {
    leadId: "L001",
    date: "2026-11-12",
    content:
      "Customer prefers oak wood and needs delivery before March.",
  },
  {
    leadId: "L002",
    date: "2026-11-11",
    content:
      "Customer is comparing several contractors.",
  },
  {
    leadId: "L003",
    date: "2026-11-13",
    content:
      "Quote sent. Customer expects to make a decision next week.",
  },
];

export const businessRules = `
# Business Operations Rules

- Contact high-priority leads within 24 hours.
- Follow up on sent quotes within 7 days.
- Consider customer budget and project requirements.
- All lead budgets are expressed in EUR.
- Never invent customer information.
- If information is missing, explicitly acknowledge it.
- Do not claim that a deadline has been missed unless the relevant dates are available.
- Do not modify customer data without explicit authorization.
`;
