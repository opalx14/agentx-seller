export type SupportLocale = "vi" | "en" | "hi";

function shipmentStatus(status: string, language: Exclude<SupportLocale, "en">) {
  const normalized = status.trim().toLowerCase().replaceAll(" ", "_");
  const vi: Record<string, string> = {
    label_created: "đã tạo vận đơn",
    in_transit: "đang vận chuyển",
    delivered: "đã giao",
    shipped: "đang vận chuyển",
  };
  const hi: Record<string, string> = {
    label_created: "शिपमेंट लेबल बन चुका है",
    in_transit: "रास्ते में",
    delivered: "डिलीवर हो चुका है",
    shipped: "रास्ते में",
  };
  return language === "vi" ? (vi[normalized] ?? status.replaceAll("_", " ")) : (hi[normalized] ?? status.replaceAll("_", " "));
}

export function localizeAgentReply(reply: string, language: SupportLocale) {
  if (language === "en") return reply;

  const shipment = reply.match(/^Order (A\d+) is (.+) with (.+)\. Estimated delivery: (.+)\.$/);
  if (shipment) {
    const [, orderId, status, carrier, eta] = shipment;
    return language === "vi"
      ? `🚚 Đơn ${orderId} ${shipmentStatus(status, "vi")} qua ${carrier}.\nDự kiến giao: ${eta}.`
      : `🚚 ${orderId} ${carrier} के साथ ${shipmentStatus(status, "hi")} है।\nअनुमानित डिलीवरी: ${eta}.`;
  }

  const delivered = reply.match(/^Order (A\d+) was delivered via (.+)\.$/);
  if (delivered) {
    const [, orderId, carrier] = delivered;
    return language === "vi"
      ? `✅ ${orderId} đã được giao qua ${carrier}.`
      : `✅ ${orderId} ${carrier} के माध्यम से डिलीवर हो चुका है।`;
  }

  const approval = reply.match(/^Your refund request for ([\d.,]+)₫ exceeds the automatic limit\. I created approval ([A-Za-z0-9_-]+) and escalated it to a human agent\.$/);
  if (approval) {
    const [, amount, approvalId] = approval;
    return language === "vi"
      ? `🛡️ Yêu cầu hoàn ${amount}₫ cần nhân viên xem xét. Mã phê duyệt: ${approvalId}. Chưa có khoản hoàn tiền nào được thực hiện.`
      : `🛡️ ${amount}₫ का रिफंड मानव समीक्षा के लिए भेजा गया है। Approval: ${approvalId}. अभी रिफंड पूरा नहीं हुआ है।`;
  }

  const returnCreated = reply.match(/^Return ([A-Za-z0-9_-]+) has been created for (A\d+)\. Reason: ([A-Za-z0-9_-]+)\.$/);
  if (returnCreated) {
    const [, returnId, orderId] = returnCreated;
    return language === "vi"
      ? `✅ Đã tạo yêu cầu trả hàng ${returnId} cho ${orderId}. Theo dõi trạng thái trong cuộc trò chuyện này.`
      : `✅ ${orderId} के लिए रिटर्न अनुरोध ${returnId} बनाया गया है।`;
  }

  const returnDenied = reply.match(/^I can’t create that return automatically because: ([A-Z_]+)\. I can escalate this to a human agent\.$/);
  if (returnDenied) {
    const reason = returnDenied[1];
    const viReasons: Record<string, string> = {
      ORDER_NOT_DELIVERED: "Đơn hàng chưa được giao nên chưa thể bắt đầu trả hàng.",
      DUPLICATE_RETURN: "Đơn hàng đã có yêu cầu trả hàng trước đó.",
      RETURN_WINDOW_EXPIRED: "Đơn hàng đã quá thời hạn trả hàng của người bán.",
      ORDER_NOT_FOUND: "Không tìm thấy đơn hàng đã xác minh.",
    };
    const hiReasons: Record<string, string> = {
      ORDER_NOT_DELIVERED: "ऑर्डर अभी डिलीवर नहीं हुआ है, इसलिए रिटर्न शुरू नहीं किया जा सकता।",
      DUPLICATE_RETURN: "इस ऑर्डर के लिए पहले से रिटर्न अनुरोध मौजूद है।",
      RETURN_WINDOW_EXPIRED: "इस ऑर्डर की रिटर्न अवधि समाप्त हो चुकी है।",
      ORDER_NOT_FOUND: "सत्यापित ऑर्डर नहीं मिला।",
    };
    return `❌ ${language === "vi" ? (viReasons[reason] ?? "Yêu cầu trả hàng chưa thể xử lý tự động.") : (hiReasons[reason] ?? "रिटर्न अनुरोध स्वचालित रूप से पूरा नहीं हो सका।")}`;
  }

  const refundProcessed = reply.match(/^Refund ([\d.,]+)₫ for (A\d+) has been processed successfully\.$/);
  if (refundProcessed) {
    const [, amount, orderId] = refundProcessed;
    return language === "vi"
      ? `✅ Đã xử lý hoàn ${amount}₫ cho đơn ${orderId}.`
      : `✅ ${orderId} के लिए ${amount}₫ का रिफंड पूरा हो गया है।`;
  }

  const refundDenied = reply.match(/^The refund was not executed: ([A-Z_]+)\.$/);
  if (refundDenied) {
    const reason = refundDenied[1];
    const viReasons: Record<string, string> = {
      REFUND_EXCEEDS_ORDER_TOTAL: "Số tiền yêu cầu hoàn vượt quá tổng giá trị đơn hàng.",
      DUPLICATE_REFUND: "Đơn hàng đã được hoàn tiền trước đó.",
      INVALID_AMOUNT: "Số tiền hoàn không hợp lệ.",
      ORDER_NOT_FOUND: "Không tìm thấy đơn hàng đã xác minh.",
      CUSTOMER_OWNERSHIP_MISMATCH: "Không thể xác minh đơn hàng này thuộc tài khoản của bạn.",
    };
    const hiReasons: Record<string, string> = {
      REFUND_EXCEEDS_ORDER_TOTAL: "रिफंड राशि ऑर्डर की सत्यापित कुल राशि से अधिक है।",
      DUPLICATE_REFUND: "इस ऑर्डर का रिफंड पहले ही प्रोसेस हो चुका है।",
      INVALID_AMOUNT: "रिफंड राशि मान्य नहीं है।",
      ORDER_NOT_FOUND: "सत्यापित ऑर्डर नहीं मिला।",
      CUSTOMER_OWNERSHIP_MISMATCH: "यह ऑर्डर आपके अकाउंट का सत्यापित नहीं है।",
    };
    return `❌ ${language === "vi" ? (viReasons[reason] ?? "Yêu cầu hoàn tiền chưa thể xử lý.") : (hiReasons[reason] ?? "रिफंड अनुरोध पूरा नहीं हो सका।")}`;
  }

  if (/I can’t verify that this order belongs to you/.test(reply)) {
    return language === "vi"
      ? "🔒 Tôi không thể xác minh đơn hàng này thuộc tài khoản của bạn nên không thể hiển thị hoặc xử lý dữ liệu của đơn."
      : "🔒 यह ऑर्डर आपके लिंक किए गए अकाउंट का सत्यापित नहीं है, इसलिए मैं इसकी जानकारी नहीं दिखा सकता।";
  }

  if (/Please provide your order number/.test(reply)) {
    return language === "vi" ? "📦 Hãy gửi mã đơn hàng để tôi kiểm tra an toàn." : "📦 कृपया अपना ऑर्डर नंबर भेजें।";
  }

  if (/escalated this conversation to a human support agent/.test(reply)) {
    return language === "vi"
      ? "👤 Tôi đã chuyển cuộc trò chuyện cho nhân viên hỗ trợ. Họ sẽ nhận được ngữ cảnh hiện tại để tiếp tục xử lý."
      : "👤 बातचीत मानव सहायता एजेंट को भेज दी गई है और उन्हें वर्तमान संदर्भ मिलेगा।";
  }

  if (/Your message has been sent to the support agent handling this conversation/.test(reply)) {
    return language === "vi"
      ? "👤 Tin nhắn đã được gửi cho nhân viên đang xử lý cuộc trò chuyện này."
      : "👤 आपका संदेश इस बातचीत को संभाल रहे सहायता एजेंट को भेज दिया गया है।";
  }

  return reply;
}
