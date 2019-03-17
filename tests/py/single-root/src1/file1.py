import full_package1
from package3 import package3_file1_1, package3_file1_2, package3_file1_3
from package4 import (package4_file1_1, package4_file1_2,
package4_file1_3)
from package5 import (
  package5_file1_1,
  package5_file1_2,
  package5_file1_3,
)
import full_package2
 
from group1a.subdir_1 import group1a_1
from group1b.subdir_1 import group1b_1
from group1a.subdir_2 import group1a_2

from group2a.subdir_1 import group2a_1
from group2b.subdir_1 import group2b_1
from group2a.subdir_2 import group2a_2

from src1.file1 import src1_file1_1
from src2.file1 import src2_file1_1
from src1.file2 import src1_file2_1

def fn_file1_1():
  pass

def fn_file1_2():
  pass

def _private_fn():
  pass

class Class_file1_1():
  pass

class Class_file1_2():
  pass

CONSTANT_FILE1_1 = 1
CONSTANT_FILE1_2 = 2

non_constant = 3
