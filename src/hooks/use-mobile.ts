import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// matchMedia เป็น external store อยู่แล้ว จึง subscribe ตรงๆ แทนการ setState ใน effect
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // ฝั่ง server ยังไม่รู้ขนาดจอ ให้ถือว่าไม่ใช่มือถือไว้ก่อน
  )
}
