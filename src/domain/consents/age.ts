export const AGE_OF_MAJORITY_YEARS = 18;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

type CalendarDate = { year: number; month: number; day: number };

const MADRID_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
});

function parseCalendarDate(value: string): CalendarDate {
  const match = DATE_ONLY.exec(value);
  if (!match) throw new Error('Fecha de nacimiento no válida');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    throw new Error('Fecha de nacimiento no válida');
  }
  return { year, month, day };
}

export function getMadridConsentDate(instant = new Date()): string {
  return MADRID_DATE_FORMATTER.format(instant);
}

export function calculateAge(birthDate: string, consentDate: string | Date = new Date()): number {
  const birth = parseCalendarDate(birthDate);
  const localDate = typeof consentDate === 'string' ? consentDate : getMadridConsentDate(consentDate);
  const today = parseCalendarDate(localDate);
  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1;
  return age;
}

export function isMinorOnConsentDate(birthDate: string, consentDate: string | Date = new Date()): boolean {
  return calculateAge(birthDate, consentDate) < AGE_OF_MAJORITY_YEARS;
}
