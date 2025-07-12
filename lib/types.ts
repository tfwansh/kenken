export type Op = '+' | '-' | '*' | '/' | '=';
export interface Cage {
  cells: Array<[number, number]>; // 0-based [row, col]
  target: number;
  op: Op;
}
export interface Puzzle {
  size: number; // n × n
  cages: Cage[];
} 