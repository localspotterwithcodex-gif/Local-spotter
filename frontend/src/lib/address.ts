/** "Kerkstraat 12A" -> { street: "Kerkstraat", houseNumber: "12A" } (house number optional). */
export function splitStreet(value: string): { street: string; houseNumber?: string } {
  const match = value.trim().match(/^(.*?)\s+(\d+\s?[A-Za-z0-9-]*)$/);
  return match ? { street: match[1], houseNumber: match[2] } : { street: value.trim() };
}

export function joinStreet(street: string, houseNumber?: string | null): string {
  return [street, houseNumber].filter(Boolean).join(" ");
}
