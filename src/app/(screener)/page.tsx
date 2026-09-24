import { ChatScreen } from "@/components/ChatScreen";
import { SUGGESTED_QUESTIONS } from "@/lib/chat/suggestions";
import { loadIndex, toPoolCandidate } from "@/lib/pool/index-file";

// The pool comes from the index, read on the server (PLAN, Data access);
// only names and page counts reach the client.
export default function ChatPage() {
  return <ChatScreen pool={loadIndex().map(toPoolCandidate)} suggestions={SUGGESTED_QUESTIONS} />;
}
