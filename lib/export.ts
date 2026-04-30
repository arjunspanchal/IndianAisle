"use client";

import * as XLSX from "xlsx";
import {
  Budget,
  contingencyTotal,
  coupleDisplayName,
  formatDateRange,
  formatINR,
  grandTotal,
  mealLineTotal,
  sectionTotal,
  subtotalBeforeContingency,
} from "./budget";

const SECTIONS: { key: keyof Budget; title: string }[] = [
  { key: "decor", title: "03 Decor & florals" },
  { key: "entertainment", title: "04 Entertainment & AV" },
  { key: "photography", title: "05 Photography & video" },
  { key: "attire", title: "06 Attire & beauty" },
  { key: "travel", title: "07 Travel & logistics" },
  { key: "rituals", title: "08 Rituals & ceremonies" },
  { key: "gifting", title: "09 Invitations & gifting" },
  { key: "misc", title: "10 Miscellaneous" },
];

export function exportToExcel(budget: Budget): void {
  const wb = XLSX.utils.book_new();

  // ---- Summary ----
  const summary: (string | number)[][] = [
    [coupleDisplayName(budget.meta)],
    [budget.meta.venue],
    [formatDateRange(budget.meta.startDate, budget.meta.endDate)],
    [`${budget.meta.guests} guests · ${budget.meta.events} events`],
    [],
    ["Section", "Total (INR)"],
    ["01 Rooms", sectionTotal(budget, "rooms")],
    ["02 Meals", sectionTotal(budget, "meals")],
    ["03 Decor & florals", sectionTotal(budget, "decor")],
    ["04 Entertainment & AV", sectionTotal(budget, "entertainment")],
    ["05 Photography & video", sectionTotal(budget, "photography")],
    ["06 Attire & beauty", sectionTotal(budget, "attire")],
    ["07 Travel & logistics", sectionTotal(budget, "travel")],
    ["08 Rituals & ceremonies", sectionTotal(budget, "rituals")],
    ["09 Invitations & gifting", sectionTotal(budget, "gifting")],
    ["10 Miscellaneous", sectionTotal(budget, "misc")],
    [`11 Contingency (${budget.contingencyPct}%)`, contingencyTotal(budget)],
    [],
    ["Subtotal before contingency", subtotalBeforeContingency(budget)],
    ["GRAND TOTAL", grandTotal(budget)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summary);
  summaryWs["!cols"] = [{ wch: 32 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // ---- Rooms ----
  const rooms: (string | number)[][] = [["Category", "Count", "Rate / night", "Nights", "GST %", "Total"]];
  for (const c of budget.rooms.categories) {
    rooms.push([
      c.label,
      c.count,
      c.ratePerNight,
      budget.rooms.nights,
      budget.rooms.gstPct,
      Math.round(c.ratePerNight * (1 + budget.rooms.gstPct / 100) * c.count * budget.rooms.nights),
    ]);
  }
  rooms.push([]);
  rooms.push(["", "", "", "", "Total", sectionTotal(budget, "rooms")]);
  const roomsWs = XLSX.utils.aoa_to_sheet(rooms);
  roomsWs["!cols"] = [{ wch: 50 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, roomsWs, "Rooms");

  // ---- Meals ----
  const meals: (string | number)[][] = [["Meal", "Pax", "Rate", "Tax %", "Sittings", "Total"]];
  for (const m of budget.meals) {
    meals.push([m.label, m.pax, m.ratePerHead, m.taxPct, m.sittings, Math.round(mealLineTotal(m))]);
  }
  meals.push([]);
  meals.push(["", "", "", "", "Total", sectionTotal(budget, "meals")]);
  const mealsWs = XLSX.utils.aoa_to_sheet(meals);
  mealsWs["!cols"] = [{ wch: 36 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, mealsWs, "Meals");

  // ---- Line Items (with section subtotals) ----
  const items: (string | number)[][] = [["Section", "Item", "Source", "Amount", "Notes"]];
  for (const s of SECTIONS) {
    const list = budget[s.key] as { label: string; amount: number; source?: string; note?: string }[];
    for (const it of list) {
      items.push([s.title, it.label, it.source ?? "", it.amount, it.note ?? ""]);
    }
    if (list.length) {
      items.push(["", `${s.title} subtotal`, "", list.reduce((sum, it) => sum + it.amount, 0), ""]);
      items.push([]);
    }
  }
  items.push(["", `Contingency (${budget.contingencyPct}%)`, "", contingencyTotal(budget), ""]);
  items.push([]);
  items.push(["", "GRAND TOTAL", "", grandTotal(budget), ""]);
  const itemsWs = XLSX.utils.aoa_to_sheet(items);
  itemsWs["!cols"] = [{ wch: 28 }, { wch: 44 }, { wch: 12 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, itemsWs, "Line Items");

  const safeName = coupleDisplayName(budget.meta).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const total = formatINR(grandTotal(budget)).replace(/[^0-9]/g, "");
  XLSX.writeFile(wb, `${safeName || "Wedding"}_Budget_${total}.xlsx`);
}

export function printAsPDF(): void {
  window.print();
}
