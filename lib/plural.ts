/** "1 μαθητής", "3 μαθητές". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
