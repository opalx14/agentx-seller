import { checkoutStorefront } from "@/features/storefront/checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      customerName?: string;
      phone?: string;
      items?: Array<{ productId?: string; quantity?: number }>;
    };
    const result = await checkoutStorefront({
      customerName: body.customerName ?? "",
      phone: body.phone ?? "",
      items: (body.items ?? []).map((item) => ({
        productId: item.productId ?? "",
        quantity: item.quantity ?? 0,
      })),
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const clientErrors = new Set([
      "INVALID_CUSTOMER_NAME",
      "INVALID_CART",
      "DUPLICATE_CART_ITEM",
      "INVALID_QUANTITY",
      "PRODUCT_NOT_FOUND",
      "CUSTOMER_NAME_REQUIRED",
      "INVALID_PHONE",
      "INVALID_TOTAL_AMOUNT",
    ]);
    return Response.json(
      { ok: false, error: message },
      { status: clientErrors.has(message) ? 400 : 500 },
    );
  }
}
