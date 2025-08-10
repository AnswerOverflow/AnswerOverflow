import Link from "next/link";
import DeleteNote from "./DeleteNote";

export interface NoteProps {
  note: {
    title: string;
    _id: string;
    _creationTime: number;
  };
  deleteNote: any;
}

const NoteItem = ({ note, deleteNote }: NoteProps) => {
  return (
    <div className="flex justify-between items-center h-[74px] bg-[#F9FAFB] py-5 px-5 sm:px-11 gap-x-5 sm:gap-x-10">
      <Link href={`/notes/${note._id}`} className="flex-1">
        <h1 className=" text-[#2D2D2D] text-[17px] sm:text-2xl not-italic font-normal leading-[114.3%] tracking-[-0.6px]">
          {note.title}
        </h1>
      </Link>
      <p className="hidden md:flex text-[#2D2D2D] text-center text-xl not-italic font-extralight leading-[114.3%] tracking-[-0.5px]">
        {new Date(Number(note._creationTime)).toLocaleDateString()}
      </p>
      <DeleteNote deleteAction={() => deleteNote({ noteId: note._id })} />
    </div>
  );
};

export default NoteItem;
