// Ethiopian mobile numbers: Ethio Telecom (09...) and Safaricom (07...).
// Accepts 0911234567, 911234567, +251911234567, 251 91 123 4567 and normalizes to +251911234567.

export function normalizeEthiopianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  let local: string;
  if (/^251[79]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[79]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[79]\d{8}$/.test(digits)) local = digits;
  else return null;
  return `+251${local}`;
}

/** "+251911234567" -> "+251 91 123 4567" */
export function formatPhone(phone: string): string {
  const m = /^\+251(\d{2})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+251 ${m[1]} ${m[2]} ${m[3]}` : phone;
}
