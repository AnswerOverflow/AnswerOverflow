"use client";

import { Fragment, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import Checkbox from "./Checkbox";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export default function CreateNote() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const cancelButtonRef = useRef(null);

  const createNote = useMutation(api.notes.createNote);
  const openaiKeySet = useQuery(api.openai.openaiKeySet) ?? true;

  const createUserNote = async () => {
    await createNote({
      title,
      content,
      isSummary: isChecked,
    });
    setOpen(false);
  };

  return (
    <>
      <div className="flex justify-center items-center">
        <button
          onClick={() => setOpen(true)}
          className="button text-[#EBECEF] flex gap-4 justify-center items-center text-center px-8 sm:px-16 py-2"
        >
          <Image
            src={"/images/Add.png"}
            width={40}
            height={40}
            alt="search"
            className="float-right sm:w-[40px] sm:h-[40px] w-6 h-6"
          />
          <span className="text-[17px] sm:text-3xl not-italic font-medium leading-[79%] tracking-[-0.75px]">
            {" "}
            New Note
          </span>
        </button>
      </div>

      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          initialFocus={cancelButtonRef}
          onClose={setOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <form className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-2 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-[10px] bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-[719px]">
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-8 sm:pb-4">
                    <>
                      <div className="mt-3  sm:mt-0 text-left">
                        <Dialog.Title
                          as="h3"
                          className="text-black text-center text-xl sm:text-left sm:text-[35px] pb-6 sm:pb-8 not-italic font-semibold leading-[90.3%] tracking-[-0.875px]"
                        >
                          Create New Note
                        </Dialog.Title>
                        <div className="mt-2 space-y-3">
                          <div className="pb-2">
                            <label
                              htmlFor="title"
                              className=" text-black text-[17px] sm:text-2xl not-italic font-medium leading-[90.3%] tracking-[-0.6px]"
                            >
                              Title
                            </label>
                            <div className="mt-2">
                              <input
                                id="title"
                                name="title"
                                type="text"
                                placeholder="Note Title"
                                autoComplete="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="border shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] rounded-lg border-solid border-[#D0D5DD] bg-white w-full py-2.5 px-[14px] text-black text-[17px] not-italic font-light leading-[90.3%] tracking-[-0.425px] sm:text-2xl"
                              />
                            </div>
                          </div>

                          <div className="">
                            <label
                              htmlFor="description"
                              className=" text-black text-[17px] sm:text-2xl not-italic font-medium leading-[90.3%] tracking-[-0.6px]"
                            >
                              The Note
                            </label>
                            <div className="mt-2 pb-[18px]">
                              <textarea
                                id="description"
                                name="description"
                                rows={8}
                                placeholder="Start your note "
                                className="block w-full rounded-md border-0 py-1.5  border-[#D0D5DD] text-2xl shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600  sm:leading-6 text-black text-[17px] not-italic font-light leading-[90.3%] tracking-[-0.425px] sm:text-2xl"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                              />
                            </div>
                            <p className="text-black text-[17px] sm:text-2xl not-italic font-medium leading-[90.3%] tracking-[-0.6px]">
                              AI Features
                            </p>
                          </div>

                          <Checkbox
                            openaiKeySet={openaiKeySet}
                            isChecked={isChecked}
                            checkHandler={() => setIsChecked(!isChecked)}
                          />
                        </div>
                      </div>
                    </>
                  </div>
                  <div className=" px-4 py-3 mb-5 flex justify-center items-center">
                    <button
                      type="button"
                      className="button text-white text-center text-[17px] sm:text-2xl not-italic font-semibold leading-[90.3%] tracking-[-0.6px] px-[70px] py-2"
                      onClick={createUserNote}
                    >
                      Create
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </form>
        </Dialog>
      </Transition.Root>
    </>
  );
}
