"use client";

import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import ComplexToggle from "../home/ComplexToggle";
import { useState } from "react";

interface NoteDetailsProps {
  noteId: Id<"notes">;
}

const NoteDetails = ({ noteId }: NoteDetailsProps) => {
  const [isSummary, setIsSummary] = useState(false);
  const currentNote = useQuery(api.notes.getNote, { id: noteId });

  return (
    <div className="container space-y-6 sm:space-y-9 py-20 px-[26px] sm:px-0">
      <div className="flex justify-center items-center">
        <ComplexToggle isSummary={isSummary} setIsSummary={setIsSummary} />
      </div>
      <h3 className="text-black text-center pb-5 text-xl sm:text-[32px] not-italic font-semibold leading-[90.3%] tracking-[-0.8px]">
        {currentNote?.title}
      </h3>
      <p className="text-black text-xl sm:text-[28px] not-italic font-normal leading-[130.3%] tracking-[-0.7px]">
        {!isSummary
          ? currentNote?.content
          : currentNote?.summary
            ? currentNote?.summary
            : "No Summary available"}
      </p>
    </div>
  );
};

export default NoteDetails;
