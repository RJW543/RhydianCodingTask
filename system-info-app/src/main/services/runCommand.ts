// every platform service needs it, and tests replace this one function with a fake to feed in canned output

import { execFile } from 'node:child_process' //This module provides the ability to spawn child processes in a manner that is similar, but more powerful than, popen(). The execFile() function is used to run a file with the specified arguments and options. It returns a ChildProcess object that can be used to interact with the spawned process.
import { promisify } from 'node:util' // This module provides utility functions that are useful for working with Node.js. The promisify() function is used to convert a callback-based function to a promise-based function, allowing for easier use of async/await syntax.

const execFileAsync = promisify(execFile) // converts old callback style to promises which means I can use async/await syntax instead of callbacks, making the code cleaner and easier to read.

export async function runCommand(file: string, args: string[]): Promise<string> {
  //This function runs a command in a child process and returns the output as a string. It takes two parameters: file, which is the path to the executable file to run, and args, which is an array of strings representing the arguments to pass to the command. The function returns a Promise that resolves with the standard output of the command as a string.
  const { stdout } = await execFileAsync(file, args, { maxBuffer: 10 * 1024 * 1024 }) // This line runs the command using execFileAsync and waits for it to complete. It destructures the stdout property from the result, which contains the standard output of the command. The maxBuffer option is set to 10 MB to allow for larger output.
  return stdout // This line returns the standard output of the command as a string.
}
