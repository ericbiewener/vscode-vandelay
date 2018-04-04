/* eslint-disable */
export default () => {}

export const var1 = 1
export let var2 = 2
export var var3 = 3

export function fn() {

}

export type MyType1 = {}
export type MyType2 = {}

export class Something {}

const varDeclaredEarlier = 4

const varDeclaredEarlierWithSemiColon = 5

export varDeclaredEarlier
export varDeclaredEarlierWithSemiColon;

export * from "./subdir1/file1"
export * from './subdir1/file2'
export { subdir2_file1_var1, subdir2_file1_var2 as subdir2_file1_var2_renamed } from "./subdir2/file1"
export { subdir2_file2_var1 as subdir2_file2_var1_renamed } from './subdir2/file2'
