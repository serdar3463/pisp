import { useCallback, useRef, useState } from "react";

type Tone = "success" | "danger" | "warning" | "neutral";

export function useToast(durationMs = 2800) {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("neutral");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, t: Tone = "neutral") => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setTone(t);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), durationMs);
  }, [durationMs]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }, []);

  return { message, tone, visible, show, hide };
}
