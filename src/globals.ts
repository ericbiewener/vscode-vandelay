import { ExtensionContext } from 'vscode'

type Context = { (context?: ExtensionContext): ExtensionContext; val?: ExtensionContext }

export const context: Context = (ctx) => {
  if (ctx) context.val = ctx
  return context.val as ExtensionContext
}
