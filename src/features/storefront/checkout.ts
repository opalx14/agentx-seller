import { addAudit } from "@/lib/mock-store";
import { createRuntimeDemoPurchase } from "@/lib/repository";
import { getStorefrontProduct } from "@/features/storefront/catalog";

export type StorefrontCartItem = {
  productId: string;
  quantity: number;
};

export type StorefrontCheckoutResult = {
  customerId: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  shipment: {
    carrier: string;
    trackingNumber: string;
    status: string;
    estimatedDelivery?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export async function checkoutStorefront(input: {
  customerName: string;
  phone: string;
  items: StorefrontCartItem[];
}): Promise<StorefrontCheckoutResult> {
  const customerName = input.customerName.trim();
  if (!customerName || customerName.length > 80) throw new Error("INVALID_CUSTOMER_NAME");
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 6) {
    throw new Error("INVALID_CART");
  }

  const uniqueProductIds = new Set<string>();
  const lines = input.items.map((item) => {
    if (uniqueProductIds.has(item.productId)) throw new Error("DUPLICATE_CART_ITEM");
    uniqueProductIds.add(item.productId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 5) {
      throw new Error("INVALID_QUANTITY");
    }
    const product = getStorefrontProduct(item.productId);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    return {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal: product.price * item.quantity,
    };
  });

  const totalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const purchase = await createRuntimeDemoPurchase({
    customerName,
    phone: input.phone,
    totalAmount,
  });

  addAudit(
    "demo_order_created",
    `${purchase.order.id} created from Storefront for ${purchase.customer.id} (${totalAmount} VND).`,
    "success",
    "storefrontCheckout",
  );

  return {
    customerId: purchase.customer.id,
    customerName: purchase.customer.name,
    orderId: purchase.order.id,
    totalAmount,
    shipment: {
      carrier: purchase.shipment.carrier,
      trackingNumber: purchase.shipment.trackingNumber,
      status: purchase.shipment.status,
      estimatedDelivery: purchase.shipment.estimatedDelivery,
    },
    items: lines,
  };
}
