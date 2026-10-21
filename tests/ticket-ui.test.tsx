import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Ticket, TicketStatus } from "@/types/ticket";
import { ticketStatuses } from "@/types/ticket";
import StatusBadge from "@/app/components/StatusBadge";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/utils/firebase/tickets", () => ({ createTicket: vi.fn(), updateTicket: vi.fn() }));

import CreateForm from "@/app/(dashboard)/tickets/create/CreateForm";
import EditForm from "@/app/(dashboard)/tickets/[id]/edit/EditForm";

const expectedStatuses: TicketStatus[] = [
  "Not started", "In progress", "Pending", "Resolved", "Closed", "Won't Fix", "Pending Release",
];

describe("Ticket status options and badges", () => {
  it("offers the seven supported statuses in form order without duplicates", () => {
    expect(ticketStatuses).toEqual(expectedStatuses);
    expect(new Set(ticketStatuses).size).toBe(ticketStatuses.length);
  });

  it.each([
    ["Not started", "bg-orange-300 text-orange-800"],
    ["In progress", "bg-blue-300 text-blue-800"],
    ["Pending", "bg-yellow-300 text-yellow-800"],
    ["Resolved", "bg-green-400 text-green-900"],
    ["Closed", "bg-gray-200 text-gray-700"],
    ["Won't Fix", "bg-purple-300 text-purple-800"],
    ["Pending Release", "bg-green-200 text-green-800"],
  ] as const)("renders the label and existing colors for %s", (status, colors) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />);
    expect(html).toContain(`class="pill ${colors}"`);
    expect(html).toContain(`Status: ${status.replaceAll("'", "&#x27;")}`);
  });
});

const ticket: Ticket = {
  id: "ticket-1", title: "Printer broken", body: "Paper jam", priority: "low",
  status: "Pending", user_id: "author-1", user_email: "author@example.test",
  created_at: { seconds: 100, nanoseconds: 0 } as Ticket["created_at"],
};

describe("Ticket form validation markup", () => {
  // Static rendering verifies the constraints declared by the components.
  // Browser enforcement, interactions and submissions still need Playwright.
  it.each([
    ["create", () => renderToStaticMarkup(<CreateForm />)],
    ["edit", () => renderToStaticMarkup(<EditForm ticket={ticket} />)],
  ] as const)("keeps title/body required and all supported statuses in the %s form", (_name, render) => {
    const html = render();
    expect(html).toMatch(/<input\b[^>]*required=""[^>]*type="text"/);
    expect(html).toMatch(/<textarea\b[^>]*required=""/);
    expect(html.match(/<option\b/g)).toHaveLength(expectedStatuses.length);
    for (const status of expectedStatuses) {
      expect(html).toContain(`value="${status.replaceAll("'", "&#x27;")}"`);
    }
  });

  it("defaults new tickets to Not started with empty title/body", () => {
    const html = renderToStaticMarkup(<CreateForm />);
    expect(html).toMatch(/<input\b[^>]*value=""/);
    expect(html).toMatch(/<textarea\b[^>]*><\/textarea>/);
    expect(html).toContain('<option value="Not started" selected="">');
  });

  it.each(expectedStatuses)("prefills the edit form with existing text and status %s", (status) => {
    const html = renderToStaticMarkup(<EditForm ticket={{ ...ticket, status }} />);
    expect(html).toContain('value="Printer broken"');
    expect(html).toMatch(/<textarea\b[^>]*>Paper jam<\/textarea>/);
    expect(html).toContain(`<option value="${status.replaceAll("'", "&#x27;")}" selected="">`);
  });
});
