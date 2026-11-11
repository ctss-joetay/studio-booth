import QRCode from "qrcode";

/** The QR code guests scan, as an SVG the booth screen can show at any size. */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
}
