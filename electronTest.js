import pkg from "electron";
const { app, BrowserWindow,screen} = pkg;
import {activeWindow} from 'get-windows';

//console.log(await activeWindow());

let win;

function createWindow() {
  const {width,height} = screen.getPrimaryDisplay().workAreaSize; 
  console.log(width,height)
  const winWidth = 200;
  const winHeight = 80;

  win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x:320, // position near right edge
    y:530, // position near bottom
    transparent: true,
    frame: false,  // borderless
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
  win.setIgnoreMouseEvents(true, { forward: true });
  setInterval(checkActiveWindow, 500);
}
async function checkActiveWindow() {
  const window = await activeWindow();
  if (!window) return;

  // Check if the active window is osu!
  if (window.owner && window.owner.name.toLowerCase().includes("osu")) {
    if (!win.isVisible()) win.show();
  } else {
    if (win.isVisible()) win.hide();
  }
}
app.whenReady().then(createWindow);



