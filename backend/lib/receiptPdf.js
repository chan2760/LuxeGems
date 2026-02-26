function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toCurrency(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

export function buildReceiptPdf(order) {
  const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date();
  const items = Array.isArray(order?.items) ? order.items : [];

  const lines = [
    "LuxeGems Receipt",
    `Order ID: ${String(order?._id || "")}`,
    `Date: ${createdAt.toLocaleString("en-US")}`,
    `Customer: ${String(order?.name || order?.username || "")}`,
    `Email: ${String(order?.email || "")}`,
    `Address: ${String(order?.address || "")}`,
    `Payment: ${String(order?.paymentMethod || "")} (${String(order?.paymentStatus || "")})`,
    "----------------------------------------"
  ];

  for (const item of items) {
    const qty = Number(item?.quantity || 1);
    const price = Number(item?.price || 0);
    lines.push(`${String(item?.name || "Item")} x${qty} - $${toCurrency(price * qty)}`);
  }

  lines.push("----------------------------------------");
  lines.push(`Total: $${toCurrency(order?.total)}`);
  lines.push("Thank you for shopping with LuxeGems.");

  const textCommands = ["BT", "/F1 12 Tf"];
  lines.forEach((line, index) => {
    const y = 780 - index * 20;
    textCommands.push(`1 0 0 1 48 ${Math.max(y, 40)} Tm (${escapePdfText(line)}) Tj`);
  });
  textCommands.push("ET");

  const contentStream = textCommands.join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const objectContent of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += objectContent;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
