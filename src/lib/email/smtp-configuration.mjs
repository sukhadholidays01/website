/** Return fixed diagnostic codes only; never return credentials or sender values. */
export function smtpConfigurationProblems(environment) {
  const problems = [];
  if (!environment.SMTP_HOST) problems.push("SMTP_HOST_MISSING");
  if (!environment.SMTP_USER) problems.push("SMTP_USER_MISSING");
  else if (!/^[^\s<>@]+@[^\s<>@]+$/.test(environment.SMTP_USER)) problems.push("SMTP_USER_INVALID");
  if (!environment.SMTP_PASS) problems.push("SMTP_PASS_MISSING");
  if (![465, 587].includes(Number(environment.SMTP_PORT || 465))) problems.push("SMTP_PORT_INVALID");
  return problems;
}
