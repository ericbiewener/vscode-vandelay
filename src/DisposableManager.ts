import { Disposable } from 'vscode'

export enum DisposableKey {
  PROVIDE_COMPLETIONS
}

const disposables: { [K in DisposableKey]?: Disposable[] } = {}

export const DisposableManager = {
  add(key: DisposableKey, disposable: Disposable) {
    const arr = disposables[key] || []
    disposables[key] = arr
    arr.push(disposable)
  },

  dispose(key: DisposableKey) {
    const arr = disposables[key]
    if (arr) {
      for (const disposable of arr) disposable.dispose()
    }
  }
}
