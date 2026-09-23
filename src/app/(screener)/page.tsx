import { ChatScreen } from "@/components/ChatScreen";
import { MOCK_POOL } from "@/mocks/pool";
import { SUGGESTED_QUESTIONS } from "@/mocks/suggestions";

// UI phase: the pool and suggestions come from the mocks. The API phase reads
// the pool from the index here, on the server, with no component change.
export default function ChatPage() {
  return <ChatScreen pool={MOCK_POOL} suggestions={SUGGESTED_QUESTIONS} />;
}
