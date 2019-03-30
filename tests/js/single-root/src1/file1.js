import 'noAssignment'
import defaultModule1 from 'module1'
import { module2_1, module2_2 as module2_2_renamed, type module2_t_1, module2_3 } from 'module2'
import defaultModule3, { module3_1, module3_2 as module3_2_renamed, module3_3, type module3_typeInside } from 'module3'
import type { module3_typeOutside } from 'module3'
import defaultModule4, { module4_1,
  module4_2 as module4_2_renamed,
  module4_3 } from 'module4'
import 'noAssignment2'
import { src3_file1_1 } from "src3/file1"
import defaultModule5, {
  module5_1,
  type module5_t_1,
  module5_2 as module4_2_renamed,
  module5_3,
} from 'module5' // comment after import
import * as FullModule from 'module6'
import type { module7_typeOutside_1, module7_typeOutside_2 } from 'module7'
import * as AllFile2Exports from './file2'
import * as AllFile7Exports from './file7'

export const src1_file1_1 = 'foo'
export const src1_file1_2 = "bar";

const src1_file1_3 = 7
export src1_file1_3

export function src1_file1_4() {

}

export class src1_file1_5 extends Component {

}

export type src1_file1_t_1<V> = {
  foo: V,
  bar: number,
}

export type src1_file1_t_2 = src1_file1_t_1<*> & { baz: 9 }

export default function() {

}
