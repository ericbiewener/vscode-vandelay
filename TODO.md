### Fix Imports
- Import undefined variables part doesn't always work. Perhaps because the range specified by the diagnostic no longer applies to the correct range following the initial removal of unused imports? Solution could be to first get the name of the undefined variable, remove unused imports, then import the undefined variable.
