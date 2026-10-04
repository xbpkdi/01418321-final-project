/**
 * บัญชีทดสอบระหว่างยังไม่ต่อฐานข้อมูลจริง
 * รูปร่างตรงกับผลลัพธ์ของ Q1.1 ใน use case description:
 *   SELECT user_id, user_password, fail_attempts FROM users WHERE user_email=$1
 * ของจริงต้องเทียบ hash ฝั่ง server ไม่ใช่เก็บรหัสผ่านเป็น plain text แบบนี้
 */
export type MockUser = {
  user_id: string;
  user_email: string;
  user_password: string;
  fail_attempts: number;
};

export const MOCK_USERS: MockUser[] = [
  {
    user_id: "U001",
    user_email: "admin@colorado.co.jp",
    user_password: "demo1234",
    fail_attempts: 0,
  },
  {
    user_id: "U002",
    user_email: "locked@colorado.co.jp",
    user_password: "demo1234",
    fail_attempts: 5, // ใช้ทดสอบเคส fail_attempts >= 5
  },
];
