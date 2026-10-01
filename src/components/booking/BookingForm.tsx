"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { DateSlotPicker } from "./BookingFlow";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatK, minutesTo12Hour, normalisePhone, isZambianPhone } from "@/lib/utils";
import { Scissors, Home as HomeIcon, ChevronRight, ChevronLeft, Loader2, AlertCircle, MapPin } from "lucide-react";
import { format } from "date-fns";

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceNgwee: number;
  type: "shop" | "home" | "both";
}

interface BookingFormProps {
  bookType: "shop" | "home";
  services: ServiceOption[];
  defaultTravelFeeNgwee: number;
  businessPhone: string;
}

export function BookingForm({
  bookType,
  services,
  defaultTravelFeeNgwee,
  businessPhone,
}: BookingFormProps) {
  const router = useRouter();

  // Step 1: service, 2: date/time, 3: contact, 4: review
  const [step, setStep] = React.useState(1);
  const [serviceId, setServiceId] = React.useState<string>(
    services[0]?.id ?? "",
  );
  const [date, setDate] = React.useState<string | null>(null);
  const [time, setTime] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredServices = services.filter(
    (s) => s.type === bookType || s.type === "both",
  );

  const service = services.find((s) => s.id === serviceId);
  const travelFee =
    bookType === "home" && service ? defaultTravelFeeNgwee : 0;
  const total = (service?.priceNgwee ?? 0) + travelFee;

  function pickService(id: string) {
    setServiceId(id);
    setDate(null);
    setTime(null);
  }

  function pickDateTime(d: string, t: string) {
    setDate(d);
    setTime(t);
  }

  function canAdvance(): boolean {
    if (step === 1) return !!service;
    if (step === 2) return !!date && !!time;
    if (step === 3) {
      if (!name.trim() || name.trim().length < 2) return false;
      if (!isZambianPhone(phone)) return false;
      if (bookType === "home" && address.trim().length < 5) return false;
      return true;
    }
    return true;
  }

  async function submit() {
    setError(null);
    if (!service || !date || !time) {
      setError("Please complete all steps.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookType,
          serviceId: service.id,
          scheduledAt: time,
          customer: {
            name: name.trim(),
            phone: normalisePhone(phone),
            address: bookType === "home" ? address.trim() : null,
          },
          customerNotes: notes.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Could not create booking. Please try again.");
        return;
      }
      router.push(`/book/confirmation/${j.bookingRef}`);
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = ["Service", "Date & Time", "Your Details", "Confirm"];
  const Icon = bookType === "shop" ? Scissors : HomeIcon;

  return (
    <div>
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-2 sm:gap-4 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 border border-accent/30">
            <Icon size={16} className="text-accent" />
          </span>
          <div>
            <p className="label-eyebrow">
              {bookType === "shop" ? "In-Shop Booking" : "Home Service Booking"}
            </p>
            <h2 className="font-display text-2xl">
              {bookType === "shop"
                ? "Visit Alick at the studio."
                : "Alick comes to you."}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition ${
                      done
                        ? "bg-accent text-ink"
                        : active
                          ? "bg-accent/20 text-accent border border-accent"
                          : "bg-ink-soft text-cream/40 border border-ink-border"
                    }`}
                  >
                    {done ? "✓" : n}
                  </span>
                  <span
                    className={`hidden sm:inline text-xs uppercase tracking-wider ${
                      active ? "text-cream" : "text-cream/40"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <span
                    className={`flex-1 h-px ${
                      done ? "bg-accent" : "bg-ink-line"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="card-base p-6 sm:p-8">
        {step === 1 && (
          <div>
            <h3 className="font-display text-2xl mb-1">Choose a service</h3>
            <p className="text-sm text-cream/50 mb-6">
              Select one service for this appointment.
            </p>
            <div className="grid gap-3">
              {filteredServices.map((s) => {
                const selected = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickService(s.id)}
                    className={`text-left rounded-2xl border p-5 transition ${
                      selected
                        ? "border-accent bg-accent/5"
                        : "border-ink-border bg-ink-soft hover:border-cream/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-display text-xl">{s.name}</h4>
                        <p className="mt-1.5 text-sm text-cream/60 leading-relaxed">
                          {s.description}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs text-cream/50">
                          <span>{s.durationMinutes} min</span>
                          <span className="text-cream/30">·</span>
                          <span>
                            {s.type === "shop"
                              ? "In-shop only"
                              : s.type === "home"
                                ? "Home only"
                                : "Both"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl gradient-text">
                          {formatK(s.priceNgwee)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && service && (
          <div>
            <h3 className="font-display text-2xl mb-1">Pick a date & time</h3>
            <p className="text-sm text-cream/50 mb-6">
              Real-time availability for {service.name} ({service.durationMinutes} min).
            </p>
            <DateSlotPicker
              serviceId={service.id}
              selectedDate={date}
              selectedTime={time}
              onSelect={pickDateTime}
              bookType={bookType}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-2xl mb-1">Your details</h3>
              <p className="text-sm text-cream/50">
                We'll use this to confirm your booking.
              </p>
            </div>
            <Input
              label="Full name"
              placeholder="e.g. Chilufya Mwamba"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
            <Input
              label="Phone number"
              placeholder="097 700 0000 or +260 977 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              hint="Zambian numbers only. We'll send your confirmation here."
              required
            />
            {bookType === "home" && (
              <Textarea
                label="Service location / address"
                placeholder="House number, street, area, Lusaka"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                required
              />
            )}
            <Textarea
              label="Notes (optional)"
              placeholder="Anything Alick should know? Style reference, allergies, parking instructions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {step === 4 && service && date && time && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-2xl mb-1">Confirm booking</h3>
              <p className="text-sm text-cream/50">
                Review the details below and submit.
              </p>
            </div>

            <div className="rounded-2xl border border-ink-border bg-ink-soft divide-y divide-ink-line">
              <Row label="Service">
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-cream/50 mt-0.5">
                  {service.durationMinutes} min
                </p>
              </Row>
              <Row label={bookType === "shop" ? "Location" : "Service location"}>
                {bookType === "shop" ? (
                  <p className="font-medium">The studio, Kabulonga</p>
                ) : (
                  <p className="font-medium">{address}</p>
                )}
              </Row>
              <Row label="Date & time">
                <p className="font-medium">
                  {format(new Date(time), "EEEE, d MMMM yyyy")}
                </p>
                <p className="text-xs text-accent mt-0.5">
                  {minutesTo12Hour(
                    new Date(time).getHours() * 60 +
                      new Date(time).getMinutes(),
                  )}
                </p>
              </Row>
              <Row label="Customer">
                <p className="font-medium">{name}</p>
                <p className="text-xs text-cream/50 mt-0.5">
                  +{normalisePhone(phone)}
                </p>
              </Row>
              {notes && (
                <Row label="Notes">
                  <p className="text-cream/75 text-sm whitespace-pre-wrap">
                    {notes}
                  </p>
                </Row>
              )}
            </div>

            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
              <p className="label-eyebrow mb-3">Price breakdown</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cream/65">{service.name}</span>
                  <span>{formatK(service.priceNgwee)}</span>
                </div>
                {bookType === "home" && (
                  <div className="flex justify-between">
                    <span className="text-cream/65 flex items-center gap-1.5">
                      <MapPin size={12} className="text-accent" />
                      Travel fee
                    </span>
                    <span>{formatK(defaultTravelFeeNgwee)}</span>
                  </div>
                )}
                <div className="hairline-thin my-2" />
                <div className="flex justify-between text-lg font-display">
                  <span>Total</span>
                  <span className="gradient-text">{formatK(total)}</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-cream/50">
                Pay after your appointment. No online payment required to
                book. Alick will confirm your slot.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex gap-3 text-sm text-red-300">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-ink-line flex items-center justify-between">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={submitting}
            >
              <ChevronLeft size={16} />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
            >
              Continue
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={submit}
              loading={submitting}
              disabled={submitting}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Confirming…
                </>
              ) : (
                <>
                  Confirm Booking
                  <ChevronRight size={16} />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 px-5 py-4">
      <p className="text-[11px] uppercase tracking-wider text-cream/40 col-span-1 mt-1">
        {label}
      </p>
      <div className="col-span-2">{children}</div>
    </div>
  );
}