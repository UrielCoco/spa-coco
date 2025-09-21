"use client";

import { ChatProvider } from "@/context/chat-context"; // asegúrate del path correcto
import ChatPanel from "@/components/chat/ChatPanel";
import ExportBar from "@/components/itinerary/ExportBar";
import RightLogsPane from "@/components/layout/RightLogsPane";
import ResizableSplit from "@/components/layout/ResizableSplit";

export default function Home() {
  return (
    <ChatProvider>
      <div className="h-screen w-screen flex flex-col">
        <header className="flex items-center justify-between p-3 gap-3 border-b">
          <ExportBar />
        </header>
        <ResizableSplit
          left={<ChatPanel />}
          right={<RightLogsPane />}
        />
      </div>
    </ChatProvider>
  );
}
