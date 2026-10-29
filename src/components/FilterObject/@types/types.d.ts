export type FilterObjectOptionValue = {
  qText: string | undefined;
  qNum: number | undefined;
  qElemNumber: number;
};

export type FilterObjectOption = {
  value: FilterObjectOptionValue;
  label: string | undefined;
  selected: boolean;
  excluded?: boolean;
};
