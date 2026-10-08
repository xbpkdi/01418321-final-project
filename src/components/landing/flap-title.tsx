// หัวข้อตัวใหญ่ที่ตัวอักษรเป็นคำจริงตลอด ไม่สุ่มตัวอื่นมาแทน (สุ่มแล้วลายตา)
// - ตอนโหลด: ตัวอักษรพลิกขึ้นมาทีละตัวจากซ้ายไปขวา ครั้งเดียว
// - ชี้ตัวอักษรตัวไหน ตัวนั้นเอียงและเป็นสี cobalt
// ภาพทั้งหมดอยู่ใน .flap-char ที่ globals.css ผู้ใช้ที่ตั้ง prefers-reduced-motion เห็นข้อความนิ่ง

export function FlapTitle({
  text,
  className,
  suffix,
}: {
  text: string;
  className?: string;
  /** ของตกแต่งต่อท้ายคำสุดท้าย ไม่ถูกตัดขึ้นบรรทัดใหม่แยกจากคำ */
  suffix?: React.ReactNode;
}) {
  let index = 0;

  return (
    <h1 aria-label={text} className={className}>
      {text.split(" ").map((word, w, words) => (
        <span key={w} aria-hidden className="inline-block whitespace-nowrap">
          {[...word].map((ch, i) => (
            <span
              key={i}
              className="flap-char"
              style={{ "--i": index++ } as React.CSSProperties}
            >
              {ch}
            </span>
          ))}
          {w < words.length - 1 ? " " : suffix}
        </span>
      ))}
    </h1>
  );
}
