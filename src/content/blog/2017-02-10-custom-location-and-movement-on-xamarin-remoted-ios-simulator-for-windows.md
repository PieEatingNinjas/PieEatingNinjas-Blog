---
title: "Custom location and movement on Xamarin Remoted iOS Simulator for Windows"
description: "When I was building a Xamarin PoC at the client, I was disappointed to notice that there wasn't any way of simulating the user's location on the Remoted iOS Simulator for Windows. "
pubDate: "2017-02-10"
legacy: {"id":804,"path":"/2017/02/10/custom-location-and-movement-on-xamarin-remoted-ios-simulator-for-windows/","taxonomySlugs":{"categories":["applescript","automation","xamarin"],"tags":[]}}
categories: ["applescript","automation","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/Auto-GPX-location-updater-iOS-simulator"]
---

When I was building a Xamarin PoC at the client, I was disappointed to notice that there wasn't any way of simulating the user's location on the [Remoted iOS Simulator for Windows](https://developer.xamarin.com/guides/cross-platform/windows/ios-simulator/ "Remoted iOS Simulator for Windows"). Not to mention simulating a walk or bike ride around an area other then the standard rides around Apple's headquarters.

# Setting a custom location

I did notice that setting a custom location was possible on the iOS simulator on OSX.

![Enter Custom Location on Mac](/wp-content/uploads/2017/02/CustomLocation.webp "Enter Custom Location on Mac")

Unfortunately, this does not exist on the remoted simulator. However, soon I discovered that when I'd open up the same simulator on iOS and Windows, changing the location on my Mac would also change the position on my Remoted Simulator on Windows. In order to do this, you need to start a particular iOS simulator on Windows, let's say iPhone 6 - iOS 10.2. Once it is booted up, go to your Mac, cmd+space and type "Simulator". Then in the Menu bar go to 'Hardware', 'Device' and select the same simulator as the one that is running on your Windows machine. If everything goes well, you should get an error message saying something like the device is already booted.

![Unable to boot device errr message](/wp-content/uploads/2017/02/errormsg.png "Unable to boot device errr message")

Close the error message and in your Menu bar go to 'Debug', 'Location' and select 'Custom Location...'. Enter any coordinates in the window, click 'OK' and you should see the position on your simulator on Windows update as well. The easiest way to check this is by opening the Maps app in your simulator on Windows, or in your own app ofcourse :-).

# Now, take another step and move forward...

That already helped me a lot! Now I didn't need to mock all my data around Cupertino anymore. But what if I want to simulate a walk or bike ride around Brussels for example, instead of being at one fixed location? Simple! Just do whatever I just described and change your location every 2 seconds... :-) This idea may sound stupid, but it is exactly what I'm going to do! So, as a complete OSX n00b, I looked into things like automation tools and stuff and so I stumbled upon _AppleScript_. Yes, that sounds as scary as it is! With this _AppleScript_, you can basically script everything on you Mac, in a programming language that you might call awkward at least... Especially for a 'true' developer. I played around with it for a bit and in no time, after some trail and error, I was able to open up the 'Enter Location ' popup window and programmatically set a Longitude and Latitude. You can run this script in the Script Editor tool on your Mac if you want, but make sure the Simulator is already running!

**Open Custom Location window through AppleScript**

```applescript
on run
    tell application "System Events"
        tell process "Simulator"
            set frontmost to true
            click menu item "Custom Location…" of menu of menu item "Location" of menu "Debug" of menu bar 1
            set popup to window "Custom Location"
            set value of text field 1 of popup to "51,051801"
            set value of text field 2 of popup to "4,454144"
            --> click button "OK" of popup
        end tell
    end tell
end run
```

The only thing left to do, is repeat this process and update the Longitude and Latitude each time. I found out that reading XML files with _AppleScript_ is quite simple, so I went to [https://gpxgenerator.com/](https://gpxgenerator.com/). On this website, you can put waypoints on a map and generate a _GPX_ file, which is just a simple XML file representing the route you outlined. Although, in the generated _GPX_ file there is an indication about how long it take to get from one waypoint to the next, I'm going to ignore this for now and simply say in my script that there is a certain fixed amount of time between each waypoint.

**Sample GPX file**

```xml
<?xml version="1.0"?>
<gpx version="1.1" creator="gpxgenerator.com">
<wpt lat="50.84633694747007" lon="4.364619255065918">
    <time>2017-02-10T10:48:50Z</time>
</wpt>
<wpt lat="50.845889847299254" lon="4.36431884765625">
    <time>2017-02-10T10:49:28Z</time>
</wpt>
<wpt lat="50.84507692692001" lon="4.363868236541748">
    <time>2017-02-10T10:50:36Z</time>
</wpt>
<wpt lat="50.84460271682405" lon="4.363675117492676">
    <time>2017-02-10T10:51:14Z</time>
</wpt>
<wpt lat="50.84374912650492" lon="4.363245964050293">
    <time>2017-02-10T10:52:25Z</time>
</wpt>
<wpt lat="50.84296326764228" lon="4.36281681060791">
    <time>2017-02-10T10:53:31Z</time>
</wpt>
<wpt lat="50.84281578200512" lon="4.36181902885437">
    <time>2017-02-10T10:54:22Z</time>
</wpt>
<wpt lat="50.84310709422066" lon="4.360542297363281">
    <time>2017-02-10T10:55:30Z</time>
</wpt>
<wpt lat="50.84268028733167" lon="4.359984397888184">
    <time>2017-02-10T10:56:13Z</time>
</wpt>
<wpt lat="50.84245672026023" lon="4.359222650527954">
    <time>2017-02-10T10:56:55Z</time>
</wpt>
<wpt lat="50.843019023277556" lon="4.35808539390564">
    <time>2017-02-10T10:58:07Z</time>
</wpt>
<wpt lat="50.84339840461739" lon="4.357527494430542">
    <time>2017-02-10T10:58:48Z</time>
</wpt>
<wpt lat="50.84356777029096" lon="4.357130527496338">
    <time>2017-02-10T10:59:12Z</time>
</wpt>
<wpt lat="50.844069089081536" lon="4.356368780136108">
    <time>2017-02-10T11:00:07Z</time>
</wpt>
<wpt lat="50.84437550047113" lon="4.3559181690216064">
    <time>2017-02-10T11:00:40Z</time>
</wpt>
<wpt lat="50.84555269015878" lon="4.354877471923828">
    <time>2017-02-10T11:02:27Z</time>
</wpt>
<wpt lat="50.84620302096338" lon="4.354770183563232">
    <time>2017-02-10T11:03:18Z</time>
</wpt>
<wpt lat="50.8467178597545" lon="4.354383945465088">
    <time>2017-02-10T11:04:03Z</time>
</wpt>
<wpt lat="50.84665428412764" lon="4.3536436557769775">
    <time>2017-02-10T11:04:40Z</time>
</wpt>
<wpt lat="50.84662380036855" lon="4.353042840957642">
    <time>2017-02-10T11:05:10Z</time>
</wpt>
<wpt lat="50.846430736098434" lon="4.3524473905563354">
    <time>2017-02-10T11:05:43Z</time>
</wpt>
<wpt lat="50.846213961280625" lon="4.351991415023804">
    <time>2017-02-10T11:06:11Z</time>
</wpt>
<wpt lat="50.84603783095749" lon="4.3516212701797485">
    <time>2017-02-10T11:06:34Z</time>
</wpt>
<wpt lat="50.845837989977895" lon="4.351256489753723">
    <time>2017-02-10T11:06:58Z</time>
</wpt>
<wpt lat="50.84563476098514" lon="4.350859522819519">
    <time>2017-02-10T11:07:23Z</time>
</wpt>
<wpt lat="50.84547556432245" lon="4.350618124008179">
    <time>2017-02-10T11:07:40Z</time>
</wpt>
<wpt lat="50.84531975429677" lon="4.350387454032898">
    <time>2017-02-10T11:07:56Z</time>
</wpt>
<wpt lat="50.845167330942075" lon="4.350119233131409">
    <time>2017-02-10T11:08:14Z</time>
</wpt>
<wpt lat="50.84499536286211" lon="4.3499743938446045">
    <time>2017-02-10T11:08:29Z</time>
</wpt>
</gpx>
```

Now I only have to read this XML file, loop over the elements and read the Longitude and Latitude of each one, enter these values in my 'Enter Location' popup window, wait a couple of seconds and continue my loop. Simple right? And this is what my final script looks likes. It takes 2 command line parameters: the location of the GPX file and the timeout between each iteration.

```applescript
--> function to replace a particular char in a string with an other one
on replace_chars(this_text, search_string, replacement_string)
    set AppleScript's text item delimiters to the search_string
    set the item_list to every text item of this_text
    set AppleScript's text item delimiters to the replacement_string
    set this_text to the item_list as string
    set AppleScript's text item delimiters to ""
    return this_text
end replace_chars

on run arg
--> arg is a collection of the command line parameters
    
    set xmlPathParam to item 1 of arg --> first param is the location of the gpx file
    set sleepParam to item 2 of arg --> second param is the time (seconds) to sleep between each iteration

    tell application "System Events"
        tell XML file xmlPathParam
            tell XML element "gpx"
                set wptElements to every XML element whose name = "wpt" -->put wpt elements in a collection for later use
            end tell
    end tell
    
    tell process "Simulator"
        set frontmost to true
            repeat with c from 1 to count of wptElements
                set wptElement to item c of wptElements
                tell wptElement
                    set lon to value of XML attribute "lon" of wptElement --> putting the lon value of the wpt element in a variable for later use
                    set lat to value of XML attribute "lat" of wptElement --> putting the lan value of the wpt element in a variable for later use
                end tell
                    
                click menu item "Custom Location…" of menu of menu item "Location" of menu "Debug" of menu bar 1
                set popup to window "Custom Location"
                set value of text field 1 of popup to my replace_chars(lat, ".", ",")
                set value of text field 2 of popup to my replace_chars(lon, ".", ",")
                click button "OK" of popup
                    
                delay sleepParam --> sleep to simulate 'natural' movement
            end repeat
        end tell
    end tell
end run
```

You can now easily call this script as follows in the terminal on your Mac: `osascript` _\[path to you script\] \[path to your gpx xml file\] \[time to sleep between each iteration\]_ ![Launch script from terminal](/wp-content/uploads/2017/02/script-terminal.png "Launch script from terminal")

Simulator in action:

 [![Location updated op Remoted iOS Simulator](/wp-content/uploads/2017/02/LocationSimulator.webp)](/wp-content/uploads/2017/02/LocationSimulator.webp)

Done! Simple but effective imho! :-)

I'm putting this code on [GitHub](https://github.com/PieEatingNinjas/Auto-GPX-location-updater-iOS-simulator "Auto-GPX-location-updater-iOS-simulator"), so if you have any other ideas on how to improve the script or its functionality, just do a PR!

Have fun!
