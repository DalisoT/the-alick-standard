export function statusTone(status: string) {
  switch (status) {
    case "confirmed":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "completed":
      return "info" as const;
    case "cancelled":
    case "declined":
    case "no_show":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function labelStatus(status: string) {
  const map: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    declined: "Declined",
    no_show: "No-show",
  };
  return map[status] ?? status;
}