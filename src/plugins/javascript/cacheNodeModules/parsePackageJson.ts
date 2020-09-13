import fs from 'fs-extra'
import path from 'path'

export const parsePackageJson = async (
  projectRoot: string,
  depName: string
): Promise<{ main?: string } | undefined> => {
  const dir = path.join(projectRoot, 'node_modules', depName)
  const packageJsonPath = path.join(dir, 'package.json')

  try {
    const fileText = await fs.readFile(packageJsonPath, 'utf8')
    return JSON.parse(fileText)
  } catch (e) {
    console.info(`Vandelay: Failed to parse dependency package.json file: ${depName}`)
  }
}
