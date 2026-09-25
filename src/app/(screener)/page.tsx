import { ChatScreen } from "@/components/ChatScreen";
import { loadPool, toPoolCandidate } from "@/lib/candidates/candidatePool";

// The pool comes from the index, read on the server;
// only names and page counts reach the client.
export default function ChatPage() {
  return <ChatScreen pool={loadPool().entries.map(toPoolCandidate)} />;
}
