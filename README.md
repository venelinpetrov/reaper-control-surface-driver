# Maschine driver for REAPER

## How to use

1. In REAPER navigate to `Options->Preferences->Control/OSC/web`
2. Click `Add`
3. Chose `Web browser interface`
4. Click `User pages...`
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

Internally REAPER runs a web server that listens for HTTP requests from the web app (our driver) that you run in the browser.
The app on the other hand intersepts incomming MIDI messages, interprets them based on some logic and send commands to REAPER in form of
HTTP requests, where the URL contains the command(s). REAPER can respond and return messages to the app too. This is useful if you want 
to implement a feedback (e.g. you have some buttons that you want to lid and keep in sync with the DAW).

## How to debug

Since this is a normal web app it can be debugged directly in the browser, it will hit breakpoints and console log messages accordingly.
If you use [Visual Studio Code](https://code.visualstudio.com/) and Chrome you can benefit from 
[this extension](https://code.visualstudio.com/blogs/2016/02/23/introducing-chrome-debugger-for-vs-code) 

## Pros and Cons

### Pros

1. Portable. It's just html and javascript, so it runs on every machine that has browser
2. Support two-way communication between REAPER and the Controller. Useful for feedback scenarios
2. Easy to debug. It's a web app and you can actually debug it in real time in contrast to EEL and Lua solutions
3. No prerequisites. You don't need to install anything on your machine (no extensions, plugins, third-party software etc.)

### Cons

1. In the ideal case, setting up a DAW controller driver should be 1 step process e.g. paste it somewhere. This solution is a 2
step process. One - paste the driver. Two - run web app in browser

2. Since this is a web app you have no way to guarantee that it runs or it doesn't run multiple times in multiple tabs/browsers.
This can bring confusion if you are not careful

Overall the benefits are greater than the drawbacks, but this is the further we can get until REAPER team doesn't invent something else.