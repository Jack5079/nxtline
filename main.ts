#!/usr/bin/env node
import { readFile, readdir, stat } from 'fs/promises'
import { createInterface } from 'readline'
import { basename, join } from 'path'
import Trollsmile from 'trollsmile-core'
interface Message {
  content: string
  channel: {
    send: typeof console.log
  }
}
interface CommandObj {
  run (this: Trollsmile<Message, CommandObj>, message: Message, args: string[]): Promise<string | void> | string | void
  aliases?: string[]
  help: string
}
class Bot extends Trollsmile<Message, CommandObj> {
  filter () {
    return true
  }
  user = {
    avatarURL () { return '' },
    username: 'trollsmile cli'
  }
}

const bot = new Bot('')

async function rreaddir (dir: string, allFiles: string[] = []): Promise<string[]> {
  const files = (await readdir(dir)).map((file: string) => join(dir, file))
  allFiles.push(...files)
  await Promise.all(files.map(async (file: string) => ((await stat(file)).isDirectory() && rreaddir(file, allFiles))))
  return allFiles
}

async function main (this: Bot) {
  console.log((await readFile('./logo.txt')).toString().trim())
  const files = await rreaddir('./commands/')
  const entries: [string, CommandObj][] = await Promise.all(
    files
      .filter(filename => filename.endsWith('.js')) // only compiled javascript
      .map(async (file): Promise<[string, CommandObj]> => [
        basename(file, '.js'), // the name of a command is the file's name minus extension
        {
          ...(await import(join(process.cwd(), file))),
          path: require.resolve(join(process.cwd(), file))
        }
      ]) // convert filenames to commands
  )

  entries.forEach(([name, command]) => {
    this.commands.set(name, command)
    command.aliases?.forEach(alias => {
      this.aliases.set(alias, name)
    })
  })
  const inter = createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const input = (str: string): Promise<string> => new Promise(resolve => inter.question(str, resolve))
  while (true) {
    const message: Message = {
      content: await input('> '),
      channel: {
        send: console.log
      }
    }
    this.emit('message', message)
  }
}

main.call(bot).catch(console.error)
