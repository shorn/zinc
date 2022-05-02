// this must be built in to TS by now, surely?
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

