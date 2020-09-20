export const desc = 'Close nxt.'

export function run (): string {
  setTimeout(process.exit)
  return 'Goodbye!'  
}
export const aliases = ['stop', 'close']
