import type { FilterObjectOption } from "@/components/FilterObject/@types/types";

export const toOption = ([cell]: EngineAPI.INxCellRows): FilterObjectOption => ({
  value: {
    qElemNumber: cell.qElemNumber,
    qText: cell.qText,
    qNum: cell.qNum,
  },
  label: cell.qText,
  selected: cell.qState === "S",
  excluded: cell.qState === "X" || cell.qState === "XS",
});
