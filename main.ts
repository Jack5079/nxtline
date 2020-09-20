#!/usr/bin/env node
import { readFile, readdir, stat } from 'fs/promises'
import { createInterface } from 'readline'
import { join } from 'path'
interface Message {
  content: string
  channel: {
    send: typeof console.log
  }
}
interface CommandObj {
  run (this: Bot, message: Message, args: string[]): Promise<string | void> | string | void
  aliases?: string[]
  help: string
}
interface Bot {
  commands: Map<string, CommandObj>
  aliases: Map<string, string>
  user?: {
    username: string
    avatarURL (): string
  }
}
const bot: Bot = {
  commands: new Map,
  aliases: new Map
}

async function rreaddir (dir: string, allFiles: string[] = []): Promise<string[]> {
  const files = (await readdir(dir)).map((file: string) => join(dir, file))
  allFiles.push(...files)
  await Promise.all(files.map(async (file: string) => ((await stat(file)).isDirectory() && rreaddir(file, allFiles))))
  return allFiles
}

async function main (this: Bot) {
  console.log((await readFile('./logo.txt')).toString())
  const files = await rreaddir('./commands/')
  const entries: [string, CommandObj][] = await Promise.all(
    files // get the file names of every command in the commands folder
      .filter(filename => filename.endsWith('.js')) // only ones with `.js` at the end
      .map(async (file): Promise<[string, CommandObj]> => [
        file.replace('.js', '').replace(/^.*[\\\/]/, ''), // Remove folders from the path and .js, leaving only the command name
        {
          help: 'A command without a description', // this will be overwritten by the real description if it is there
          ...(await import(`./${file}`)), // `run` and `desc`
        }
      ]) // convert filenames to commands
  ) as [string, CommandObj][]
  entries.forEach(([name, command]: [string, CommandObj]) => {
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
    const prefix: string = ''
    const content = message.content || ''
    const name = [...this.commands.keys(), ...this.aliases.keys()].find(
      cmdname =>
        content.startsWith(`${prefix}${cmdname} `) || // matches any command with a space after
        content === `${prefix}${cmdname}` // matches any command without arguments
    )
    // Run the command!
    if (name) {
      const command = this.commands.get(name)?.run // The command if it found it
        || this.commands.get(this.aliases.get(name) || '')?.run // Aliases
        || (() => { }) // Do nothing otherwise

      try {
        const output = await command.call(
          this,
          message as Message, // the message
          // The arguments
          content
            .substring(prefix.length + 1 + name.length) // only the part after the command
            .split(' '), // split with spaces
        )

        if (output) message.channel?.send(output)
      } catch (err) {
        message.channel?.send({
          embed: {
            author: {
              name: `${this.user?.username} ran into an error while running your command!`,
              iconURL: this.user?.avatarURL()
            },
            title: err.toString(),
            color: 'RED',
          }
        })
      }
    }
  }
}

main.call(bot).catch(console.error)
