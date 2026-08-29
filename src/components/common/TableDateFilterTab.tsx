export type DateFilterOption = "optionThisMonth" | "optionLastMonth" | "optionThisYear";

interface TableDateFilterTabProps {
  selected: DateFilterOption | null;
  onSelect: (option: DateFilterOption) => void;
}

const TableDateFilterTab: React.FC<TableDateFilterTabProps> = ({ selected, onSelect }) => {
  const getButtonClass = (option: DateFilterOption) =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => onSelect("optionThisMonth")}
        className={`px-3 py-2 font-medium w-max rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionThisMonth")}`}
      >
        This Month
      </button>

      <button
        onClick={() => onSelect("optionLastMonth")}
        className={`px-3 py-2 font-medium w-max rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionLastMonth")}`}
      >
        Last Month
      </button>

      <button
        onClick={() => onSelect("optionThisYear")}
        className={`px-3 py-2 font-medium w-max rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionThisYear")}`}
      >
        This Year
      </button>
    </div>
  );
};

export default TableDateFilterTab;
