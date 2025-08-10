const Checkbox = ({
  isChecked,
  checkHandler,
  openaiKeySet,
}: {
  isChecked: boolean;
  checkHandler: () => void;
  openaiKeySet: boolean;
}) => {
  return (
    <div className="relative flex  gap-x-3">
      <div className="flex items-start mt-[5px]">
        <input
          id="candidates"
          name="candidates"
          type="checkbox"
          checked={isChecked}
          onChange={checkHandler}
          className="accent-white checked:accent-white w-5 h-5 focus:ring-0 focus:outline-0  border-[#0D87E1] rounded-[6px] bg-[#F9F5FF]"
          disabled={!openaiKeySet}
        />
      </div>
      <div className="">
        <label
          htmlFor="candidates"
          className=" text-black text-[17px] sm:text-2xl pb-2 not-italic font-light leading-[90.3%] tracking-[-0.6px]"
        >
          Advanced Summarization {openaiKeySet ? "" : " (Disabled)"}
        </label>
        {openaiKeySet ? (
          <p className=" text-black text-sm sm:text-[17px] not-italic font-extralight leading-[90.3%] tracking-[-0.425px]">
            Check this box if you want to generate summaries using AI
          </p>
        ) : (
          <p>
            <a
              className="text-blue-500"
              target="_blank"
              href="https://dashboard.convex.dev/deployment/settings/environment-variables?var=OPENAI_API_KEY"
            >
              Set an OPENAI_API_KEY in your environment variables here.
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default Checkbox;
