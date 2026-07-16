import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { createSystemInfoService } from './services/SystemInfoServiceFactory'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  void smokeTestServices() // TEMP: remove together with the block below

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// --- TEMP smoke test: delete this whole block (and the call above) before snapshotting ---
async function smokeTestServices(): Promise<void> {
  const service = createSystemInfoService()

  console.log('--- OS info ---')
  console.log(await service.getOsInfo())

  console.log('--- Memory ---')
  const mem = await service.getMemoryInfo()
  const gb = (n: number): string => (n / 1024 ** 3).toFixed(1) + ' GB'
  console.log(mem)
  console.log(`readable: ${gb(mem.usedBytes)} of ${gb(mem.totalBytes)} (${mem.usedPercentage}%)`)

  console.log('--- Disks ---')
  console.log(await service.getDiskInfo())

  console.log('--- Processes ---')
  const procs = await service.getProcesses()
  console.log(`count: ${procs.length}`)
  console.log(
    'top 5 by CPU:',
    [...procs].sort((a, b) => b.cpuPercentage - a.cpuPercentage).slice(0, 5)
  )

  console.log('--- Factory: unsupported platform ---')
  try {
    createSystemInfoService('darwin')
    console.log('PROBLEM: factory should have thrown for darwin')
  } catch (err) {
    console.log('OK, threw:', (err as Error).message)
  }
}
// --- end TEMP ---
