import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Runs an external command and returns its stdout.
 *
 * execFile (rather than exec) runs the binary directly with no shell in
 * between, avoiding quoting and injection issues. Kept as its own module so
 * tests can mock this single function and feed the parsers canned output.
 * maxBuffer is raised because a full process list can exceed the 1 MB default.
 */
export async function runCommand(file: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(file, args, { maxBuffer: 10 * 1024 * 1024 })
  return stdout
}
