---
title: "Creating a 'Continue Watching' experience using Project Rome in UWP"
description: "Since the Anniversary update, we got this new RemoteSystem class in UWP, which is part of Project Rome. With this api we can discover and interact with other computers. One of my f"
pubDate: "2017-08-13"
legacy: {"id":953,"path":"/2017/08/13/creating-a-continue-watching-experience-using-project-rome-in-uwp/","taxonomySlugs":{"categories":["c","uwp"],"tags":[]}}
categories: ["C#","uwp"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/StreamingAppWithContinueWatching"]
---

Since the Anniversary update, we got this new `RemoteSystem` class in UWP, which is part of Project Rome. With this api we can discover and interact with other computers.

One of my first ideas I had when I heart about Project Rome, was creating a 'Continue Watching on other device' experience. Image you are streaming on your mobile phone, you come home where you have your Windows 10 laptop or Xbox One and from within the app on your mobile phone you can select 'continue on Xbox'. The app opens on your Xbox and starts streaming your asset right where you left off.

With the RemoteSystem-class this is a feature which is super easy to implement, and might give users a real 'wow'-experience.

The first part of this post will give some additional information about the app itself and using url protocol activation. If you are already familiar with this, or you are only interested in the 'new' stuff, you might want to skip this and go straight ahead to 'Using RemoteSystem'.

# A simple video streaming app

First, we need a simple video streaming app. I'm not going into too much detail here. The app just shows a list of assets the user can stream and of course also a player that streams the chosen asset. For this app I've used the _Microsoft Player Framework_, the _Adaptive Streaming Plugin_ and _Smooth Streaming_. The assets in this app, are smooth streaming assets which are publicly available for testing purposes (people who have built streaming apps, will certainly recognize them :-) ) . We are keeping it simple here, so no DRM is used in this demo. **Note:** if you want to try out this demo yourself, make sure you have installed the following extensions in Visual Studio: _'Microsoft Player Framework'_ and _'Microsoft Universal Smooth Streaming Client SD_K'.

The UI of our app is nothing really special, just a ListView that displays the assets we can stream and the player itself:

**MainPage**

```xml
<Page
    x:Class="RemotingContinueWatching.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:local="using:RemotingContinueWatching"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:mmpf="using:Microsoft.PlayerFramework"
    xmlns:adaptive="using:Microsoft.PlayerFramework.Adaptive"
    mc:Ignorable="d">
    <Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
        <SplitView
            IsPaneOpen="True"
            DisplayMode="CompactInline"
            OpenPaneLength="240">
            <SplitView.Pane>
                <Grid>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="*" />
                        <RowDefinition Height="Auto" />
                    </Grid.RowDefinitions>
                    <ListView
                    ItemsSource="{Binding Videos}" 
                    DisplayMemberPath="DisplayName" 
                    SelectedItem="{Binding SelectedVideo, Mode=TwoWay}"/>
               </Grid>
            </SplitView.Pane>
            <SplitView.Content>
                <Grid>
                    <mmpf:MediaPlayer 
                        x:Name="Player"
                        AutoPlay="True"
                        StartupPosition="{x:Bind ViewModel.StartPosition, Mode=OneWay}"
                        Position="{x:Bind ViewModel.CurrentPosition, Mode=TwoWay}"
                        Source="{x:Bind ViewModel.Source, Mode=OneWay}">
                        <mmpf:MediaPlayer.Plugins>
                            <adaptive:AdaptivePlugin />
                        </mmpf:MediaPlayer.Plugins>
                    </mmpf:MediaPlayer>
                </Grid>
            </SplitView.Content>
        </SplitView>
    </Grid>
</Page>
```

And this is what the ViewModel looks like:

**MainPageViewModel**

```csharp
public class MainPageViewModel : INotifyPropertyChanged
{
    public List<StreamViewModel> Videos => new List<StreamViewModel>
    {
        new StreamViewModel
        {
            DisplayName = "Big Buck Bunny",
            Name = "bigbugbunny",
            Source = new Uri("http://amssamples.streaming.mediaservices.windows.net/683f7e47-bd83-4427-b0a3-26a6c4547782/BigBuckBunny.ism/manifest")
        },
        new StreamViewModel
        {
            DisplayName = "To The Limit",
            Name = "tothelimit",
            Source = new Uri("http://playready.directtaps.net/smoothstreaming/TTLSS720VC1/To_The_Limit_720.ism/Manifest")
        },
        new StreamViewModel
        {
            DisplayName = "Super Speedway",
            Name = "superspeedway",
            Source = new Uri("http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest")

        }
    };

    private StreamViewModel _SelectedVideo;

    public StreamViewModel SelectedVideo
    {
        get
        {
            return _SelectedVideo;
        }
        set
        {
            StartPosition = null;
            _SelectedVideo = value;
            Source = value?.Source;
            OnPropertyChanged();
        }
    }


    private TimeSpan? _StartPosition;

    public TimeSpan? StartPosition
    {
        get { return _StartPosition;; }
        set
        {
            _StartPosition = value;
            OnPropertyChanged();
        }
    }

    public TimeSpan CurrentPosition { get; set; }

    private Uri _Source;

    public Uri Source
    {
        get { return _Source; }
        set
        {
            _Source = value;
            OnPropertyChanged();
        }
    }

    public void Init(Uri uri)
    { 
        Dictionary<string, string> parameters = new Dictionary<string, string>();

        try
        {
            //naive uri parsing :-)
            //good enough for demo-purposes
            parameters = uri.Query.Trim('?').Split('&').Select(s => s.Split('=')).ToDictionary(k => k[0], v => v[1]);
        }
        catch (Exception)
        {
            //
        }

        string video = parameters["video"];
        TimeSpan? startPosition = null;
        if(parameters.ContainsKey("position"))
        {
            if (int.TryParse(parameters["position"], out int p))
            {
                //subtract 3 seconds from the starttime so the user doesn't miss anything
                startPosition = TimeSpan.FromSeconds(Math.Max(0, p - 3));
            }
        }
        Load(video, startPosition);
    }

    private void Load(string name, TimeSpan? startPosition = null)
    {
        SelectedVideo = Videos.FirstOrDefault(v => v.Name == name);
        StartPosition = startPosition;
    }

    public void OnPropertyChanged([CallerMemberName] string property = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

The properties _Source_, _CurrentPosition_ and _StartPosition_ are bound to the _Player_. Because the _AutoPlay_ property on the _Player_ control is set to _True_, the player will automatically start to stream whenever the _Source_ property changes. The _SelectedVideo_ property is bound to the _SelectedItem_ property on the _ListView_. So whenever a user selects an item in the _ListView_, the _SelectedVideo_ property on the _ViewModel_ will be set and the _Source_ property on the _ViewModel_ will be set to the source of the selected video.

Let's discuss the _Init_ method in few seconds.

# URL Protocol : Protocol activation

In the manifest file of our UWP app, we are going to add a Protocol declaration. With a protocol declaration, we can associate a particular protocol (url) with our app. In this demo I'm naming it 'myvideoapp'.

[![protocol declaration](/wp-content/uploads/2017/08/protocol-declaration.jpg)](/wp-content/uploads/2017/08/protocol-declaration.jpg)

This means that we, or any other app, can start our video streaming app by calling this protocol. The simplest way to see this in action is by going to Edge and type the protocol in your navigation bar: myvideoapp:// . Our UWP will start once we press enter. As this protocol is just a URL, we can pass in additional parameters if we want. In order to make this work, we also must override the _OnActivated_ method in our _App_ class. This is the method that will get called whenever the app is being activated through the URL protocol. In our case, we are going to do more or less the same as in the _OnLaunched_ method, but at the end, we are calling the _Init_ method on our _ViewModel_, passing in the Url that was used to active our app:

**OnActivated**

```csharp
protected override void OnActivated(IActivatedEventArgs args)
{
    if (args.Kind == ActivationKind.Protocol)
    {
        ProtocolActivatedEventArgs eventArgs = args as ProtocolActivatedEventArgs;

        Frame rootFrame = Window.Current.Content as Frame;

        if (rootFrame == null)
        {
            // Create a Frame to act as the navigation context and navigate to the first page
            rootFrame = new Frame();

            rootFrame.NavigationFailed += OnNavigationFailed;

            // Place the frame in the current Window
            Window.Current.Content = rootFrame;
        }

        if (rootFrame.Content == null)
        {
            rootFrame.Navigate(typeof(MainPage), null);
        }
        // Ensure the current window is active
        Window.Current.Activate();
        (rootFrame.Content as MainPage).ViewModel.Init(eventArgs.Uri);
    }
}
```

In the _Init_ method, we can now parse this url and load the view accordingly. The signature of the url in our app can have one or two parameters: video (which points to the video we want to starts streaming) and position (which indicates in seconds at what position we want to start streaming our asset).

**Init**

```csharp
public void Init(Uri uri)
{ 
    Dictionary<string, string> parameters = new Dictionary<string, string>();

    try
    {
        //naive uri parsing :-)
        //good enough for demo-purposes
        parameters = uri.Query.Trim('?').Split('&')
            .Select(s => s.Split('=')).ToDictionary(k => k[0], v => v[1]);
    }
    catch (Exception)
    {
        //
    }

    string video = parameters["video"];
    TimeSpan? startPosition = null;
    if(parameters.ContainsKey("position"))
    {
        if (int.TryParse(parameters["position"], out int p))
        {
            //subtract 3 seconds from the starttime so the user doesn't miss anything
            startPosition = TimeSpan.FromSeconds(Math.Max(0, p - 3));
        }
    }
    Load(video, startPosition);
}
```

Once this is all in place, we could start our app by just going to Edge and type the following in the navigation bar: _myvideoapp://?video=bigbugbunny&position=200_ . The app should launch and start Big Bug Bunny at position 200 (seconds from the start).

And this was actually the 'hard' part. And there is nothing 'new' in here: protocol activation already exists since Windows 8.

Now, we are going to take it one small step further...

# Using RemoteSystem

This is the 'new' part. At this moment we can launch our app by using a url. The next thing we would like to do, is trigger this url on a particular device (for example your mobile phone) and start the app on an other device (for example your pc) passing in the asset that needs to start playing and at what position it should start.

We can use the static _CreateWatcher_ method on the _RemoteSystem_ class in order to create a watcher. This watcher will fire up events whenever it finds a remote system we can connect to. It also fires updated and removed events to indicate if an already known system is updated or removed. But before we do that, we must make sure we are allowed to create such a watcher. This can be done by calling the _RequestAccessAsync_ method on the _RemoteSystem_ class. If we would, for example, forget to specify the _'Remote System'_ Capability in the app's manifest, this method will return _RemoteSystemAccessStatus.DeniedBySystem_.

**StartWatcherAsync**

```csharp
public MainPageViewModel()
{
    StartWatcherAsync();
}

private async Task StartWatcherAsync()
{
    RemoteSystemAccessStatus accessStatus = await RemoteSystem.RequestAccessAsync();
    if (accessStatus == RemoteSystemAccessStatus.Allowed)
    {
        remoteSystemWatcher = RemoteSystem.CreateWatcher();

        remoteSystemWatcher.RemoteSystemAdded += RemoteSystemWatcher_RemoteSystemAdded;
        remoteSystemWatcher.RemoteSystemRemoved += RemoteSystemWatcher_RemoteSystemRemoved;
        remoteSystemWatcher.RemoteSystemUpdated += RemoteSystemWatcher_RemoteSystemUpdated;

        remoteSystemWatcher.Start();
    }
    else
    {
        Debug.WriteLine("Access to Remote Systems is " + accessStatus.ToString());
        Debug.WriteLine("Make sure you have set the Remote System capability");
    }
}
```

On my _ViewModel_ I'm going to keep a list of _RemoteSystems_. This list will be bound to a _Combox_ which the user can use to select the device on which he/she want to continue watching.

**Continue watching**

```xml
<StackPanel Grid.Row="1" Margin="0, 0, 0, 10">
    <TextBlock Text="Continue watching on: "/>
    <ComboBox ItemsSource="{Binding RemoteSystems}"  
              HorizontalAlignment="Stretch" Margin="5"
              SelectedItem="{Binding SelectedSystem, Mode=TwoWay}"
              DisplayMemberPath="DisplayName"/>
    <Button Content="GO" 
        Click="{x:Bind ViewModel.OnContinueWatching}"
        HorizontalAlignment="Center" />
</StackPanel>
```

Finally, we only need to add a button on my screen that the user can click on in order to continue watching the asset on the chosen device. In the _OnContinueWatching_ method that is bound to the click event of this button, we just need to call the static _LaunchUriAsync_ method on the _RemoteLauncher_ class, passing in the _RemoteSystem_ on which we want to launch the url, as well as our protocol url:

**RemoteSystemWatcher eventhandlers**

```csharp
private async void RemoteSystemWatcher_RemoteSystemUpdated(RemoteSystemWatcher sender, 
    RemoteSystemUpdatedEventArgs args)
{
    await CoreApplication.MainView.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
    {
        int index = RemoteSystems.IndexOf(RemoteSystems.FirstOrDefault(
            rs => rs.Id == args.RemoteSystem.Id));
        if (index > -1)
            RemoteSystems[index] = args.RemoteSystem;
    });

}

private async void RemoteSystemWatcher_RemoteSystemRemoved(RemoteSystemWatcher sender, 
    RemoteSystemRemovedEventArgs args)
{
    await CoreApplication.MainView.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
    {
        RemoteSystems.Remove(RemoteSystems.FirstOrDefault(rs => rs.Id == args.RemoteSystemId));
    });
}

private async void RemoteSystemWatcher_RemoteSystemAdded(RemoteSystemWatcher sender, 
    RemoteSystemAddedEventArgs args)
{
    await CoreApplication.MainView.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
    {
        RemoteSystems.Add(args.RemoteSystem);
    });
}
```

And that's really all it takes to do this kind of 'magic'. Easy, isn't it? And this is just one simple example of what you could do with these _RemoteSystems_. Hope this post could inspire you to also do something creative with it!

You can find this example on my [GitHub](https://github.com/PieEatingNinjas/StreamingAppWithContinueWatching "github").

Links

[Project Rome](https://developer.microsoft.com/en-us/windows/project-rome "Project Rome")

[Remote Systems sample UWP](https://github.com/Microsoft/Windows-universal-samples/tree/master/Samples/RemoteSystems "Remote Systems sample UWP")
