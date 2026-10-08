// แถบเทปกาวพาดเฉียงที่มีชื่อช่องทางขายวิ่งวน ใช้ชื่อจากข้อมูลการเชื่อมต่อ ไม่ได้แต่งข้อความเพิ่ม
// ชุดข้อความซ้ำ 2 รอบเพื่อให้วนต่อกันได้เนียน รอบที่ 2 ซ่อนจาก screen reader

export function TapeTicker({
  items,
  alt = false,
}: {
  items: { label: string; ok: boolean }[];
  /** เทปสีอำพัน วิ่งสวนทาง */
  alt?: boolean;
}) {
  const row = (hidden: boolean) => (
    <div className="tape-row" aria-hidden={hidden || undefined}>
      {[...items, ...items].map((item, i) => (
        <span key={i} className="inline-flex items-center gap-3">
          <span
            className={`size-2 rounded-full ${item.ok ? (alt ? "bg-cobalt" : "bg-amber") : "bg-current opacity-40"}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className={alt ? "tape tape-alt" : "tape"}>
      <div className="tape-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
