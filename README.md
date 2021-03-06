# Example driver for REAPER

## Disclaimer

This repo focuses on the approach, not the driver so much. Because every MIDI Controller is different and every person has different 
workflow you should implement your own driver that works for you.

## Demo

https://www.youtube.com/watch?v=5M-RpgTE8zw

## How to use

1. In REAPER navigate to `Options->Preferences->Control/OSC/web`
2. Click `Add`
3. Choose `Web browser interface`
4. Click `User pages...` (or `Built-in pages`, doesn't matter)
5. A window will popup. Clone the repo or download a zip and extract it there
6. Choose the driver from the list that says `Default interfaces`
7. Copy-paste the Access URL in a browser

![untitled](https://user-images.githubusercontent.com/3126733/50609072-5185ee00-0ed7-11e9-8fbb-d74e979a3410.png)

Make sure that your controller is configured to send control messages and also its output mode is enabled. Note that this is not specific
to this implementation, that's always required.

![image](https://user-images.githubusercontent.com/3126733/50609231-bf321a00-0ed7-11e9-9d2c-e1e896aad763.png)

## How it works

REAPER has that feature that you can control it remotely from any device in the local network.
Please check [this video](https://youtu.be/CkMAj8CpvIU) out.

Internally REAPER runs a web server that listens for HTTP requests from a web app that you run in the browser. In the video above you can see that Kenny
runs a GUI app and controls REAPER in realtime. He also receives feedback from the DAW like time, metronome, track mute/solo/arm/pan/vol params etc.
I thought that I can exploit this by only removing the GUI and reading the incoming MIDI messages. And it worked.

In principle, the app intercepts incomming MIDI messages, interprets them based on some logic and send commands to REAPER in form of
HTTP requests, where the URL contains the command(s). REAPER can respond and return messages to the app too. This is useful if you want
to implement a feedback (e.g. you have some buttons that you want to light up and keep in sync with the DAW).

**Note:** Just to make it clear, you don't actually need internet access to use this driver, it's an app on localhost.

MIDI CC Layout

![image](https://user-images.githubusercontent.com/3126733/50611921-de817500-0ee0-11e9-8916-f65bf7f9c52a.png)

Most of the explanations of the APIs are in the `main.js` file inside `Built-in pages...`. Also, there are a lot of comments in the driver's code, please check them out.

## How to debug

Since this is a normal web app it can be debugged directly in the browser, it will hit breakpoints and console log messages accordingly.
If you use [Visual Studio Code](https://code.visualstudio.com/) and Chrome you can benefit from
[this extension](https://code.visualstudio.com/blogs/2016/02/23/introducing-chrome-debugger-for-vs-code). Install the extension, put a breakpoint and hit F5.

![image](https://user-images.githubusercontent.com/3126733/50612097-839c4d80-0ee1-11e9-90c5-7dd54fb970ce.png)

**NOTE**: Make sure that you are not running multiple instances of the web app! If you do, then REAPER will receive multiple messages and will not work as you wish.

## Pros and Cons

### Pros

1. Portable. It's just html and javascript, so it runs on every machine that has browser
2. Supports two-way communication between REAPER and the Controller. Useful for feedback scenarios and keeping in sync with the DAW
2. Debuggable. It's a web app and you can actually debug it in contrast to EEL and Lua solutions
3. No prerequisites. You don't need to install anything on your machine (no extensions, plugins, third-party software etc.)

### Cons

1. In the ideal case, setting up a DAW controller driver should be 1 step process e.g. paste it somewhere. This solution is a 2
step process. One - paste the driver. Two - run web app in browser

2. Since this is a web app you have no way to guarantee that it runs or it doesn't run multiple times in multiple tabs/browsers.
This can bring confusion if you are not careful.

Overall the benefits are greater than the drawbacks, but this is the further we can get until REAPER team doesn't invent something else.

## Start the driver from REAPER

To make things more convenient you can create a custom action that starts the web app on `http://localhost:8080` with a click of a button.

1. Go to `Actions` menu and click `Show action list...`
2. Click `New...` ReaScript action
3. A window will popup
4. Create a file (e.g. `run_midi_driver.lua`) and paste the following code

```lua
-- Change the port if you need
url = "http://localhost:8080"

function open_url(url)
  local OS = reaper.GetOS()
  if OS == "OSX32" or OS == "OSX64" then
    os.execute('open "" "' .. url .. '"')
  else
    os.execute('start "" "' .. url .. '"')
  end
end

open_url(url)
```

5. Now you can add a custom button in your toolbar that will execute the script

![image](https://user-images.githubusercontent.com/3126733/50728047-d3228980-112c-11e9-86ea-e1ec2bdfa75a.png)


## Automatically start the driver whenever REAPER starts

REAPER allows you to run scripts on startup. This is done by creating a new file in (Windows) `%appdata%\reaper\Scripts` called `__startup.lua`. Then paste the script from above in this file and you are good to go.

**NOTE 1:** Closing REAPER doesn't close the browser tabs that this script opens  
**NOTE 2:** It's best practice to actually create a separate file for the script and then import (require) it from `__startup.lua`. This makes things cleaner if you have more startup scripts

## Contribute

Please open an issue if you like to discuss something or create a PR. You are very welcome to do so.
