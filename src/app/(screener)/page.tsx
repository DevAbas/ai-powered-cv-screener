import { ChatScreen } from "@/components/ChatScreen";
import { loadPool, toPoolCandidate } from "@/lib/pool/pool";

// The pool comes from the index, read on the server (PLAN, Data access);
// only names and page counts reach the client.
export default function ChatPage() {
  return <ChatScreen pool={loadPool().entries.map(toPoolCandidate)} />;
}
