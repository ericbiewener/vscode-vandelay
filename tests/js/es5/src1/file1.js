const defaultModule1 = require('module1')
const { module2_1, module2_2 as module2_2_renamed, type module2_t_1, module2_3 } = require('module2')
const defaultModule3, { module3_1, module3_2 as module3_2_renamed, module3_3 } = require('module3')
const defaultModule4, { module4_1,
  module4_2 as module4_2_renamed,
  module4_3 } = require('module4')
const defaultModule5, {
  module5_1,
  type module5_t_1,
  module5_2 as module5_2_renamed,
  module5_3,
} = require('module5')

module.exports = {
  src1_file1_1,
  src1_file1_2,
  src1_file1_3,
  src1_file1_4,
  src1_file1_5,
  src1_file1_t_1,
  src1_file1_t_2,
  src1_file1_other1: 10,
  src1_file1_other2: [
    5, 7, 9
  ],
}
