import { NextResponse } from "next/server";
import { getBillingStatus, recordCheckoutSession } from "@/lib/billing";
import { getDodoClient, getDodoProProductId } from "@/lib/dodo";
import { getSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const INR_SUBSCRIPTION_MANDATE_FLOOR_PAISE = 200_000;

function siteOrigin(req: Request) {
  const requestOrigin = new URL(req.url).origin;
  if (requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1")) {
    return requestOrigin;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin || "https://letxcook.com").replace(/\/$/, "");
}

function wantsHtml(req: Request) {
  return req.headers.get("accept")?.includes("text/html") ?? false;
}

export async function POST(req: Request) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const origin = siteOrigin(req);
  if (!user) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", "/dashboard/billing");
    return wantsHtml(req)
      ? NextResponse.redirect(loginUrl, { status: 303 })
      : NextResponse.json({ error: "Sign in before upgrading." }, { status: 401 });
  }

  const billing = await getBillingStatus(user.id);
  if (billing.isPro) {
    const billingUrl = new URL("/dashboard/billing", origin);
    billingUrl.searchParams.set("already", "pro");
    return wantsHtml(req)
      ? NextResponse.redirect(billingUrl, { status: 303 })
      : NextResponse.json({ error: "You're already on Pro." }, { status: 409 });
  }

  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: "Your account needs an email before checkout." }, { status: 400 });
  }

  const productId = getDodoProProductId();
  const customer = billing.subscription?.dodo_customer_id
    ? { customer_id: billing.subscription.dodo_customer_id }
    : {
        email,
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : email.split("@")[0],
      };

  const checkout = await getDodoClient().checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer,
    metadata: {
      app: "letxcook",
      plan: "pro",
      user_id: user.id,
      user_email: email,
    },
    return_url: `${origin}/dashboard/billing?checkout=success`,
    cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
    force_3ds: true,
    mandate_min_amount_inr_paise: INR_SUBSCRIPTION_MANDATE_FLOOR_PAISE,
    customization: {
      theme: "dark",
      theme_config: {
        pay_button_text: "Start letxcook Pro",
        radius: "8px",
      },
    },
    feature_flags: {
      allow_customer_editing_email: false,
      allow_customer_editing_name: true,
      allow_discount_code: true,
      allow_phone_number_collection: false,
    },
  });

  if (!checkout.checkout_url) {
    return NextResponse.json({ error: "Dodo did not return a checkout URL." }, { status: 502 });
  }

  await recordCheckoutSession({
    sessionId: checkout.session_id,
    userId: user.id,
    productId,
  });

  return wantsHtml(req)
    ? NextResponse.redirect(checkout.checkout_url, { status: 303 })
    : NextResponse.json({ checkoutUrl: checkout.checkout_url, sessionId: checkout.session_id });
}
