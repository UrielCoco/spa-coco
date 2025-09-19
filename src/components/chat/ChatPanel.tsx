// ejemplo mínimo dentro de tu ChatPanel
import { useSpaChat } from "@/hooks/useSpaChat";

export default function ChatPanel() {
  const { bubbles, thinking, error, send, reset } = useSpaChat();

  // ...render de burbujas...
  // al enviar:
  // await send(inputText);

  // si quieres ver un “pensando…”:
  // {thinking && <Bubble role="assistant" content="Pensando..." />}
}
