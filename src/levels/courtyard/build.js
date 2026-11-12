// Builds the courtyard level's geometry. Call order is fixed (yard1 -> yard2 -> detail): the seeded RNG in world/props.js depends on it.
import { buildYard1 } from './yard1.js';
import { buildYard2 } from './yard2.js';
import { buildDetail } from './detail.js';

export function build() {
  buildYard1(); buildYard2(); buildDetail();
}
