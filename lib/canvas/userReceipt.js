import { createCanvas, loadImage } from "canvas";

export async function createUserReceipt(user) {
  const canvas = createCanvas(420, 650);
  const ctx = canvas.getContext("2d");

  const W = canvas.width;

  // background
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, canvas.height);

  // receipt card
  ctx.fillStyle = "#111827";
  ctx.fillRect(20, 20, W - 40, canvas.height - 40);

  // header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("USER RECEIPT", W / 2, 60);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Arial";
  ctx.fillText(new Date().toLocaleString(), W / 2, 80);

  // avatar
  const ax = W / 2;
  const ay = 140;

  if (user.avatar) {
    try {
      const avatarImg = await loadImage(user.avatar);

      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay, 45, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, ax - 45, ay - 45, 90, 90);
      ctx.restore();

      // border
      ctx.beginPath();
      ctx.arc(ax, ay, 45, 0, Math.PI * 2);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();
    } catch {
      ctx.beginPath();
      ctx.arc(ax, ay, 45, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText((user.name || "U")[0].toUpperCase(), ax, ay + 12);
    }
  } else {
    ctx.beginPath();
    ctx.arc(ax, ay, 45, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText((user.name || "U")[0].toUpperCase(), ax, ay + 12);
  }

  // divider
  ctx.strokeStyle = "#1f2937";
  ctx.beginPath();
  ctx.moveTo(50, 220);
  ctx.lineTo(W - 50, 220);
  ctx.stroke();

  // text style (receipt feel)
  ctx.textAlign = "left";
  ctx.font = "13px monospace";
  ctx.fillStyle = "#e5e7eb";

  let y = 260;

  const lines = [
    ["NAME", user.name],
    ["PHONE", user.phoneNumber || "-"],
    ["USER ID", user.id || "-"],
    ["LID", user.lid || "-"],
    ["STATUS", user.status || "ACTIVE"],
    ["MESSAGE COUNT", String(user.messageCount || 0)],
  ];

  lines.forEach(([label, value]) => {
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(label, 60, y);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    const displayValue = value.length > 25 ? value.substring(0, 25) + "..." : value;
    ctx.fillText(displayValue, W - 60, y);

    ctx.textAlign = "left";
    y += 40;
  });

  // dashed line
  ctx.strokeStyle = "#374151";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(50, y + 10);
  ctx.lineTo(W - 50, y + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // footer section
  y += 50;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";

  ctx.fillText("TRANSACTION TYPE: USER REGISTRATION", W / 2, y);
  ctx.fillText("STATUS: VERIFIED", W / 2, y + 25);

  // signature line
  ctx.strokeStyle = "#1f2937";
  ctx.beginPath();
  ctx.moveTo(120, y + 80);
  ctx.lineTo(300, y + 80);
  ctx.stroke();

  ctx.fillStyle = "#6b7280";
  ctx.font = "10px Arial";
  ctx.fillText("SYSTEM SIGNATURE", W / 2, y + 100);

  return canvas.toBuffer("image/png");
}
