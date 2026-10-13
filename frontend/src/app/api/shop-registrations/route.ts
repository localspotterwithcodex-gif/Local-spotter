import { NextRequest, NextResponse } from "next/server";
import { getMongoDb, SHOP_REGISTRATIONS_COLLECTION } from "@/lib/mongodb";
import { shopRegistrationSchema } from "@/lib/shop-registration-schema";

// The MongoDB Node.js driver needs the Node.js runtime, not the Edge
// runtime — this is the App Router default, but spelled out explicitly
// since it matters for correctness here.
export const runtime = "nodejs";

// Public: this is what the floating "Join as a shop" widget posts to from
// every page of the site. No auth — the visitor filling it in is usually
// not a registered user yet.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = shopRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { success: false, error: "Please check the highlighted fields", fieldErrors },
      { status: 400 }
    );
  }

  try {
    const db = await getMongoDb();
    const result = await db.collection(SHOP_REGISTRATIONS_COLLECTION).insertOne({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      source: "website_widget",
      status: "NEW",
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (err) {
    console.error("Failed to store shop registration", err);
    return NextResponse.json(
      { success: false, error: "We couldn't save your registration. Please try again." },
      { status: 500 }
    );
  }
}

// Admin-only: lets you peek at incoming leads without wiring up a full
// admin UI page yet. Protected with a simple shared-secret header rather
// than the site's user/JWT auth, since this route is intentionally
// independent of the NestJS backend. Set SHOP_REGISTRATIONS_ADMIN_KEY in
// your Vercel project's environment variables, then call this with:
//   curl -H "x-admin-key: <the key>" https://yoursite.com/api/shop-registrations
export async function GET(request: NextRequest) {
  const expectedKey = process.env.SHOP_REGISTRATIONS_ADMIN_KEY;
  const providedKey = request.headers.get("x-admin-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getMongoDb();
    const docs = await db
      .collection(SHOP_REGISTRATIONS_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      success: true,
      registrations: docs.map((doc) => ({
        ...doc,
        _id: String(doc._id),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ""),
      })),
    });
  } catch (err) {
    console.error("Failed to read shop registrations", err);
    return NextResponse.json({ success: false, error: "Could not load registrations." }, { status: 500 });
  }
}
