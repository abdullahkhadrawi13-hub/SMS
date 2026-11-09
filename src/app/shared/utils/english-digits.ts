// Turns Arabic digits into English ones, so a number typed on an Arabic
// keyboard (٠٧٩١٢٣٤٥٦٧) becomes 0791234567. Everything else stays as is.
//
// Both Arabic digit sets are covered:
//   ٠١٢٣٤٥٦٧٨٩  (U+0660–U+0669, the Arabic keyboard)
//   ۰۱۲۳۴۵۶۷۸۹  (U+06F0–U+06F9, the Persian / Urdu keyboard)
//
// Used by the student form's phone number (9 Nov 2026).
export function toEnglishDigits(text: string): string {

  return text.replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);

    // ٠ (U+0660) and ۰ (U+06F0) are both 0, so the digit is the distance from them.
    const zero = code <= 0x0669 ? 0x0660 : 0x06F0;

    return String(code - zero);
  });
}
