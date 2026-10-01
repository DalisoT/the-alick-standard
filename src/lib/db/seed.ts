/* Seed script — runs via `npm run db:seed` */
import { db, schema } from "./index";
import { ensureSchema } from "./migrate";
import { hashPassword } from "@/lib/auth";
import { nanoid } from "nanoid";
import { addDays, setHours, setMinutes, startOfDay, subDays } from "date-fns";

/**
 * Pass `--with-demo` to also insert sample customers, appointments and
 * expenses. By default we only seed the operating config (admin, services,
 * weekly availability, business settings) so the app launches empty and
 * Alick can build up his own customer base organically.
 */
const WITH_DEMO = process.argv.includes("--with-demo");

async function main() {
  await ensureSchema();
  console.log("🌱 Seeding THE ALICK STANDARD…");

  // 1) Admin user
  const existingAdmin = await db
    .select()
    .from(schema.adminUsers)
    .limit(1);

  if (existingAdmin.length === 0) {
    const username = process.env.ADMIN_USERNAME ?? "alick";
    const password = process.env.ADMIN_PASSWORD ?? "standard2026";
    await db.insert(schema.adminUsers).values({
      id: nanoid(12),
      username,
      passwordHash: await hashPassword(password),
      displayName: "Alick Tembo",
    });
    console.log(`✓ Admin user created (${username} / ${password})`);
  } else {
    console.log("• Admin user already exists, skipping");
  }

  // 2) Business settings (singleton)
  const existingSettings = await db
    .select()
    .from(schema.businessSettings)
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.businessSettings).values({
      id: "singleton",
      businessName: "THE ALICK STANDARD",
      tagline: "More Than a Cut. It's the Standard.",
      shopAddress: "Plot 12, Kabulonga Road, Lusaka, Zambia",
      shopPhone: "+260 977 000 000",
      whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "260977000000",
      defaultTravelFeeNgwee: 5000, // K50
      slotIntervalMinutes: 30,
      notificationsEnabled: true,
    });
    console.log("✓ Business settings created");
  }

  // 3) Weekly availability (Mon–Sat 09:00–19:00, Sun closed)
  const rules = await db.select().from(schema.availabilityRules);
  if (rules.length === 0) {
    const week = [
      { day: 0, active: false, start: 540, end: 1080 }, // Sun closed
      { day: 1, active: true, start: 540, end: 1080 }, // Mon
      { day: 2, active: true, start: 540, end: 1080 },
      { day: 3, active: true, start: 540, end: 1080 },
      { day: 4, active: true, start: 540, end: 1080 },
      { day: 5, active: true, start: 540, end: 1080 },
      { day: 6, active: true, start: 540, end: 1080 }, // Sat
    ];
    for (const r of week) {
      await db.insert(schema.availabilityRules).values({
        id: nanoid(12),
        dayOfWeek: r.day,
        startMinutes: r.start,
        endMinutes: r.end,
        active: r.active,
      });
    }
    console.log("✓ Weekly availability created (Mon–Sat 09:00–19:00)");
  }

  // 4) Services
  const existingServices = await db.select().from(schema.services);
  if (existingServices.length === 0) {
    const services = [
      {
        name: "Classic Haircut",
        description:
          "Precision scissor + clipper cut, tailored line-up, hot towel finish.",
        duration: 45,
        price: 12000, // K120
        type: "both" as const,
        order: 1,
      },
      {
        name: "Beard Sculpt",
        description:
          "Shape, line and condition. Hot towel, oil treatment, sharp edges.",
        duration: 30,
        price: 8000, // K80
        type: "both" as const,
        order: 2,
      },
      {
        name: "Hot Towel Shave",
        description:
          "Traditional straight-razor shave with steamed towels and balm.",
        duration: 45,
        price: 10000, // K100
        type: "both" as const,
        order: 3,
      },
      {
        name: "The Standard",
        description:
          "Haircut + beard sculpt + black mask. Our signature full reset.",
        duration: 75,
        price: 18000, // K180
        type: "both" as const,
        order: 4,
      },
      {
        name: "Line-Up & Edge",
        description:
          "Crisp hairline, beard line and neck cleanup between full cuts.",
        duration: 20,
        price: 6000, // K60
        type: "both" as const,
        order: 5,
      },
      {
        name: "Kids Cut",
        description: "Clean, patient cut for the young gentlemen (under 12).",
        duration: 30,
        price: 8000, // K80
        type: "shop" as const,
        order: 6,
      },
      {
        name: "Black Mask Treatment",
        description: "Deep-cleanse peel-off mask for face and neck.",
        duration: 20,
        price: 7000, // K70
        type: "both" as const,
        order: 7,
      },
    ];
    for (const s of services) {
      await db.insert(schema.services).values({
        id: nanoid(12),
        name: s.name,
        description: s.description,
        durationMinutes: s.duration,
        priceNgwee: s.price,
        type: s.type,
        active: true,
        displayOrder: s.order,
      });
    }
    console.log(`✓ ${services.length} services created`);
  }

  // 5) Sample customers + appointments (only if none exist)
  const existingAppts = await db.select().from(schema.appointments);
  if (existingAppts.length === 0) {
    const services = await db.select().from(schema.services);
    const sByName = (n: string) => services.find((s) => s.name === n)!;

    const customers = [
      {
        name: "Chilufya Mwamba",
        phone: "260977111222",
        address: "Avondale, Lusaka",
      },
      {
        name: "Mutinta Bwalya",
        phone: "260966222333",
        address: "Roma Park, Lusaka",
      },
      {
        name: "Bwalya Kasonde",
        phone: "260955333444",
        address: "Woodlands, Lusaka",
      },
      {
        name: "Thandiwe Phiri",
        phone: "260977444555",
        address: "Matero, Lusaka",
      },
      {
        name: "David Zulu",
        phone: "260966555666",
        address: "Chilenje South, Lusaka",
      },
      {
        name: "Natasha Banda",
        phone: "260977666777",
        address: "Meanwood, Lusaka",
      },
    ];

    const customerRows: { id: string; name: string; phone: string }[] = [];
    for (const c of customers) {
      const id = nanoid(12);
      customerRows.push({ id, name: c.name, phone: c.phone });
      await db.insert(schema.customers).values({
        id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        totalBookings: 1,
        completedBookings: 1,
        lifetimeSpend: 18000,
        lastVisit: subDays(new Date(), 3),
      });
    }

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);
    const threeDaysAgo = subDays(today, 3);

    type ApptSeed = {
      customer: { id: string; name: string; phone: string };
      serviceName: string;
      when: Date;
      type: "shop" | "home";
      address?: string;
      status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show";
      travelFee?: number;
      notes?: string;
    };

    const seeds: ApptSeed[] = [
      {
        customer: customerRows[0],
        serviceName: "Classic Haircut",
        when: setMinutes(setHours(today, 9), 0),
        type: "shop",
        status: "confirmed",
      },
      {
        customer: customerRows[1],
        serviceName: "Beard Sculpt",
        when: setMinutes(setHours(today, 10), 30),
        type: "shop",
        status: "confirmed",
      },
      {
        customer: customerRows[2],
        serviceName: "The Standard",
        when: setMinutes(setHours(today, 13), 0),
        type: "home",
        address: "Woodlands, Lusaka",
        travelFee: 5000,
        status: "pending",
      },
      {
        customer: customerRows[3],
        serviceName: "Hot Towel Shave",
        when: setMinutes(setHours(today, 15), 0),
        type: "shop",
        status: "confirmed",
      },
      {
        customer: customerRows[4],
        serviceName: "Line-Up & Edge",
        when: setMinutes(setHours(today, 16), 30),
        type: "shop",
        status: "pending",
      },
      {
        customer: customerRows[0],
        serviceName: "Classic Haircut",
        when: setMinutes(setHours(tomorrow, 10), 0),
        type: "shop",
        status: "confirmed",
      },
      {
        customer: customerRows[5],
        serviceName: "The Standard",
        when: setMinutes(setHours(tomorrow, 14), 0),
        type: "home",
        address: "Meanwood, Lusaka",
        travelFee: 7000,
        status: "confirmed",
      },
      {
        customer: customerRows[1],
        serviceName: "Kids Cut",
        when: setMinutes(setHours(dayAfter, 11), 0),
        type: "shop",
        status: "confirmed",
      },
      {
        customer: customerRows[2],
        serviceName: "Classic Haircut",
        when: setMinutes(setHours(threeDaysAgo, 11), 0),
        type: "shop",
        status: "completed",
      },
      {
        customer: customerRows[4],
        serviceName: "Hot Towel Shave",
        when: setMinutes(setHours(subDays(today, 5), 16), 0),
        type: "shop",
        status: "no_show",
      },
      {
        customer: customerRows[5],
        serviceName: "Black Mask Treatment",
        when: setMinutes(setHours(subDays(today, 7), 12), 0),
        type: "shop",
        status: "completed",
      },
    ];

    let i = 0;
    for (const s of seeds) {
      const svc = sByName(s.serviceName);
      const apptId = nanoid(12);
      const ref = `TAS-${(1000 + i).toString().padStart(4, "0").slice(-4)}`;
      i++;
      await db.insert(schema.appointments).values({
        id: apptId,
        bookingRef: ref,
        customerId: s.customer.id,
        serviceId: svc.id,
        type: s.type,
        scheduledAt: s.when,
        durationMinutes: svc.durationMinutes,
        status: s.status,
        address: s.address ?? null,
        servicePriceNgwee: svc.priceNgwee,
        travelFeeNgwee: s.travelFee ?? 0,
        totalNgwee: svc.priceNgwee + (s.travelFee ?? 0),
        source: i === 2 || i === 7 ? "whatsapp" : "online",
        customerNotes: s.notes ?? null,
      });
    }
    console.log(`✓ ${seeds.length} sample appointments created`);
  }

  // 6) Sample expenses
  const existingExpenses = await db.select().from(schema.expenses);
  if (existingExpenses.length === 0) {
    const now = Date.now();
    const day = 86_400_000;
    const items = [
      {
        amount: 18000,
        category: "supplies",
        description: "Pomade & beard oil restock",
        offsetDays: 1,
      },
      {
        amount: 12000,
        category: "supplies",
        description: "New clipper blades",
        offsetDays: 3,
      },
      {
        amount: 5000,
        category: "utilities",
        description: "Shop electricity top-up",
        offsetDays: 5,
      },
      {
        amount: 8000,
        category: "marketing",
        description: "Instagram ad boost",
        offsetDays: 7,
      },
      {
        amount: 6000,
        category: "transport",
        description: "Fuel for home-service runs",
        offsetDays: 4,
      },
    ];
    for (const e of items) {
      await db.insert(schema.expenses).values({
        id: nanoid(12),
        amountNgwee: e.amount,
        category: e.category,
        description: e.description,
        incurredAt: new Date(now - e.offsetDays * day),
      });
    }
    console.log(`✓ ${items.length} sample expenses created`);
  }

  console.log("\n🎉 Seed complete.\n");
  console.log("Admin login:");
  console.log(
    `  username: ${process.env.ADMIN_USERNAME ?? "alick"}`,
  );
  console.log(
    `  password: ${process.env.ADMIN_PASSWORD ?? "standard2026"}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });