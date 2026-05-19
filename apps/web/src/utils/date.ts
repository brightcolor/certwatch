const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

export const formatDateTime = (value?: string | null) =>
  value ? dateTimeFormatter.format(new Date(value)) : "";

export const formatDate = (value?: string | null) =>
  value ? dateFormatter.format(new Date(value)) : "";
