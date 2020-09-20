export const desc = 'Close nxt.'

export function run () {
  setTimeout(process.exit)
  return 'Goodbye!'  
}
export const aliases = ['stop', 'close']
